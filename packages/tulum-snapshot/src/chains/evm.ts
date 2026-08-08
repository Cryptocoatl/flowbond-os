// ============================================================================
// EVM adapter — historical balances by TRANSFER-LOG REPLAY.
// There is no historical balanceOf without an archive node, so we reconstruct:
// fold every Transfer(from,to,value) from deployBlock→pinnedBlock into a
// balance map. Chunked, checkpointed to disk (a 40M-block BSC replay must
// resume after a crash, not restart), and reconciled against totalSupply().
// ============================================================================
import {
  createPublicClient,
  http,
  parseAbiItem,
  getAddress,
  type PublicClient,
} from "viem";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireBlock, configHash, type ContractEntry } from "../config.js";
import type { ChainSnapshot } from "../types.js";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const ZERO = "0x0000000000000000000000000000000000000000";
const CACHE_DIR = ".snapshot-cache";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_RPC: Record<number, string> = {
  10: "https://mainnet.optimism.io", // documented fallback only
  56: "https://bsc-dataseed.binance.org", // documented fallback only
};

function rpcFor(e: ContractEntry): string {
  const env = e.chainId === 10 ? process.env.OP_RPC_URL : process.env.BSC_RPC_URL;
  return env || DEFAULT_RPC[e.chainId!] || "";
}

function client(rpc: string): PublicClient {
  return createPublicClient({ transport: http(rpc, { retryCount: 5, retryDelay: 400 }) });
}

/** Binary-search eth_getCode for the first block where the contract has code. */
async function findDeployBlock(c: PublicClient, contract: `0x${string}`, latest: bigint): Promise<bigint> {
  let lo = 0n;
  let hi = latest;
  // guard: is there code at latest at all?
  const codeAtHi = await c.getCode({ address: contract, blockNumber: hi });
  if (!codeAtHi || codeAtHi === "0x") throw new Error(`no contract code at ${contract} by block ${hi}`);
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const code = await c.getCode({ address: contract, blockNumber: mid });
    if (code && code !== "0x") hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}

type Checkpoint = { configHash: string; cursor: string; balances: Record<string, string> };

function ckptPath(key: string): string {
  return join(CACHE_DIR, `${key}.evm.checkpoint.json`);
}

function loadCheckpoint(key: string, hash: string): { cursor: bigint; balances: Map<string, bigint> } | null {
  const p = ckptPath(key);
  if (!existsSync(p)) return null;
  const raw = JSON.parse(readFileSync(p, "utf8")) as Checkpoint;
  if (raw.configHash !== hash) return null; // config changed → checkpoint void
  const balances = new Map<string, bigint>();
  for (const [k, v] of Object.entries(raw.balances)) balances.set(k, BigInt(v));
  return { cursor: BigInt(raw.cursor), balances };
}

function saveCheckpoint(key: string, hash: string, cursor: bigint, balances: Map<string, bigint>): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const obj: Checkpoint = {
    configHash: hash,
    cursor: cursor.toString(),
    balances: Object.fromEntries([...balances].map(([k, v]) => [k, v.toString()])),
  };
  writeFileSync(ckptPath(key), JSON.stringify(obj));
}

const isAlchemy = (rpc: string): boolean => /\.g\.alchemy\.com\//.test(rpc);

/**
 * Fold a contract's ENTIRE transfer history into a balance map using Alchemy's
 * getAssetTransfers index. This is the same reconstruction as the getLogs replay
 * (evidence class "replay"), but sourced from Alchemy's index instead of raw
 * logs — which sidesteps the free tier's 10-block getLogs cap and needs a
 * handful of 1000-row pages instead of millions of tiny windows. Uses
 * rawContract.value (hex raw base units) for exact folding — never the decimal
 * `value` field, which loses precision. The sum==totalSupply check downstream
 * is what guarantees the index was complete.
 */
async function foldViaAlchemyTransfers(
  rpc: string,
  contract: string,
  pinned: bigint,
  balances: Map<string, bigint>,
  warnings: string[],
): Promise<void> {
  const toHex = "0x" + pinned.toString(16);
  const addr = contract.toLowerCase();
  let pageKey: string | undefined;
  let pages = 0;
  let count = 0;
  do {
    const params = [{
      fromBlock: "0x0",
      toBlock: toHex,
      contractAddresses: [addr],
      category: ["erc20"],
      order: "asc",
      withMetadata: false,
      excludeZeroValue: false,
      maxCount: "0x3e8", // 1000
      ...(pageKey ? { pageKey } : {}),
    }];
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getAssetTransfers", params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(`alchemy_getAssetTransfers for ${contract}: ${JSON.stringify(json.error).slice(0, 200)}`);
    const transfers: any[] = json.result?.transfers ?? [];
    for (const t of transfers) {
      const raw = t.rawContract?.value;
      if (!raw) continue; // erc20 rows always carry it; skip anything malformed
      const value = BigInt(raw);
      const f = (t.from ?? "").toLowerCase();
      const to = (t.to ?? "").toLowerCase();
      if (f && f !== ZERO) balances.set(f, (balances.get(f) ?? 0n) - value);
      if (to && to !== ZERO) balances.set(to, (balances.get(to) ?? 0n) + value);
    }
    count += transfers.length;
    pageKey = json.result?.pageKey;
    pages += 1;
  } while (pageKey);
  warnings.push(`Alchemy transfer index: folded ${count} erc20 transfers over ${pages} page(s) [genesis → block ${pinned}]`);
}

export async function scanEvm(e: ContractEntry): Promise<ChainSnapshot> {
  const pinned = BigInt(requireBlock(e));
  const rpc = rpcFor(e);
  if (!rpc) throw new Error(`no RPC for chainId ${e.chainId} (set OP_RPC_URL / BSC_RPC_URL)`);
  const c = client(rpc);
  const contract = getAddress(e.contract) as `0x${string}`;
  const hash = configHash(e);
  const warnings: string[] = [];

  const balances = new Map<string, bigint>();

  if (isAlchemy(rpc)) {
    // Preferred path: the transfer index is exact and free-tier-viable.
    await foldViaAlchemyTransfers(rpc, contract, pinned, balances, warnings);
  } else {
    // Fallback: raw getLogs replay for non-Alchemy endpoints (needs deploy-block
    // discovery + disk checkpoint because the span can be tens of millions of blocks).
    const deploy = e.deployBlock != null ? BigInt(e.deployBlock) : await findDeployBlock(c, contract, pinned);
    if (e.deployBlock == null) warnings.push(`deployBlock discovered = ${deploy} — cache it into config as a literal`);

    const resumed = loadCheckpoint(e.key, hash);
    if (resumed) for (const [k, v] of resumed.balances) balances.set(k, v);
    let from = resumed ? resumed.cursor : deploy;
    if (resumed) warnings.push(`resumed EVM replay from checkpoint at block ${from}`);

    // Two failure modes look similar but need OPPOSITE responses:
    //   • range too large (result set / block span capped) → SHRINK the window.
    //   • rate limited (429 / "too many") → the span is fine; shrinking it makes
    //     things worse (more requests for the same ground). BACK OFF, same window.
    const isRateLimit = (m: string) => /429|too many|rate.?limit|capacity|-32005.*rate/i.test(m);
    const isRangeCap = (m: string) =>
      /-32005|-32602|range|block range|result set|too large|more than|exceed|limit(ed)? to|size|timeout/i.test(m);
    // A provider that answers "upgrade your tier" can't do the job — stop clean.
    const isProviderGate = (m: string) => /upgrade|free tier|payment required|402|paid (tier|plan)|quota (exceeded|reached)/i.test(m);

    let span = 10_000n;
    let rateBackoffs = 0;
    while (from <= pinned) {
      const to = from + span - 1n > pinned ? pinned : from + span - 1n;
      try {
        const logs = await c.getLogs({ address: contract, event: TRANSFER, fromBlock: from, toBlock: to });
        for (const log of logs) {
          const { from: f, to: t, value } = log.args as { from: string; to: string; value: bigint };
          if (f && f.toLowerCase() !== ZERO) balances.set(f.toLowerCase(), (balances.get(f.toLowerCase()) ?? 0n) - value);
          if (t && t.toLowerCase() !== ZERO) balances.set(t.toLowerCase(), (balances.get(t.toLowerCase()) ?? 0n) + value);
        }
        from = to + 1n;
        rateBackoffs = 0;
        saveCheckpoint(e.key, hash, from, balances);
        await sleep(120); // gentle pacing — free RPCs throttle a tight loop
        if (span < 10_000n) span = span * 2n > 10_000n ? 10_000n : span * 2n; // recover chunk size after a shrink
      } catch (err) {
        const msg = String(err);
        if (isProviderGate(msg)) {
          throw new Error(
            `EVM replay for ${e.key}: ${rpc} refused to continue on its free tier ("${msg.slice(0, 90)}"). ` +
              `Use an Alchemy endpoint (this adapter auto-uses its transfer index) or another archival ` +
              `provider. Progress is checkpointed; re-run to resume from block ${from}.`,
          );
        }
        if (isRateLimit(msg)) {
          if (rateBackoffs >= 8) {
            throw new Error(
              `EVM replay for ${e.key} keeps getting rate-limited by ${rpc} even after backoff. ` +
                `Set ${e.chainId === 10 ? "OP_RPC_URL" : "BSC_RPC_URL"} to a provider with adequate limits. ` +
                `Progress is checkpointed; re-run to resume. (${msg.slice(0, 120)})`,
            );
          }
          await sleep(Math.min(2 ** rateBackoffs * 500, 15_000) + Math.random() * 250);
          rateBackoffs += 1;
          continue; // same window
        }
        if (isRangeCap(msg) && span > 1n) {
          span = span / 2n; // shrink and retry the same window
          continue;
        }
        throw err;
      }
    }
  }

  // The replay is checked BEFORE exclusions: every positive balance the fold
  // produced must add up to totalSupply(). Excluding the deployer is an
  // editorial call about who earns a credential — it must not read as a broken
  // replay, so the invariant and the ledger are computed separately.
  const positive = [...balances.entries()].filter(([, bal]) => bal > 0n);
  const supplySum = positive.reduce((acc, [, bal]) => acc + bal, 0n);

  const excluded = new Set(e.excludeList.map((x) => x.address.toLowerCase()));
  const holders = positive
    .filter(([addr]) => !excluded.has(addr))
    .map(([addr, bal]) => ({ address_norm: addr, balance: bal.toString() }));

  const balanceSum = holders.reduce((acc, h) => acc + BigInt(h.balance), 0n);
  const excludedSum = supplySum - balanceSum;

  for (const x of e.excludeList) {
    const held = balances.get(x.address.toLowerCase()) ?? 0n;
    warnings.push(
      held > 0n
        ? `excluded ${x.address} (${x.reason}) holding ${held} — removed from the ledger, still counted against totalSupply`
        : `exclude-list entry ${x.address} (${x.reason}) holds nothing at block ${pinned} — verify it is the right address`,
    );
  }

  // A negative balance means the fold saw spends it never saw funded — a
  // missed log range, not a real position. Silence here would corrupt the seal.
  const negatives = [...balances.entries()].filter(([, bal]) => bal < 0n);
  if (negatives.length) {
    warnings.push(
      `${negatives.length} address(es) folded NEGATIVE (e.g. ${negatives[0]![0]} = ${negatives[0]![1]}) — ` +
        `logs are missing from the replay. Do not freeze.`,
    );
  }

  // totalSupply() at the pinned block — EVM replays must match to the base unit
  let totalSupply: string | undefined;
  try {
    const ts = (await c.readContract({
      address: contract,
      abi: [parseAbiItem("function totalSupply() view returns (uint256)")],
      functionName: "totalSupply",
      blockNumber: pinned,
    })) as bigint;
    totalSupply = ts.toString();
  } catch {
    warnings.push("totalSupply() unavailable at pinned block — cannot cross-check sum");
  }

  return {
    key: e.key,
    holders,
    balanceSum: balanceSum.toString(),
    supplySum: supplySum.toString(),
    excludedSum: excludedSum.toString(),
    totalSupply,
    blockHeight: Number(pinned),
    endpoint: rpc,
    evidenceClass: "replay",
    warnings,
  };
}
