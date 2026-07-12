// ============================================================
// TulumCoin · Verify OG — Supabase Edge Function (Deno) · v2
// POST /verify-og  { chain, address, publicKey?, nonce, message, signature }
//
// Status is HOLDINGS-BASED:
//   OG Jaguar    <- Tulumcoin FT / founding NFTs on NEAR
//   TLMC Steward <- TLMC on Optimism
//   Petgas Ally  <- PetgasCoin on BNB Chain
//   ReFi x1.5    <- ReFi Tulum NFT (benefit multiplier)
//   Xelva/Fest   <- Xelva NFT on Solana
//
// KEY: one EVM signature covers BNB + Optimism — same address,
// two RPC scans, zero extra friction for the user.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMessage } from "npm:viem@2";
import nacl from "npm:tweetnacl@1";
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding/base64";
import { decodeBase58 } from "jsr:@std/encoding/base58";
import { sha256 } from "npm:@noble/hashes@1/sha256";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Contracts are managed in tulumcoin_contracts (admin panel is the control
// plane — Love as super_admin, grantable team admins). Env vars are fallback.
const RPCS = {
  near: "https://rpc.mainnet.near.org",
  optimism: "https://mainnet.optimism.io",
  bnb: "https://bsc-dataseed.binance.org",
  solana: "https://api.mainnet-beta.solana.com",
} as const;

type Cfg = {
  near: { rpc: string; tulumcoin_ft: string; og_nft: string };
  evm: {
    optimism: { rpc: string; tlmc: string };
    bnb: { rpc: string; petgascoin: string };
    refi: { rpc: string; network: string; contract: string | null };
  };
  solana: { rpc: string; xelva_collection: string };
};

let cfgCache: { cfg: Cfg; at: number } | null = null;

async function loadCfg(): Promise<Cfg> {
  if (cfgCache && Date.now() - cfgCache.at < 60_000) return cfgCache.cfg; // 60s cache
  const { data } = await supabase.from("tulumcoin_contracts").select("key, network, address");
  const m = new Map((data ?? []).map((r) => [r.key, r]));
  const pick = (key: string, env: string) => {
    const row = m.get(key);
    return row?.address && row.address.length > 0 ? row.address : (Deno.env.get(env) ?? "");
  };
  const refiRow = m.get("refi_nft");
  const refiNet = refiRow?.network ?? Deno.env.get("REFI_NFT_NETWORK") ?? "optimism";
  const cfg: Cfg = {
    near: {
      rpc: RPCS.near,
      tulumcoin_ft: pick("tulumcoin_near_ft", "TULUMCOIN_NEAR_FT"),
      og_nft: pick("tulumcoin_near_nft", "TULUMCOIN_NEAR_NFT"),
    },
    evm: {
      optimism: { rpc: RPCS.optimism, tlmc: pick("tlmc_op", "TLMC_OP_ADDR") },
      bnb: { rpc: RPCS.bnb, petgascoin: pick("petgascoin_bnb", "PETGASCOIN_BNB_ADDR") },
      refi: {
        rpc: refiNet === "bnb" ? RPCS.bnb : RPCS.optimism,
        network: refiNet,
        contract: pick("refi_nft", "REFI_NFT_ADDR") || null,
      },
    },
    solana: { rpc: RPCS.solana, xelva_collection: pick("xelva_collection", "XELVA_COLLECTION") },
  };
  cfgCache = { cfg, at: Date.now() };
  return cfg;
}

type Chain = "near" | "evm" | "solana";
type Snapshot = { network: string; asset_key: string; asset_contract: string; balance_raw: string; token_ids: unknown };

// ---------------- signature verification ----------------

function nep413Payload(message: string, nonce32: Uint8Array, recipient: string): Uint8Array {
  const enc = new TextEncoder();
  const parts: number[] = [];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  const str = (s: string) => { const b = enc.encode(s); return [...u32(b.length), ...b]; };
  parts.push(...u32(2147484061)); // 2^31 + 413 (NEP-413 tag)
  parts.push(...str(message));
  parts.push(...nonce32);
  parts.push(...str(recipient));
  parts.push(0); // Option<callbackUrl> = None
  return sha256(new Uint8Array(parts));
}

async function verifyNear(cfg: Cfg, p: { address: string; publicKey: string; message: string; nonce: string; signature: string }) {
  const pk = decodeBase58(p.publicKey.replace("ed25519:", ""));
  const nonce32 = new Uint8Array(32);
  nonce32.set(new TextEncoder().encode(p.nonce).slice(0, 32));
  const payload = nep413Payload(p.message, nonce32, "tulum.flowme.one");
  if (!nacl.sign.detached.verify(payload, decodeBase64(p.signature), pk)) return false;
  const res = await rpc(cfg.near.rpc, "query", {
    request_type: "view_access_key", finality: "final",
    account_id: p.address, public_key: p.publicKey,
  });
  return !res.error && res.result?.permission === "FullAccess";
}

async function verifyEvm(p: { address: string; message: string; signature: string }) {
  // EIP-191 personal_sign, chain-agnostic — this one signature authorizes
  // reads on BNB and Optimism alike. Extend with EIP-1271 for smart accounts.
  return await verifyMessage({
    address: p.address as `0x${string}`,
    message: p.message,
    signature: p.signature as `0x${string}`,
  });
}

function verifySolana(p: { address: string; message: string; signature: string }) {
  return nacl.sign.detached.verify(
    new TextEncoder().encode(p.message),
    decodeBase64(p.signature),
    decodeBase58(p.address),
  );
}

// ---------------- holdings scans ----------------

async function rpc(url: string, method: string, params: unknown) {
  const r = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return await r.json();
}

async function scanNear(cfg: Cfg, address: string): Promise<Snapshot[]> {
  const call = (contract: string, method: string, args: unknown) =>
    rpc(cfg.near.rpc, "query", {
      request_type: "call_function", finality: "final", account_id: contract,
      method_name: method,
      args_base64: encodeBase64(new TextEncoder().encode(JSON.stringify(args))),
    }).then((r) =>
      r.result?.result ? JSON.parse(new TextDecoder().decode(new Uint8Array(r.result.result))) : null
    ).catch(() => null);

  const [ft, nfts] = await Promise.all([
    call(cfg.near.tulumcoin_ft, "ft_balance_of", { account_id: address }),
    call(cfg.near.og_nft, "nft_tokens_for_owner", { account_id: address, limit: 50 }),
  ]);
  return [
    { network: "near", asset_key: "tulumcoin_near", asset_contract: cfg.near.tulumcoin_ft,
      balance_raw: ft ?? "0", token_ids: null },
    { network: "near", asset_key: "og_nft_near", asset_contract: cfg.near.og_nft,
      balance_raw: String(nfts?.length ?? 0),
      token_ids: nfts?.map((t: { token_id: string }) => t.token_id) ?? [] },
  ];
}

async function scanEvm(cfg: Cfg, address: string): Promise<Snapshot[]> {
  const balanceOf = "0x70a08231" + address.slice(2).padStart(64, "0");
  const get = async (rpcUrl: string, contract: string) => {
    const r = await rpc(rpcUrl, "eth_call", [{ to: contract, data: balanceOf }, "latest"]);
    return r.result ? BigInt(r.result).toString() : "0";
  };
  const [tlmc, pgc] = await Promise.all([
    get(cfg.evm.optimism.rpc, cfg.evm.optimism.tlmc),
    get(cfg.evm.bnb.rpc, cfg.evm.bnb.petgascoin),
  ]);
  const out: Snapshot[] = [
    { network: "optimism", asset_key: "tlmc_op", asset_contract: cfg.evm.optimism.tlmc,
      balance_raw: tlmc, token_ids: null },
    { network: "bnb", asset_key: "petgascoin_bnb", asset_contract: cfg.evm.bnb.petgascoin,
      balance_raw: pgc, token_ids: null },
  ];
  if (cfg.evm.refi.contract) {
    out.push({ network: cfg.evm.refi.network, asset_key: "refi_nft",
      asset_contract: cfg.evm.refi.contract,
      balance_raw: await get(cfg.evm.refi.rpc, cfg.evm.refi.contract), // ERC-721 balanceOf
      token_ids: null });
  }
  return out;
}

async function scanSolana(cfg: Cfg, address: string): Promise<Snapshot[]> {
  // v1 heuristic; production: DAS API (Helius) filtered by verified Xelva collection.
  const r = await rpc(cfg.solana.rpc, "getTokenAccountsByOwner",
    [address, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }]);
  const accounts = r.result?.value ?? [];
  const nftLike = accounts.filter((a: { account: { data: { parsed: { info: { tokenAmount: { amount: string; decimals: number } } } } } }) => {
    const t = a.account.data.parsed.info.tokenAmount;
    return t.decimals === 0 && t.amount === "1";
  });
  return [{ network: "solana", asset_key: "xelva_nft", asset_contract: cfg.solana.xelva_collection,
    balance_raw: String(nftLike.length), token_ids: null }];
}

// ---------------- handler ----------------
Deno.serve(async (req) => {
  try {
    const jwt = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "auth required" }, 401);

    const body = await req.json() as {
      chain: Chain; address: string; publicKey?: string;
      nonce: string; message: string; signature: string;
    };

    if (!body.message.includes(user.id) || !body.message.includes(body.nonce)) {
      return json({ error: "challenge mismatch" }, 400);
    }

    const cfg = await loadCfg();
    const ok = body.chain === "near"
      ? await verifyNear(cfg, { ...body, publicKey: body.publicKey! })
      : body.chain === "evm"
      ? await verifyEvm(body)
      : verifySolana(body);
    if (!ok) return json({ error: "signature invalid" }, 401);

    const { data: linkId, error } = await supabase.rpc("tulumcoin_record_verified_link", {
      p_user_id: user.id, p_chain: body.chain, p_address: body.address,
      p_public_key: body.publicKey ?? null, p_nonce: body.nonce,
      p_message: body.message, p_signature: body.signature,
    });
    if (error) return json({ error: error.message }, 409);

    const holdings = body.chain === "near" ? await scanNear(cfg, body.address)
      : body.chain === "evm" ? await scanEvm(cfg, body.address)
      : await scanSolana(cfg, body.address);

    await supabase.from("tulumcoin_holdings_snapshots")
      .insert(holdings.map((h) => ({ ...h, wallet_link_id: linkId })));

    // Recompute OG Jaguar / TLMC Steward / Petgas Ally / ReFi x1.5 / Xelva
    const { data: status } = await supabase.rpc("tulumcoin_recompute_status", { p_user_id: user.id });

    // Verification XP through the multiplier-aware mint
    await supabase.rpc("tulumcoin_mint_xp", {
      p_user_id: user.id, p_amount: 50,
      p_reason: "og_verify_" + body.chain,
      p_source: { wallet_link_id: linkId },
    });

    return json({ ok: true, linkId, holdings, status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
