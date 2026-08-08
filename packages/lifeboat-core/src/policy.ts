// Sputnik V2 policy arithmetic — the honesty layer.
//
// Every function here mirrors sputnik-dao-contract/sputnikdao2/src/policy.rs.
// Getting this wrong doesn't throw, it just quietly lies to a community about
// whether their DAO can act. So each rule below is cited and, where we could,
// checked against live on-chain evidence.

import type { Policy, Proposal, ProposalStatus, Role, RoleKind } from "./types.js";

/** Storage staking: NEAR locks 1e19 yoctoNEAR per byte of account storage. */
const YOCTO_PER_BYTE = 10n ** 19n;

/** Group roles are the only ones with a countable, indexable membership. */
export function roleMembers(kind: RoleKind): string[] | null {
  return typeof kind === "object" && kind !== null && "Group" in kind ? kind.Group : null;
}

/**
 * Role size for RoleWeight thresholds.
 *
 * policy.rs `get_role_size()` returns Some(n) ONLY for RoleKind::Group; every
 * other kind returns None. Callers there use `.expect("ERR_UNSUPPORTED_ROLE")`,
 * which is why `isBricked()` below exists.
 */
export function roleSize(kind: RoleKind): number | null {
  const m = roleMembers(kind);
  return m ? m.length : null;
}

/**
 * Votes required for a role to carry a proposal.
 *
 * policy.rs `WeightOrRatio::to_weight()`:
 *   Ratio(num, denom) => min((num * total) / denom + 1, total)
 *   Weight(w)         => min(w, total)
 *
 * The `+1` is the whole ballgame and it is NOT a rounding artifact — it turns
 * a ratio into a STRICT majority. For a 6-member council at 1/2 the answer is
 * (1*6)/2 + 1 = 4, not 3. For a 4-member council at 1/2 it is 3, not 2.
 *
 * Verified on-chain: tulumcoin.sputnik-dao.near proposal #71 (8 N transfer)
 * collected 3 Council approvals and never passed, because it needed 4.
 * Integer division is floor, matching Rust's u128 semantics.
 */
export function votesNeeded(threshold: Threshold, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  if (Array.isArray(threshold)) {
    const [num, denom] = threshold;
    if (!denom) return totalWeight;
    return Math.min(Math.floor((num * totalWeight) / denom) + 1, totalWeight);
  }
  return Math.min(Number(threshold), totalWeight);
}

export type Threshold = [number, number] | string | number;

/** The vote policy that actually applies to a (role, proposalKind) pair. */
export function votePolicyFor(policy: Policy, role: Role, kindLabel: string) {
  return role.vote_policy?.[kindLabel] ?? policy.default_vote_policy;
}

/** Roles permitting `action` on `kindLabel` — mirrors policy.rs `can_execute_action`. */
export function rolesPermitting(policy: Policy, kindLabel: string, action: string): Role[] {
  return policy.roles.filter((r) =>
    r.permissions.some(
      (p) =>
        p === `${kindLabel}:${action}` ||
        p === `${kindLabel}:*` ||
        p === `*:${action}` ||
        p === "*:*",
    ),
  );
}

/**
 * A DAO is BRICKED if a non-Group role can vote.
 *
 * `can_execute_action` returns every role the voter matches that permits the
 * action — and RoleKind::Everyone matches everyone. `proposal_status` then calls
 * `get_role_size().expect("ERR_UNSUPPORTED_ROLE")` on it, which panics. So any
 * DAO granting a Vote* permission to an Everyone role cannot execute a vote at
 * all: every act_proposal reverts, permanently. No proposal can ever pass.
 *
 * This is distinct from "headless" — headless DAOs can be rescued by their
 * members; bricked ones cannot be rescued at all, by anyone. Do not offer a
 * recover button on these; say the truth instead.
 */
export function isBricked(policy: Policy): boolean {
  return policy.roles.some(
    (r) =>
      roleSize(r.kind) === null &&
      r.permissions.some((p) => /:(VoteApprove|VoteReject|VoteRemove)$/.test(p) || p === "*:*"),
  );
}

/**
 * Effective proposal status.
 *
 * The STORED status stays `InProgress` forever until somebody calls Finalize —
 * so the chain will happily tell you a proposal from 2023 is "in progress".
 * `proposal_status` checks expiry FIRST and returns Expired regardless of votes.
 * Rendering the stored value would show live vote buttons on dead proposals.
 */
export function effectiveStatus(
  proposal: Pick<Proposal, "status" | "submission_time">,
  proposalPeriodNs: string | number,
  nowMs: number = Date.now(),
): ProposalStatus {
  if (proposal.status !== "InProgress") return proposal.status;
  const submitted = BigInt(proposal.submission_time);
  const period = BigInt(proposalPeriodNs);
  const nowNs = BigInt(Math.floor(nowMs)) * 1_000_000n;
  return submitted + period < nowNs ? "Expired" : "InProgress";
}

/** Spendable balance — what the DAO can actually pay out. */
export function spendableYocto(amountYocto: string | bigint, storageUsageBytes: number): bigint {
  const amount = BigInt(amountYocto);
  const locked = BigInt(Math.max(0, Math.floor(storageUsageBytes))) * YOCTO_PER_BYTE;
  const free = amount - locked;
  return free > 0n ? free : 0n;
}

/**
 * Why spendable != balance, and why it matters for the "headless" signal:
 *
 * A Sputnik DAO stakes NEAR for its own contract code + state. tulumcoin holds
 * 17.50 N but 628,600 bytes of storage lock 6.29 N of it — only 11.22 N can move.
 * Calling that a "17.5 N treasury" overstates payout capacity by 36%, and a
 * council that proposed a 15 N transfer on our numbers would watch it fail.
 *
 * It also guts the naive rescue heuristic: EVERY live DAO holds several NEAR in
 * storage stake just to exist, so `balance > 1 N` is true for ~85% of the factory
 * and selects almost nothing. Against spendable, it selects ~38%. Screen on
 * spendable, always.
 */
export function nearFromYocto(yocto: bigint | string): number {
  return Number(BigInt(yocto)) / 1e24;
}

/** Human-readable threshold, e.g. "4 of 6 Council members must approve". */
export function describeThreshold(policy: Policy, role: Role, kindLabel: string): string | null {
  const size = roleSize(role.kind);
  if (size === null) return null;
  const vp = votePolicyFor(policy, role, kindLabel);
  if (vp?.weight_kind !== "RoleWeight") return null; // TokenWeight is balance-dependent; resolve live.
  const need = votesNeeded(vp.threshold as Threshold, size);
  return `${need} of ${size} ${role.name.trim()} members must approve`;
}
