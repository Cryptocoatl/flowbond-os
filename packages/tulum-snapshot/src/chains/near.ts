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

// The public archival pool GARBAGE-COLLECTS recent-but-not-latest blocks
// inconsistently: one backend node has height H, the next has GC'd it. Both
// of these serve the SAME archival evidence class (NEP-141 ft_balance_of at a
// pinned block), so trying the next when one GC's is not a downgrade — it's
// resilience against a flaky load balancer. Ordered by observed reliability
// for recent pins. NEAR Lake receipt replay is a different class and is NOT here.
const ENDPOINTS = [
  "https://free.rpc.fastnear.com",
  "https://archival-rpc.mainnet.near.org",
  "https://rpc.mainnet.near.org",
] as const;
const NEARBLOCKS = "https://api.nearblocks.io/v1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GC_RE = /garbage collected|does not exist|UNKNOWN_BLOCK|MISSING_TRIE|GARBAGE_COLLECTED/i;

/**
 * Every endpoint that actually served a read in this scan — recorded on the
 * snapshot so a receipt never claims an endpoint that didn't answer.
 */
type Served = Set<string>;

/** POST a query to one endpoint; returns the parsed JSON-RPC envelope. */
async function post(endpoint: string, params: unknown, attempt = 0): Promise<any> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "query", params }),
  });
  if (res.status === 429 && attempt < 5) {
    await sleep(2 ** attempt * 250 + Math.random() * 250); // backoff + jitter
    return post(endpoint, params, attempt + 1);
  }
  return res.json();
}

/**
 * call_function at a pinned block; returns decoded JSON or null.
 * Walks the endpoint list on a GC'd-block error (a node-availability problem,
 * not a real absence of the block) and only throws when EVERY endpoint has GC'd
 * it — that is the honest "this height is gone from public infra" signal.
 */
async function callAt(
  contract: string,
  method: string,
  args: unknown,
  block: number,
  served: Served,
): Promise<any> {
  const argsB64 = Buffer.from(JSON.stringify(args)).toString("base64");
  const query = {
    request_type: "call_function",
    block_id: block, // historical read; the node must retain this height
    account_id: contract,
    method_name: method,
    args_base64: argsB64,
  };

  let lastGc = "";
  for (const endpoint of ENDPOINTS) {
    const r = await post(endpoint, query);
    if (r.error) {
      const msg = JSON.stringify(r.error);
      if (GC_RE.test(msg)) { lastGc = msg; continue; } // this node GC'd it — try the next
      return null; // a real "no such account/method" answer — not a coverage gap
    }
    served.add(endpoint);
    const bytes: number[] = r.result?.result ?? [];
    if (!bytes.length) return null;
    return JSON.parse(Buffer.from(Uint8Array.from(bytes)).toString("utf8"));
  }
  throw new Error(
    `NEAR: block ${block} for ${contract} is GC'd on EVERY public endpoint (${ENDPOINTS.join(", ")}). ` +
      `The only fallback is NEAR Lake receipt replay — a DIFFERENT evidence class. Re-pin to a more ` +
      `recent block or provision a dedicated archival node; do not silently substitute. (last: ${lastGc})`,
  );
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

/** Map with bounded concurrency — archival is ~4s/call; serial is ~3min for 40 accounts. */
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function scanFt(e: ContractEntry, block: number): Promise<ChainSnapshot> {
  const warnings: string[] = [];
  const served: Served = new Set();
  const candidates = await discoverFtHolders(e.contract);
  warnings.push(`NearBlocks discovered ${candidates.length} candidate accounts (index — verified per-account against archival state)`);

  const excluded = new Set(e.excludeList.map((x) => x.address.toLowerCase()));
  const toRead = candidates.filter((a) => !excluded.has(a.toLowerCase()));

  const read = await pooled(toRead, 5, async (acct) => {
    const bal = await callAt(e.contract, "ft_balance_of", { account_id: acct }, block, served);
    return { acct, bal };
  });
  const holders: SnapshotHolder[] = read
    .filter((r) => r.bal && r.bal !== "0")
    .map((r) => ({ address_norm: r.acct.toLowerCase(), balance: String(r.bal) }));

  const balanceSum = holders.reduce((a, h) => a + BigInt(h.balance), 0n);

  // ft_total_supply is on-chain truth; our holder set comes from an off-chain
  // index. If they disagree, discovery missed accounts — the snapshot would
  // silently deny a credential to a real holder. Report coverage, don't guess.
  let totalSupply: string | undefined;
  const ts = await callAt(e.contract, "ft_total_supply", {}, block, served);
  if (ts) {
    totalSupply = String(ts);
    const supply = BigInt(totalSupply);
    const missing = supply - balanceSum;
    if (missing !== 0n) {
      const pct = supply > 0n ? Number((balanceSum * 10_000n) / supply) / 100 : 0;
      warnings.push(
        `discovery coverage ${pct.toFixed(2)}% of ft_total_supply (${missing} base units unaccounted). ` +
          `Index-based discovery is not proof of completeness — confirm the gap is burns/locked supply ` +
          `and not missed holders before freezing.`,
      );
    }
  } else {
    warnings.push("ft_total_supply unreadable at the pinned block — no coverage cross-check available.");
  }

  const endpoints = [...served];
  if (endpoints.length > 1) {
    // All endpoints in the list serve the same archival class (ft_balance_of at
    // the pinned block), so this is resilience, not contamination — just record it.
    warnings.push(`reads spanned ${endpoints.length} archival endpoints (${endpoints.join(", ")}) — same evidence class, recorded for audit`);
  }

  return {
    key: e.key, holders, balanceSum: balanceSum.toString(), totalSupply,
    blockHeight: block, endpoint: endpoints.join(",") || ENDPOINTS[0], evidenceClass: "archival", warnings,
  };
}

async function scanNft(e: ContractEntry, block: number): Promise<ChainSnapshot> {
  const warnings: string[] = [];
  const served: Served = new Set();
  const byOwner = new Map<string, string[]>();
  const LIMIT = 100;
  let from = 0;
  for (;;) {
    const tokens = await callAt(e.contract, "nft_tokens", { from_index: String(from), limit: LIMIT }, block, served);
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
    blockHeight: block, endpoint: [...served].join(",") || ENDPOINTS[0], evidenceClass: "archival", warnings,
  };
}

export async function scanNear(e: ContractEntry): Promise<ChainSnapshot> {
  const block = requireBlock(e);
  return e.kind === "ft" ? scanFt(e, block) : scanNft(e, block);
}
