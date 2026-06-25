// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · tier + feature model  (lib/claudia/tiers.ts)
//
//  The spectrum from "simple FlowMe guide" → "full ClaudIAflow", expressed as
//  three tiers. The server stores only the tier (flowbond_entitlements, 0007);
//  this map turns a tier into the set of unlocked features. Client gating is UX
//  (hide/upsell); anything that must be ENFORCED is also checked server-side at
//  its RPC/route. Keep this map and any server checks in sync.
// ════════════════════════════════════════════════════════════════════════

export type Tier = 'free' | 'plus' | 'pro';

export type Feature =
  | 'chat'        // ClaudIA conversation (the guide)
  | 'care'        // wellbeing nudges
  | 'tasks'       // ready-tasks
  | 'meetings'    // on-device meeting transcription + notes
  | 'sharing'     // share a recap to other FBIDs
  | 'rooms'       // group-ZK rooms + private chat
  | 'invites'     // invite links
  | 'dashboards'  // multi-app empire dashboards
  | 'ai_actions'; // talk-to-act (ClaudIA performs granted actions)

export const TIER_RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', plus: 'Plus', pro: 'Pro' };

/** Cumulative: each tier includes everything below it. */
export const TIER_FEATURES: Record<Tier, Feature[]> = {
  free: ['chat', 'care', 'tasks'],
  plus: ['chat', 'care', 'tasks', 'meetings', 'sharing', 'rooms', 'invites'],
  pro:  ['chat', 'care', 'tasks', 'meetings', 'sharing', 'rooms', 'invites', 'dashboards', 'ai_actions'],
};

/** The minimum tier that unlocks a feature (for upsell copy). */
export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  chat: 'free', care: 'free', tasks: 'free',
  meetings: 'plus', sharing: 'plus', rooms: 'plus', invites: 'plus',
  dashboards: 'pro', ai_actions: 'pro',
};

export interface Entitlement {
  tier: Tier;
  features: string[];       // optional explicit extra unlocks beyond the tier map
  appSlug: string;
  expiresAt: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = { tier: 'free', features: [], appSlug: '*', expiresAt: null };

/** Does this entitlement unlock the feature? (tier map ∪ explicit feature grants) */
export function tierHas(ent: Entitlement, feature: Feature): boolean {
  return TIER_FEATURES[ent.tier]?.includes(feature) || ent.features.includes(feature);
}
