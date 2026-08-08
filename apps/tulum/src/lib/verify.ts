// ============================================================
// src/lib/verify.ts — Verify OG client flow (FROZEN-SNAPSHOT backend)
//
// The browser never asserts holdings. It:
//   1. POST worker /nonce  -> { nonce, message }  (message composed server-side)
//   2. sign `message` with the chain's native signMessage:
//        NEAR   -> NEP-413 wallet.signMessage({ message, recipient, nonce: Buffer(32) })
//        EVM    -> EIP-191 personal_sign via wagmi (one sig; server checks OP + BSC)
//        Solana -> ed25519 wallet.signMessage(bytes)
//   3. POST worker /claim  -> the worker verifies the signature and resolves it
//      against the FROZEN holder sets, granting credentials + XP.
// A signed claim proves you WERE in a past block — not that you hold now.
// ============================================================
import { Buffer } from "buffer";
import { supabase } from "./supabase";
import { signMessage as wagmiSignMessage } from "@wagmi/core";
import type { Config } from "wagmi";
import type { Wallet as NearWallet } from "@near-wallet-selector/core";

// The verify worker. Defaults to the test deployment; override per environment.
const WORKER_URL = (
  process.env.NEXT_PUBLIC_VERIFY_WORKER_URL ??
  "https://tulum-verify-worker-test.cryptocoatl101.workers.dev"
).replace(/\/$/, "");

export const NEP413_RECIPIENT = "tulum.flowme.one";

export type Chain = "near" | "evm" | "solana";

export interface Profile {
  fbid: string;
  credentials: string[]; // e.g. ["OG_JAGUAR","XELVA_HOLDER"]
  total_xp: number;
  wallets: Array<{ chain: string; address: string }>;
}

export interface ClaimResult {
  ok: boolean;
  granted?: Array<{ credential: string; xp: number }>; // newly granted this claim
  profile?: Profile;                                    // full cumulative profile
  error?: string;
}

async function authHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("FBID session required — sign in first");
  return `Bearer ${session.access_token}`;
}

// 1) ask the worker for a single-use nonce + the exact message to sign
async function issueNonce(chain: Chain): Promise<{ nonce: string; message: string }> {
  const r = await fetch(`${WORKER_URL}/nonce`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: await authHeader() },
    body: JSON.stringify({ chain }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error ?? `nonce request failed (${r.status})`);
  return { nonce: data.nonce, message: data.message };
}

// 3) submit the verified claim; the worker returns granted credentials + profile
async function claim(body: Record<string, unknown>): Promise<ClaimResult> {
  const r = await fetch(`${WORKER_URL}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: await authHeader() },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: data?.error ?? `claim failed (${r.status})` };
  return { ok: true, granted: data.granted ?? [], profile: data.profile };
}

/** Fetch the current cumulative profile (credentials + XP) for the signed-in FBID. */
export async function fetchProfile(): Promise<Profile | null> {
  const r = await fetch(`${WORKER_URL}/profile`, { headers: { authorization: await authHeader() } });
  if (!r.ok) return null;
  return (await r.json()) as Profile;
}

// ---------------- NEAR · NEP-413 ----------------
// nonce MUST be a 32-byte Buffer whose bytes equal the worker's:
// utf8(nonce string) truncated/padded to 32 — the worker builds the same.
export async function verifyNear(wallet: NearWallet, accountId: string): Promise<ClaimResult> {
  const { nonce, message } = await issueNonce("near");
  const nonce32 = Buffer.alloc(32);
  Buffer.from(nonce, "utf8").copy(nonce32, 0, 0, 32);

  const signed = await wallet.signMessage!({
    message,
    recipient: NEP413_RECIPIENT,
    nonce: nonce32,
  });
  if (!signed) throw new Error("NEAR signature cancelled");

  return claim({
    chain: "near",
    address: signed.accountId ?? accountId,
    publicKey: signed.publicKey, // "ed25519:..."
    nonce,
    signature: signed.signature, // base64
  });
}

// ---------------- EVM · EIP-191 (OP + BSC checked server-side, one signature) --
export async function verifyEvm(config: Config, address: `0x${string}`): Promise<ClaimResult> {
  const { nonce, message } = await issueNonce("evm");
  const signature = await wagmiSignMessage(config, { account: address, message });
  return claim({ chain: "evm", address, nonce, signature }); // signature hex 0x…
}

// ---------------- Solana · ed25519 ----------------
export async function verifySolana(
  signMessage: (m: Uint8Array) => Promise<Uint8Array>,
  address: string,
): Promise<ClaimResult> {
  const { nonce, message } = await issueNonce("solana");
  const sig = await signMessage(new TextEncoder().encode(message));
  return claim({
    chain: "solana",
    address,
    nonce,
    signature: Buffer.from(sig).toString("base64"),
  });
}
