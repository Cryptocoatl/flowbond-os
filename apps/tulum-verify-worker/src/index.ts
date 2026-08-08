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
  HELIUS_API_KEY?: string; // Solana DAS — for admin-panel collection snapshots
  RATE_KV: KVNamespace;
}

const DOMAIN = "tulum.flowme.one";
const CHAINS = new Set(["near", "evm", "solana"]);

// Origins allowed to call this worker from a browser. Production plus the CF
// Pages preview host used for on-device testing. An exact match is reflected
// back (credentialed CORS can't use "*"); anything else gets the prod origin.
const ALLOWED_ORIGINS = new Set([
  "https://tulum.flowme.one",
  "https://test.tulum-flowme.pages.dev",
]);
const corsOrigin = (origin: string | null): string =>
  origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://tulum.flowme.one";
const cors = (origin: string | null = null) => ({
  "access-control-allow-origin": corsOrigin(origin),
  "vary": "Origin",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, GET, OPTIONS",
});
const json = (o: unknown, s = 200, origin: string | null = null) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors(origin) } });

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
// admin: snapshot a Solana collection/token into a frozen holder set.
// Present-state read (Solana has no cheap history) — same evidence class the
// Xelva/Gorillae snapshots use. Enumerates via Helius DAS. Admin-gated.
// ---------------------------------------------------------------------------
type Holder = { address_norm: string; balance: string; token_ids?: string[] };

async function heliusDas(env: Env, method: string, params: unknown): Promise<any> {
  if (!env.HELIUS_API_KEY) throw new Error("HELIUS_API_KEY not set on the worker");
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "admin", method, params }),
  });
  const jsn = (await res.json()) as { result?: any; error?: unknown };
  if (jsn.error) throw new Error(`DAS ${method}: ${JSON.stringify(jsn.error).slice(0, 160)}`);
  return jsn.result;
}

async function enumerateSolana(env: Env, kind: "ft" | "nft", contract: string): Promise<{ holders: Holder[]; slot: number }> {
  const slot = (await heliusDas(env, "getSlot", [])) as number;
  if (kind === "nft") {
    const byOwner = new Map<string, string[]>();
    let page = 1;
    for (;;) {
      const res = await heliusDas(env, "getAssetsByGroup", { groupKey: "collection", groupValue: contract, page, limit: 1000 });
      const items: any[] = res?.items ?? [];
      for (const it of items) {
        const owner = it.ownership?.owner;
        if (!owner) continue;
        const arr = byOwner.get(owner) ?? [];
        arr.push(it.id);
        byOwner.set(owner, arr);
      }
      if (items.length < 1000) break;
      page += 1;
      if (page > 60) break; // safety cap (~60k NFTs)
    }
    const holders = [...byOwner.entries()].map(([owner, ids]) => ({ address_norm: owner, balance: String(ids.length), token_ids: ids }));
    return { holders, slot: Number(slot) || 0 };
  }
  // ft
  const byOwner = new Map<string, bigint>();
  let cursor: string | undefined;
  for (;;) {
    const page: any = await heliusDas(env, "getTokenAccounts", { mint: contract, limit: 1000, cursor });
    const accounts: any[] = page?.token_accounts ?? [];
    for (const a of accounts) {
      const amt = BigInt(a.amount ?? "0");
      if (amt > 0n) byOwner.set(a.owner, (byOwner.get(a.owner) ?? 0n) + amt);
    }
    if (!page?.cursor || accounts.length === 0) break;
    cursor = page.cursor;
  }
  const holders = [...byOwner.entries()].map(([owner, bal]) => ({ address_norm: owner, balance: bal.toString() }));
  return { holders, slot: Number(slot) || 0 };
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    const url = new URL(req.url);
    const jwt = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
    const j = (o: unknown, s = 200) => json(o, s, origin);

    try {
      const { data: { user } } = await userClient(env, jwt).auth.getUser();
      if (!user) return j({ error: "auth required" }, 401);

      // ---- POST /nonce ----
      if (req.method === "POST" && url.pathname === "/nonce") {
        const { chain } = (await req.json()) as { chain: string };
        if (!CHAINS.has(chain)) return j({ error: "bad chain" }, 400);
        const issuedAt = new Date().toISOString();
        // pre-compute a nonce to bake into the message, then persist both via RPC
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const message = canonicalMessage({ chain, fbid: user.id, nonce, issuedAt });
        const svc = serviceClient(env);
        const { error } = await svc.from("tulum_nonces").insert({
          fbid: user.id, chain, nonce, message,
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        });
        if (error) return j({ error: error.message }, 500);
        return j({ nonce, message, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
      }

      // ---- POST /claim ----
      if (req.method === "POST" && url.pathname === "/claim") {
        if (!(await rateOk(env.RATE_KV, [user.id, ip]))) return j({ error: "rate limited" }, 429);
        const body = (await req.json()) as {
          chain: string; address: string; signature: string; publicKey?: string; nonce: string;
        };
        if (!CHAINS.has(body.chain)) return j({ error: "bad chain" }, 400);

        const svc = serviceClient(env);
        // rebuild the message SERVER-SIDE from the nonce row — never trust a client message
        const { data: nrow } = await svc
          .from("tulum_nonces")
          .select("message, expires_at, consumed_at, fbid, chain")
          .eq("nonce", body.nonce)
          .single();
        if (!nrow || nrow.fbid !== user.id || nrow.chain !== body.chain) return j({ error: "nonce not found" }, 400);
        if (nrow.consumed_at) return j({ error: "nonce already used" }, 400);
        if (new Date(nrow.expires_at) < new Date()) return j({ error: "nonce expired" }, 400);
        const message = nrow.message as string;

        const verified =
          body.chain === "near"
            ? await verifyNear({ ...body, publicKey: body.publicKey!, message })
            : body.chain === "evm"
              ? await verifyEvm({ address: body.address, message, signature: body.signature })
              : verifySolana({ address: body.address, message, signature: body.signature });
        if (!verified) return j({ error: "signature invalid" }, 401);

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
        if (error) return j({ error: error.message }, 409);
        return j(result);
      }

      // ---- GET /profile ----
      if (req.method === "GET" && url.pathname === "/profile") {
        const { data, error } = await userClient(env, jwt).rpc("tulum_get_profile", { p_user_id: user.id });
        if (error) return j({ error: error.message }, 500);
        return j(data);
      }

      // ---- POST /admin/snapshot ----  (admin adds an OG collection → frozen)
      if (req.method === "POST" && url.pathname === "/admin/snapshot") {
        // gate on the existing tulumcoin admin RBAC, evaluated in the user's context
        const { data: adminRole } = await userClient(env, jwt).rpc("tulumcoin_my_admin_role");
        if (adminRole !== "admin" && adminRole !== "super_admin") return j({ error: "admin only" }, 403);

        const b = (await req.json()) as {
          key: string; chain: string; kind: "ft" | "nft"; contract: string;
          credential: string; label?: string; base_xp?: number;
        };
        if (b.chain !== "solana") return j({ error: "El panel congela colecciones de Solana; usa el CLI para EVM/NEAR." }, 400);
        if (!b.key || !b.contract || !b.credential || (b.kind !== "ft" && b.kind !== "nft")) {
          return j({ error: "faltan campos: key, contract, credential, kind(ft|nft)" }, 400);
        }

        const svc = serviceClient(env);
        // reject a duplicate key up front (unique constraint would 500 later)
        const { data: existing } = await svc.from("tulum_snapshots").select("id,is_frozen").eq("key", b.key).maybeSingle();
        if (existing) return j({ error: `ya existe un snapshot con key '${b.key}'` }, 409);

        const { holders, slot } = await enumerateSolana(env, b.kind, b.contract);
        if (holders.length === 0) return j({ error: "0 holders — verifica el contrato/collection address" }, 422);

        // rate card first so the claim RPC grants XP for this credential
        await svc.from("tulum_xp_rate_card").upsert(
          { credential: b.credential, base_xp: b.base_xp ?? 100, requires_validator: false, multiplier_applies: false },
          { onConflict: "credential" },
        );

        const balanceSum = holders.reduce((a, h) => a + BigInt(h.balance), 0n).toString();
        const { data: snapRow, error: se } = await svc.from("tulum_snapshots").insert({
          key: b.key, chain: "solana", network: "solana-mainnet", contract: b.contract, kind: b.kind,
          credential: b.credential, block_height: slot, rpc_endpoint: "https://mainnet.helius-rpc.com (DAS, admin panel)",
          evidence_class: "present-state", total_supply: null,
          config_hash: "admin:" + b.contract, notes: b.label ?? null, is_frozen: false,
        }).select("id").single();
        if (se) return j({ error: `insert snapshot: ${se.message}` }, 500);
        const snapshotId = snapRow!.id as string;

        for (let i = 0; i < holders.length; i += 1000) {
          const rows = holders.slice(i, i + 1000).map((h) => ({
            snapshot_id: snapshotId, address_norm: h.address_norm, balance: h.balance, token_ids: h.token_ids ?? null,
          }));
          const { error: he } = await svc.from("tulum_snapshot_holders").insert(rows);
          if (he) return j({ error: `insert holders: ${he.message}` }, 500);
        }

        const { error: fe } = await svc.from("tulum_snapshots").update({
          holder_count: holders.length, balance_sum: balanceSum, is_frozen: true,
        }).eq("id", snapshotId);
        if (fe) return j({ error: `freeze: ${fe.message}` }, 500);

        console.log(JSON.stringify({ evt: "admin_snapshot", by: user.id, key: b.key, credential: b.credential, holders: holders.length }));
        return j({ ok: true, snapshot_id: snapshotId, holder_count: holders.length, credential: b.credential });
      }

      // ---- POST /admin/xp ----  (admin tunes the benefit weight of a credential)
      if (req.method === "POST" && url.pathname === "/admin/xp") {
        const { data: adminRole } = await userClient(env, jwt).rpc("tulumcoin_my_admin_role");
        if (adminRole !== "admin" && adminRole !== "super_admin") return j({ error: "admin only" }, 403);
        const { credential, base_xp } = (await req.json()) as { credential: string; base_xp: number };
        if (!credential || typeof base_xp !== "number") return j({ error: "credential + base_xp requeridos" }, 400);
        const { error } = await serviceClient(env).from("tulum_xp_rate_card").upsert(
          { credential, base_xp, requires_validator: false, multiplier_applies: false },
          { onConflict: "credential" },
        );
        if (error) return j({ error: error.message }, 500);
        return j({ ok: true, credential, base_xp });
      }

      return j({ error: "not found" }, 404);
    } catch (e) {
      return j({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  },
};
