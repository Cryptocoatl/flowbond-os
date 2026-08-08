// Per-DAO reads. Chain only — no Astro gateway, no NearBlocks for anything
// load-bearing. A read that fails must degrade to a stated unknown, never to a
// confident wrong answer.

import { NearRpc } from "./rpc.js";
import {
  effectiveStatus,
  isBricked,
  nearFromYocto,
  spendableYocto,
} from "./policy.js";
import type { DaoConfig, DaoHealth, DaoSnapshot, Policy, Proposal } from "./types.js";

/** No proposal in this long ⇒ dormant. */
export const DORMANT_DAYS = 365;
/** Spendable NEAR above which a dormant DAO is worth rescuing. */
export const RESCUE_MIN_NEAR = 1;

export async function getPolicy(rpc: NearRpc, dao: string): Promise<Policy> {
  return rpc.view<Policy>(dao, "get_policy");
}

export async function getConfig(rpc: NearRpc, dao: string): Promise<DaoConfig> {
  return rpc.view<DaoConfig>(dao, "get_config");
}

export async function getLastProposalId(rpc: NearRpc, dao: string): Promise<number> {
  return rpc.view<number>(dao, "get_last_proposal_id");
}

/**
 * `get_last_proposal_id` returns the NEXT id to assign, so valid ids are
 * [0, last-1] and `last === 0` means the DAO has never had a proposal.
 */
export async function getProposals(
  rpc: NearRpc,
  dao: string,
  fromIndex: number,
  limit: number,
): Promise<Proposal[]> {
  return rpc.view<Proposal[]>(dao, "get_proposals", { from_index: fromIndex, limit });
}

/** Full history, paged. Only for the detail view — never during a factory pass. */
export async function getAllProposals(rpc: NearRpc, dao: string, pageSize = 50): Promise<Proposal[]> {
  const last = await getLastProposalId(rpc, dao);
  const out: Proposal[] = [];
  for (let i = 0; i < last; i += pageSize) {
    out.push(...(await getProposals(rpc, dao, i, Math.min(pageSize, last - i))));
  }
  return out;
}

/** Proposal + the status the chain would actually act on. See policy.effectiveStatus. */
export function withEffectiveStatus(proposals: Proposal[], policy: Policy, nowMs = Date.now()) {
  return proposals.map((p) => ({
    ...p,
    effectiveStatus: effectiveStatus(p, policy.proposal_period, nowMs),
    /** True when the stored status is stale — i.e. the chain still says InProgress on a dead proposal. */
    statusIsStale: p.status === "InProgress" && effectiveStatus(p, policy.proposal_period, nowMs) !== "InProgress",
  }));
}

/**
 * Bonds locked in expired-but-unfinalized proposals, by proposer.
 *
 * Sputnik returns the bond on finalization, but nothing finalizes automatically —
 * so an abandoned DAO leaves its members' bonds stranded indefinitely. Anyone
 * with `*:Finalize` can call act_proposal(id, Finalize) on an expired proposal
 * and the bond goes back to whoever posted it.
 *
 * This is a real recovery lever, not trivia: a member too broke to post a new
 * bond may already have bonds of their own locked in dead proposals.
 */
export function lockedBonds(
  proposals: Proposal[],
  policy: Policy,
  nowMs = Date.now(),
): Map<string, { near: number; proposalIds: number[] }> {
  const bond = nearFromYocto(policy.proposal_bond);
  const out = new Map<string, { near: number; proposalIds: number[] }>();
  for (const p of proposals) {
    if (p.status !== "InProgress") continue;
    if (effectiveStatus(p, policy.proposal_period, nowMs) !== "Expired") continue;
    const cur = out.get(p.proposer) ?? { near: 0, proposalIds: [] };
    cur.near += bond;
    cur.proposalIds.push(p.id);
    out.set(p.proposer, cur);
  }
  return out;
}

export function classify(opts: {
  policy: Policy | null;
  spendableNear: number;
  lastProposalAt: number | null;
  nowMs?: number;
}): DaoHealth {
  const now = opts.nowMs ?? Date.now();
  if (opts.policy && isBricked(opts.policy)) return "bricked";
  const ageDays =
    opts.lastProposalAt === null ? Infinity : (now / 1000 - opts.lastProposalAt) / 86400;
  if (ageDays <= DORMANT_DAYS) return "active";
  return opts.spendableNear > RESCUE_MIN_NEAR ? "headless" : "dormant";
}

/**
 * One DAO, fully read. ~4 RPC calls — budget accordingly during a factory pass
 * (Workers cap subrequests per invocation).
 */
export async function snapshotDao(rpc: NearRpc, dao: string, nowMs = Date.now()): Promise<DaoSnapshot> {
  const acct = await rpc.viewAccount(dao);
  const spendable = spendableYocto(acct.amount, acct.storage_usage);

  let policy: Policy | null = null;
  let config: DaoConfig | null = null;
  let parseError: string | undefined;
  try {
    policy = await getPolicy(rpc, dao);
  } catch (err) {
    // V1 relics and custom deploys exist in this factory. Count and skip; a
    // single unparseable DAO must never abort the pass.
    parseError = err instanceof Error ? err.message : String(err);
  }

  let lastProposalId = 0;
  let lastProposalAt: number | null = null;
  if (policy) {
    try {
      lastProposalId = await getLastProposalId(rpc, dao);
      if (lastProposalId > 0) {
        const [last] = await getProposals(rpc, dao, lastProposalId - 1, 1);
        if (last) lastProposalAt = Number(BigInt(last.submission_time) / 1_000_000_000n);
      }
    } catch (err) {
      parseError ??= err instanceof Error ? err.message : String(err);
    }
  }

  return {
    dao,
    config,
    policy,
    amountYocto: acct.amount,
    storageUsage: acct.storage_usage,
    spendableYocto: spendable.toString(),
    lastProposalId,
    lastProposalAt,
    health: classify({ policy, spendableNear: nearFromYocto(spendable), lastProposalAt, nowMs }),
    parseError,
    indexedAt: nowMs,
  };
}
