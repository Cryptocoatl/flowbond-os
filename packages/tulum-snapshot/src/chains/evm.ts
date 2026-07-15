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

export async function scanEvm(e: ContractEntry): Promise<ChainSnapshot> {
  const pinned = BigInt(requireBlock(e));
  const rpc = rpcFor(e);
  if (!rpc) throw new Error(`no RPC for chainId ${e.chainId} (set OP_RPC_URL / BSC_RPC_URL)`);
  const c = client(rpc);
  const contract = getAddress(e.contract) as `0x${string}`;
  const hash = configHash(e);
  const warnings: string[] = [];

  const deploy = e.deployBlock != null ? BigInt(e.deployBlock) : await findDeployBlock(c, contract, pinned);
  if (e.deployBlock == null) warnings.push(`deployBlock discovered = ${deploy} — cache it into config as a literal`);

  // resume from checkpoint if the config hash matches
  const resumed = loadCheckpoint(e.key, hash);
  const balances = resumed?.balances ?? new Map<string, bigint>();
  let from = resumed ? resumed.cursor : deploy;
  if (resumed) warnings.push(`resumed EVM replay from checkpoint at block ${from}`);

  let span = 10_000n;
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
      saveCheckpoint(e.key, hash, from, balances);
      if (span < 10_000n) span = span * 2n > 10_000n ? 10_000n : span * 2n; // recover chunk size after a shrink
    } catch (err) {
      const msg = String(err);
      if ((msg.includes("-32005") || /too many|range|size|limit/i.test(msg)) && span > 1n) {
        span = span / 2n; // shrink and retry the same window
        continue;
      }
      throw err;
    }
  }

  // exclusions (deployer/treasury/LP) — drop before finalizing
  const excluded = new Set(e.excludeList.map((x) => x.address.toLowerCase()));
  const holders = [...balances.entries()]
    .filter(([addr, bal]) => bal > 0n && !excluded.has(addr))
    .map(([addr, bal]) => ({ address_norm: addr, balance: bal.toString() }));

  const balanceSum = holders.reduce((acc, h) => acc + BigInt(h.balance), 0n);

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

  if (holders.length < 10) {
    warnings.push(`HOLDER COUNT ${holders.length} < 10 — suspicious. Likely wrong address, not small community. DO NOT FREEZE without human review.`);
  }

  return {
    key: e.key,
    holders,
    balanceSum: balanceSum.toString(),
    totalSupply,
    blockHeight: Number(pinned),
    endpoint: rpc,
    evidenceClass: "replay",
    warnings,
  };
}
