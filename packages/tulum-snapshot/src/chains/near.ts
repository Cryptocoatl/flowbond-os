// ============================================================================
// NEAR adapter — archival reads at a pinned block.
//   FT  (NEP-141): no holder enumeration on-chain, so two stages —
//        1. DISCOVER candidate accounts via NearBlocks index (who to ask).
//        2. FREEZE truth: ft_balance_of at the PINNED block on the archival
//           node, per candidate. The index only tells us who; the archival
//           node tells us how much.
//   NFT (NEP-171): paginate nft_tokens at the pinned block, group by owner.
// Balances stored as raw base units (decimal strings). Never divide.
// ============================================================================
import { requireBlock, type ContractEntry } from "../config.js";
import type { ChainSnapshot, SnapshotHolder } from "../types.js";

const ARCHIVAL = "https://archival-rpc.mainnet.near.org";
const FASTNEAR = "https://free.rpc.fastnear.com"; // fallback on 429
const NEARBLOCKS = "https://api.nearblocks.io/v1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rpc(method: string, params: unknown, attempt = 0): Promise<any> {
  const endpoint = attempt < 3 ? ARCHIVAL : FASTNEAR;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "1", method, params }),
  });
  if (res.status === 429 && attempt < 6) {
    await sleep(2 ** attempt * 250 + Math.random() * 250); // backoff + jitter
    return rpc(method, params, attempt + 1);
  }
  const json = await res.json();
  return json;
}

/** call_function at a pinned block; returns decoded JSON or null. */
async function callAt(contract: string, method: string, args: unknown, block: number): Promise<any> {
  const argsB64 = Buffer.from(JSON.stringify(args)).toString("base64");
  const r = await rpc("query", {
    request_type: "call_function",
    block_id: block, // historical read; archival node must retain this height
    account_id: contract,
    method_name: method,
    args_base64: argsB64,
  });
  if (r.error) {
    const msg = JSON.stringify(r.error);
    if (/garbage collected|does not exist|UNKNOWN_BLOCK|MISSING_TRIE/i.test(msg)) {
      throw new Error(
        `NEAR archival refused block ${block} for ${contract} (state GC'd). Fallback is ` +
          `NEAR Lake receipt replay — a DIFFERENT evidence class. Flag it; do not silently substitute. (${msg})`,
      );
    }
    return null;
  }
  const bytes: number[] = r.result?.result ?? [];
  if (!bytes.length) return null;
  return JSON.parse(Buffer.from(Uint8Array.from(bytes)).toString("utf8"));
}

async function discoverFtHolders(contract: string): Promise<string[]> {
  const key = process.env.NEARBLOCKS_API_KEY;
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  const accounts: string[] = [];
  let page = 1;
  // NearBlocks paginates; walk until a short/empty page.
  for (;;) {
    const url = `${NEARBLOCKS}/fts/${contract}/holders?per_page=50&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 429) { await sleep(1200); continue; }
      throw new Error(`NearBlocks ${res.status} discovering holders of ${contract}`);
    }
    const json = (await res.json()) as { holders?: { account?: string; account_id?: string }[] };
    const batch = json.holders ?? [];
    for (const h of batch) { const a = h.account ?? h.account_id; if (a) accounts.push(a); }
    if (batch.length < 50) break;
    page += 1;
    await sleep(250);
  }
  return [...new Set(accounts)];
}

async function scanFt(e: ContractEntry, block: number): Promise<ChainSnapshot> {
  const warnings: string[] = [];
  const candidates = await discoverFtHolders(e.contract);
  warnings.push(`NearBlocks discovered ${candidates.length} candidate accounts (index — verified per-account against archival state)`);
  const excluded = new Set(e.excludeList.map((x) => x.address.toLowerCase()));
  const holders: SnapshotHolder[] = [];
  for (const acct of candidates) {
    if (excluded.has(acct.toLowerCase())) continue;
    const bal = await callAt(e.contract, "ft_balance_of", { account_id: acct }, block);
    if (bal && bal !== "0") holders.push({ address_norm: acct.toLowerCase(), balance: String(bal) });
    await sleep(60);
  }
  const balanceSum = holders.reduce((a, h) => a + BigInt(h.balance), 0n);
  return {
    key: e.key, holders, balanceSum: balanceSum.toString(),
    blockHeight: block, endpoint: ARCHIVAL, evidenceClass: "archival", warnings,
  };
}

async function scanNft(e: ContractEntry, block: number): Promise<ChainSnapshot> {
  const warnings: string[] = [];
  const byOwner = new Map<string, string[]>();
  const LIMIT = 100;
  let from = 0;
  for (;;) {
    const tokens = await callAt(e.contract, "nft_tokens", { from_index: String(from), limit: LIMIT }, block);
    if (!tokens || tokens.length === 0) break;
    for (const t of tokens as { owner_id: string; token_id: string }[]) {
      const owner = t.owner_id.toLowerCase();
      const arr = byOwner.get(owner) ?? [];
      arr.push(t.token_id);
      byOwner.set(owner, arr);
    }
    from += tokens.length;
    if (tokens.length < LIMIT) break;
    await sleep(80);
  }
  const excluded = new Set(e.excludeList.map((x) => x.address.toLowerCase()));
  const holders: SnapshotHolder[] = [...byOwner.entries()]
    .filter(([owner]) => !excluded.has(owner))
    .map(([owner, ids]) => ({ address_norm: owner, balance: String(ids.length), token_ids: ids }));
  const balanceSum = holders.reduce((a, h) => a + BigInt(h.balance), 0n);
  warnings.push(`${holders.length} owners hold ${balanceSum} tokens at block ${block}`);
  return {
    key: e.key, holders, balanceSum: balanceSum.toString(),
    blockHeight: block, endpoint: ARCHIVAL, evidenceClass: "archival", warnings,
  };
}

export async function scanNear(e: ContractEntry): Promise<ChainSnapshot> {
  const block = requireBlock(e);
  return e.kind === "ft" ? scanFt(e, block) : scanNft(e, block);
}
