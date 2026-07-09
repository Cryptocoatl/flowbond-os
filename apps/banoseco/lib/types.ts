// Domain types — mirror the banoseco_* schema (public schema, canonical Supabase).
// Hand-authored because the tables are not yet applied to the live DB, so
// `supabase gen types` would not include them. Keep in sync with the migrations.

export type ToiletStatus = 'ok' | 'filling' | 'full' | 'servicing' | 'offline';
export type MissionStatus = 'open' | 'claimed' | 'done' | 'verified' | 'cancelled';
export type MissionKind = 'swap' | 'clean' | 'sanitize' | 'compost_dropoff';
export type Currency = 'oro' | 'xp';

/** Kind of map node — a node is no longer only a dry toilet. */
export type NodeKind = 'dry_toilet' | 'recycling_center' | 'compost_site' | 'water_point';

/** Kind of organization that owns/operates nodes. */
export type OrgKind =
  | 'banos_secos'
  | 'reciclaje'
  | 'composta'
  | 'huerto'
  | 'colectivo'
  | 'alcaldia'
  | 'other';

export type OrgRole = 'admin' | 'steward';

/** Row shape returned by banoseco_nearby_toilets(). */
export interface NearbyToilet {
  id: string;
  code: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  status: ToiletStatus;
  fill_pct: number;
  node_kind: NodeKind;
  org_id: string | null;
  has_solar_charge: boolean;
  has_recycling: boolean;
  distance_km: number;
}

/** banoseco_my_orgs() row — orgs the current user belongs to. */
export interface MyOrg {
  org_id: string;
  slug: string;
  name: string;
  kind: OrgKind;
  role: OrgRole;
  verified: boolean;
}

/** banoseco_org_members_list() row (admin view). */
export interface OrgMember {
  user_id: string;
  email: string | null;
  role: OrgRole;
  added_at: string;
}

/** A node owned by an org, for the admin dashboard (queried from banoseco_toilets). */
export interface OrgNode {
  id: string;
  code: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  status: ToiletStatus;
  fill_pct: number;
  node_kind: NodeKind;
  has_solar_charge: boolean;
  has_recycling: boolean;
  donation_url: string | null;
  active: boolean;
}

/** Row of banoseco_missions joined with its toilet (for the ops list). */
export interface Mission {
  id: string;
  toilet_id: string;
  kind: MissionKind;
  status: MissionStatus;
  reward_xp: number;
  reward_oro: number;
  reward_points: number;
  guardian_id: string | null;
  opened_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  proof_url: string | null;
  notes: string | null;
  // denormalized toilet fields for display
  toilet?: { code: string; name: string; neighborhood: string | null } | null;
}

/** banoseco_guardian_profile() — one row. */
export interface GuardianProfile {
  user_id: string | null;
  display_name: string | null;
  is_guardian: boolean;
  oro: number;
  xp: number;
  energy: number;
  energy_refilled_at: string | null;
}

/** banoseco_impact_summary() — one row. */
export interface ImpactSummary {
  active_toilets: number;
  missions_done: number;
  liters_water_saved: number;
  soil_kg: number;
  total_donated_mxn: number;
}

/** banoseco_leaderboard() row. */
export interface LeaderRow {
  user_id: string;
  display_name: string;
  oro: number;
}

export interface SessionUser {
  id: string;
  email: string | null;
}
