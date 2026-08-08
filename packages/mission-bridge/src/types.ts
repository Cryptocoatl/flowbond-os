// =============================================================================
// @flowbond/mission-bridge — proof submission / validation / XP contract.
// Every write goes through a SECURITY DEFINER RPC (see 02_migration_kai_world.sql);
// this package is a typed client over those RPCs, never a direct table writer.
// =============================================================================

/** A geotagged, timestamped proof of a real-world regeneration action. */
export interface ProofSubmission {
  /** region the action heals (kai_regions.slug) */
  regionSlug: string;
  /** mission type performed (kai_mission_types.slug), e.g. 'siembra-un-arbol' */
  missionSlug: string;
  /** WGS84 latitude of the action */
  lat: number;
  /** WGS84 longitude of the action */
  lng: number;
  /** unix ms the action was performed (client clock; server also stamps arrival) */
  performedAt: number;
  /** R2 object key of the uploaded media (photo/video). Never a data URL. */
  mediaKey: string;
  /** SHA-256 hex of the media bytes, for duplicate rejection */
  mediaHash: string;
}

export type ProofStatus = 'pending' | 'validated' | 'rejected';

export interface Proof extends ProofSubmission {
  id: string;
  submitterFbid: string;
  status: ProofStatus;
  submittedAt: number;
  validatedAt?: number;
  validatorFbid?: string;
}

export interface XpGrant {
  fbid: string;
  amount: number;
  reason: string;
  proofId: string;
  grantedAt: number;
}

/**
 * Adapter interface so external mission sources (BAÑOSECO, FlowGarden,
 * Reciprociudad, …) plug in later without changing the core loop. An adapter
 * maps a source-native completion event onto a canonical ProofSubmission.
 */
export interface MissionSourceAdapter<TSourceEvent = unknown> {
  /** stable id of the mission source, e.g. 'banoseco' */
  readonly source: string;
  /** true if this adapter recognizes the event */
  matches(event: TSourceEvent): boolean;
  /** translate a source-native event into a canonical proof submission */
  toSubmission(event: TSourceEvent): ProofSubmission;
}
