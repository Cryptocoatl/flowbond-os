// =============================================================================
// Kai World domain types — the single contract the Explore UI renders against.
// Kept renderer-agnostic: a web dashboard, a console, or a 3D client all read
// these same shapes. Source of truth is the kai_ schema (see lib/kai/data.ts).
// =============================================================================

/** The five 0..1 visual/health channels driven by the state engine. */
export interface RegionState {
  vitality: number;
  canopy: number;
  water: number;
  biodiversity: number;
  communityPulse: number;
}

export interface RegionSummary {
  slug: string;
  name: string;
  splatUrl: string;
  bounds: { lat: number; lng: number; radiusM: number };
  state: RegionState;
  /** true when served from the live DB; false when the local seed was used. */
  live: boolean;
}

export interface Mission {
  slug: string;
  name: string;
  xpReward: number;
  pulseWeight: number;
  /** category is derived until kai_mission_types carries one; defaults to 'restore'. */
  category: MissionCategory;
}

export type MissionCategory =
  | 'restore'
  | 'learn'
  | 'build'
  | 'connect'
  | 'celebrate';

/** Economy currencies (points system). value null = not yet wired to a ledger. */
export interface PointBalance {
  key: 'flow' | 'impact' | 'creation' | 'wisdom' | 'token';
  label: string;
  value: number | null;
}

export interface Guardian {
  slug: string;
  name: string;
  role: string;
  focus: string[];
  /** economy accent used for the card glow. */
  accent: PointBalance['key'] | 'jade';
  /** image slot under /public/images/guardians/<slug>.webp (may not exist yet). */
  portrait: string;
}

export interface ImpactStat {
  key: string;
  label: string;
  value: number | null;
  unit?: string;
  icon: IconName;
}

export interface FeedItem {
  id: string;
  actor: string;
  action: string;
  place: string;
  at: string; // ISO
}

export interface DreamRequest {
  id: string;
  title: string;
  place: string;
  progress: number; // 0..1
  needed: string;
  status: 'planning' | 'community' | 'in_progress' | 'looking';
}

export interface Place {
  slug: string;
  name: string;
  region: string;
  kind: 'sacred' | 'natural' | 'cultural' | 'community';
}

export type IconName =
  | 'tree'
  | 'water'
  | 'leaf'
  | 'bird'
  | 'people'
  | 'co2'
  | 'spark'
  | 'compass';
