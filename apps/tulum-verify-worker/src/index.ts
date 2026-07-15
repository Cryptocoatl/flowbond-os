// ============================================================================
// tulum-verify-worker — Cloudflare Worker. THREE routes, nothing else.
// Replaces the live-scan edge path. The Worker NEVER reads an RPC for balances:
// a signed claim resolves against the FROZEN snapshot ledger in Supabase. Live
// balances are farmable (borrow a wallet for one block); frozen reads are not,
// because you cannot retroactively have been in a past block.
//
//   POST /nonce    → issue a single-use nonce + the exact canonical message
//   POST /claim    → verify signature, then service-role tulum_claim_og
//   GET  /profile  → tulum_get_profile for the authenticated FBID
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyMessage, createPublicClient, http } from "viem";
import { optimism, bsc } from "viem/chains";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import bs58 from "bs58";

// base64 (transit encoding for ed25519 sigs) → bytes
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  RATE_KV: KVNamespace;
}

const DOMAIN = "tulum.flowme.one";
const CHAINS = new Set(["near", "evm", "solana"]);
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors() } });
const cors = () => ({
  "access-control-allow-origin": "https://tulum.flowme.one",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, GET, OPTIONS",
});

// The canonical message the wallet signs. Server composes it; client only shows
// it. Embeds the "moves no funds" promise the page already makes.
function canonicalMessage(p: { chain: string; fbid: string; nonce: string; issuedAt: string }): string {
  return [
    `${DOMAIN} wants you to prove wallet ownership for soulbound recognition.`,
    ``,
    `FBID: ${p.fbid}`,
    `Chain: ${p.chain}`,
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
    ``,
    `Soulbound recognition only. This signature moves no funds and grants no approvals.`,
  ].join("\n");
}

// ---- rate limit: per FBID and per IP, 5/min ----
async function rateOk(kv: KVNamespace, keys: string[]): Promise<boolean> {
  for (const k of keys) {
    const bucket = `rl:${k}:${Math.floor(Date.now() / 60000)}`;
    const n = parseInt((await kv.get(bucket)) ?? "0", 10) + 1;
    await kv.put(bucket, String(n), { expirationTtl: 120 });
    if (n > 5) return false;
  }
  return true;
}

function userClient(env: Env, jwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
function serviceClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---------------------------------------------------------------------------
// signature verification
// ---------------------------------------------------------------------------

// NEAR NEP-413: (a) ed25519-verify the borsh payload, (b) PROVE the key belongs
// to the account via view_access_key_list. (b) is the step most gates skip — a
// valid signature alone proves someone owns a key, not that they own the account.
function nep413Payload(message: string, nonce: Uint8Array, recipient: string): Uint8Array {
  const enc = new TextEncoder();
  const parts: number[] = [];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  const str = (s: string) => { const b = enc.encode(s); return [...u32(b.length), ...b]; };
  parts.push(...u32(2147484061)); // 2^31 + 413
  parts.push(...str(message));
  parts.push(...nonce);
  parts.push(...str(recipient));
  parts.push(0); // Option<callbackUrl> = None
  return sha256(new Uint8Array(parts));
}

async function verifyNear(p: { address: string; publicKey: string; message: string; nonce: string; signature: string }): Promise<boolean> {
  const pk = bs58.decode(p.publicKey.replace("ed25519:", ""));
  const nonce32 = new Uint8Array(32);
  nonce32.set(new TextEncoder().encode(p.nonce).slice(0, 32));
  const payload = nep413Payload(p.message, nonce32, DOMAIN);
  if (!ed25519.verify(b64(p.signature), payload, pk)) return false;
  // (b) key ∈ account's access keys
  const res = await fetch("https://rpc.mainnet.near.org", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: "1", method: "query",
      params: { request_type: "view_access_key_list", finality: "final", account_id: p.address },
    }),
  }).then((r) => r.json() as Promise<any>);
  const keys: { public_key: string }[] = res?.result?.keys ?? [];
  return keys.some((k) => k.public_key === p.publicKey);
}

// EVM EIP-4361: EOA recovery first; EIP-1271 for smart-contract wallets (Safes).
function evmClient(chainId: number) {
  return createPublicClient({ chain: chainId === 56 ? bsc : optimism, transport: http() });
}
async function verifyEvm(p: { address: string; message: string; signature: string }): Promise<boolean> {
  const address = p.address as `0x${string}`;
  const signature = p.signature as `0x${string}`;
  // EOA
  try {
    if (await verifyMessage({ address, message: p.message, signature })) return true;
  } catch { /* fall through to 1271 */ }
  // EIP-1271 — try Optimism then BSC (a Safe is deployed per chain)
  for (const cid of [10, 56]) {
    try {
      const ok = await evmClient(cid).verifyMessage({ address, message: p.message, signature });
      if (ok) return true;
    } catch { /* next chain */ }
  }
  return false;
}

function verifySolana(p: { address: string; message: string; signature: string }): boolean {
  const msg = new TextEncoder().encode(p.message);
  return ed25519.verify(b64(p.signature), msg, bs58.decode(p.address));
}

// normalize per chain — MUST match the snapshot ingestion (EVM/NEAR lower; Solana as-is)
function normalize(chain: string, address: string): string {
  return chain === "solana" ? address : address.toLowerCase();
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    const url = new URL(req.url);
    const jwt = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";

    try {
      const { data: { user } } = await userClient(env, jwt).auth.getUser();
      if (!user) return json({ error: "auth required" }, 401);

      // ---- POST /nonce ----
      if (req.method === "POST" && url.pathname === "/nonce") {
        const { chain } = (await req.json()) as { chain: string };
        if (!CHAINS.has(chain)) return json({ error: "bad chain" }, 400);
        const issuedAt = new Date().toISOString();
        // pre-compute a nonce to bake into the message, then persist both via RPC
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const message = canonicalMessage({ chain, fbid: user.id, nonce, issuedAt });
        const svc = serviceClient(env);
        const { error } = await svc.from("tulum_nonces").insert({
          fbid: user.id, chain, nonce, message,
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        });
        if (error) return json({ error: error.message }, 500);
        return json({ nonce, message, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
      }

      // ---- POST /claim ----
      if (req.method === "POST" && url.pathname === "/claim") {
        if (!(await rateOk(env.RATE_KV, [user.id, ip]))) return json({ error: "rate limited" }, 429);
        const body = (await req.json()) as {
          chain: string; address: string; signature: string; publicKey?: string; nonce: string;
        };
        if (!CHAINS.has(body.chain)) return json({ error: "bad chain" }, 400);

        const svc = serviceClient(env);
        // rebuild the message SERVER-SIDE from the nonce row — never trust a client message
        const { data: nrow } = await svc
          .from("tulum_nonces")
          .select("message, expires_at, consumed_at, fbid, chain")
          .eq("nonce", body.nonce)
          .single();
        if (!nrow || nrow.fbid !== user.id || nrow.chain !== body.chain) return json({ error: "nonce not found" }, 400);
        if (nrow.consumed_at) return json({ error: "nonce already used" }, 400);
        if (new Date(nrow.expires_at) < new Date()) return json({ error: "nonce expired" }, 400);
        const message = nrow.message as string;

        const verified =
          body.chain === "near"
            ? await verifyNear({ ...body, publicKey: body.publicKey!, message })
            : body.chain === "evm"
              ? await verifyEvm({ address: body.address, message, signature: body.signature })
              : verifySolana({ address: body.address, message, signature: body.signature });
        if (!verified) return json({ error: "signature invalid" }, 401);

        const scheme = body.chain === "near" ? "nep413" : body.chain === "solana" ? "solana-ed25519" : "eip4361";
        const addr = normalize(body.chain, body.address);
        const started = Date.now();
        const { data: result, error } = await svc.rpc("tulum_claim_og", {
          p_user_id: user.id, p_chain: body.chain, p_address: addr,
          p_scheme: scheme, p_signature: body.signature, p_nonce: body.nonce,
        });
        // structured log — no signatures
        console.log(JSON.stringify({
          evt: "claim", fbid: user.id, chain: body.chain, address: addr,
          verified: true, granted: (result as any)?.granted ?? null, ms: Date.now() - started,
          err: error?.message ?? null,
        }));
        if (error) return json({ error: error.message }, 409);
        return json(result);
      }

      // ---- GET /profile ----
      if (req.method === "GET" && url.pathname === "/profile") {
        const { data, error } = await userClient(env, jwt).rpc("tulum_get_profile", { p_user_id: user.id });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  },
};
