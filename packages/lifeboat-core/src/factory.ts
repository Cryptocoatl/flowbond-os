// The V2 factory: sputnik-dao.near.
//
// Measured 2026-07-14: get_number_daos = 1669, and get_dao_list returns all of
// them in a single ~185KB response in ~3s. That is small enough to fetch whole,
// so we do — no pagination dance needed for the list itself.
//
// The list is returned in CREATION order. That matters more than it looks:
// slicing a prefix off it gives you the OLDEST DAOs, which skew heavily dormant.
// Any partial pass MUST sample randomly (see sampleDaos) or its dormancy and
// treasury stats will be biased. This cost us one wasted measurement pass.

import { NearRpc } from "./rpc.js";

export const FACTORY = "sputnik-dao.near";

export async function getNumberDaos(rpc: NearRpc, factory = FACTORY): Promise<number> {
  return rpc.view<number>(factory, "get_number_daos");
}

/** Every DAO account id, in creation order. See the ordering caveat above. */
export async function getDaoList(rpc: NearRpc, factory = FACTORY): Promise<string[]> {
  return rpc.view<string[]>(factory, "get_dao_list");
}

/**
 * Deterministic random sample — for estimating factory-wide stats without a
 * full pass. Seeded so a run is reproducible and reviewable.
 */
export function sampleDaos(daos: string[], n: number, seed = 1): string[] {
  const out = [...daos];
  let s = seed >>> 0 || 1;
  const next = () => {
    // xorshift32 — we need reproducible, not cryptographic.
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.slice(0, Math.min(n, out.length));
}

/**
 * Subrequest budget for a full pass.
 *
 * Cloudflare caps subrequests per invocation (Free: 50 — hopeless; Paid: 10,000).
 * A full pass costs ~1 + 4/DAO ≈ 6.7k today, which fits one Paid invocation with
 * ~33% headroom. I/O wait does not count toward the 15-min cron CPU limit, so
 * CPU is not the binding constraint — subrequests are.
 *
 * Call this before a pass and shard if it returns false, rather than discovering
 * the ceiling halfway through and writing a half-truth to KV.
 */
export function fitsSubrequestBudget(daoCount: number, limit = 10_000): boolean {
  return 1 + daoCount * 4 <= limit;
}
