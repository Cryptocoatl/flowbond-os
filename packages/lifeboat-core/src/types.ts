// Sputnik V2 shapes, mirroring sputnik-dao-contract/sputnikdao2.
// Deliberately permissive: the factory holds DAOs deployed over ~4 years across
// several contract versions, so anything we do not strictly need is `unknown`
// rather than a guess that throws on a relic.

export type RoleKind = { Group: string[] } | "Everyone" | { Member: string } | string;

export interface VotePolicy {
  weight_kind: "RoleWeight" | "TokenWeight";
  quorum: string;
  threshold: [number, number] | string;
}

export interface Role {
  name: string;
  kind: RoleKind;
  permissions: string[];
  vote_policy: Record<string, VotePolicy>;
}

export interface Policy {
  roles: Role[];
  default_vote_policy: VotePolicy;
  proposal_bond: string;
  proposal_period: string;
  bounty_bond: string;
  bounty_forgiveness_period: string;
}

export interface DaoConfig {
  name: string;
  purpose: string;
  metadata: string;
}

export type ProposalStatus =
  | "InProgress"
  | "Approved"
  | "Rejected"
  | "Removed"
  | "Expired"
  | "Moved"
  | "Failed";

export interface Proposal {
  id: number;
  proposer: string;
  description: string;
  kind: unknown;
  status: ProposalStatus;
  vote_counts: Record<string, [number, number, number]>;
  votes: Record<string, "Approve" | "Reject" | "Remove">;
  submission_time: string;
}

/** Lifecycle signal we compute — never something the chain hands us. */
export type DaoHealth =
  | "active"
  | "dormant"
  /** dormant + spendable treasury worth rescuing */
  | "headless"
  /** policy makes act_proposal panic — unrescuable by anyone. See policy.isBricked */
  | "bricked";

export interface DaoSnapshot {
  dao: string;
  config: DaoConfig | null;
  policy: Policy | null;
  /** Raw account balance in yoctoNEAR — NOT what the DAO can spend. */
  amountYocto: string;
  storageUsage: number;
  /** amount - storage stake. The honest treasury number. */
  spendableYocto: string;
  lastProposalId: number;
  lastProposalAt: number | null;
  health: DaoHealth;
  /** Set when the policy could not be parsed (V1 relic / custom deploy). */
  parseError?: string;
  indexedAt: number;
}

export interface MembershipHit {
  dao: string;
  /** Group-role names only — the roles we can prove membership in from policy. */
  roles: string[];
  /** Permissions the account actually holds, deduped across its roles. */
  permissions: string[];
}
