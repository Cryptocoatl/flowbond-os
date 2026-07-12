// ============================================================
// src/lib/verify.ts — Verify OG client flow (the correct APIs)
//
// Flow per chain:
//   1. supabase.rpc('tulumcoin_issue_challenge')  -> { nonce, message }
//   2. sign `message` with the chain's native signMessage:
//        NEAR   -> NEP-413 wallet.signMessage({ message, recipient, nonce: Buffer(32) })
//        EVM    -> EIP-191 personal_sign via wagmi signMessage (one sig covers BNB + OP reads)
//        Solana -> ed25519 wallet.signMessage(bytes)
//   3. POST to the verify-og edge function with the session JWT
// ============================================================
import { Buffer } from "buffer";
import { supabase } from "./supabase";
import { signMessage as wagmiSignMessage } from "@wagmi/core";
import type { Config } from "wagmi";
import type { Wallet as NearWallet } from "@near-wallet-selector/core";

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/verify-og";
export const NEP413_RECIPIENT = "tulum.flowme.one";

export type Chain = "near" | "evm" | "solana";

export interface VerifyResult {
  ok: boolean;
  linkId?: string;
  holdings?: Array<{ network: string; asset_key: string; balance_raw: string }>;
  status?: {
    og_jaguar: boolean; tlmc_steward: boolean; petgas_ally: boolean;
    refi_multiplier: boolean; xelva_holder: boolean; chains_verified: number;
  };
  error?: string;
}

async function issueChallenge(chain: Chain, address: string) {
  const { data, error } = await supabase.rpc("tulumcoin_issue_challenge", {
    p_chain: chain, p_address: address,
  });
  if (error) throw new Error(error.message);
  return data[0] as { nonce: string; message: string };
}

async function submit(body: Record<string, unknown>): Promise<VerifyResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("FBID session required — sign in first");
  const r = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  return await r.json();
}

// ---------------- NEAR · NEP-413 ----------------
// wallet from @near-wallet-selector; nonce MUST be a 32-byte Buffer and
// match the server's padding (utf8 bytes of the hex nonce string = 32 bytes).
export async function verifyNear(wallet: NearWallet, accountId: string): Promise<VerifyResult> {
  const { nonce, message } = await issueChallenge("near", accountId);
  const nonce32 = Buffer.alloc(32);
  Buffer.from(nonce, "utf8").copy(nonce32, 0, 0, 32);

  const signed = await wallet.signMessage!({
    message,
    recipient: NEP413_RECIPIENT,
    nonce: nonce32,
  });
  if (!signed) throw new Error("NEAR signature cancelled");

  return submit({
    chain: "near",
    address: signed.accountId ?? accountId,
    publicKey: signed.publicKey,      // "ed25519:..."
    nonce, message,
    signature: signed.signature,      // base64
  });
}

// ---------------- EVM · EIP-191 (BNB + Optimism, one signature) ----------------
export async function verifyEvm(config: Config, address: `0x${string}`): Promise<VerifyResult> {
  const { nonce, message } = await issueChallenge("evm", address);
  const signature = await wagmiSignMessage(config, { account: address, message });
  return submit({ chain: "evm", address, nonce, message, signature }); // hex 0x…
}

// ---------------- Solana · ed25519 ----------------
export async function verifySolana(
  signMessage: (m: Uint8Array) => Promise<Uint8Array>,
  address: string,
): Promise<VerifyResult> {
  const { nonce, message } = await issueChallenge("solana", address);
  const sig = await signMessage(new TextEncoder().encode(message));
  return submit({
    chain: "solana", address, nonce, message,
    signature: Buffer.from(sig).toString("base64"),
  });
}
