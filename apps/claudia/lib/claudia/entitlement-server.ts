// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · server-side entitlement enforcement  (lib/claudia/entitlement-server.ts)
//
//  Server-only. The client-side tier gate (lib/tiers.ts via vault.can) is UX;
//  THIS is the enforcement. Route handlers call requireFeature() before doing
//  anything billable (the AI relay, notes synthesis). It:
//    • requires a valid authenticated FBID (closes the open-relay abuse vector —
//      no anonymous use of the Anthropic key), and
//    • checks the caller's tier unlocks the feature.
//
//  FAIL-OPEN on tier (not on auth): if the entitlements RPC isn't deployed yet
//  (migration 0007 not applied), we still REQUIRE auth but DON'T tier-block — so
//  shipping this never regresses already-live features. Tier enforcement turns
//  on automatically once 0007 is live. Auth is always required.
//
//  Reads identity + tier metadata only; never logs or persists content → ZDR holds.
// ════════════════════════════════════════════════════════════════════════

import { serverClient } from '../supabase-server';
import { tierHas, FREE_ENTITLEMENT, type Entitlement, type Feature } from './tiers';

export type FeatureCheck =
  | { ok: true; userId: string; ent: Entitlement | null; enforced: boolean }
  | { ok: false; status: 401 | 403; error: 'auth-required' | 'feature-locked'; tier?: string };

/** Require an authed FBID whose tier unlocks `feature`. See file header for fail-open semantics. */
export async function requireFeature(feature: Feature, appSlug = '*'): Promise<FeatureCheck> {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'auth-required' };

  const { data, error } = await sb.rpc('claudia_my_entitlement', { p_app_slug: appSlug });
  if (error) {
    // entitlements not deployed yet — auth still required, but don't tier-block.
    return { ok: true, userId: user.id, ent: null, enforced: false };
  }

  const r = Array.isArray(data) ? data[0] : null;
  const ent: Entitlement = r
    ? { tier: r.tier, features: r.features ?? [], appSlug: r.app_slug, expiresAt: r.expires_at }
    : FREE_ENTITLEMENT;

  if (!tierHas(ent, feature)) {
    return { ok: false, status: 403, error: 'feature-locked', tier: ent.tier };
  }
  return { ok: true, userId: user.id, ent, enforced: true };
}

/**
 * Is the current (cookie-authed) caller a global superadmin? Used to gate the
 * empire-aware STEWARD persona. DEFAULT-DENY: any error (e.g. grant spine not
 * deployed) returns false → the safe user persona, so a regular user is never
 * told about FlowBond.
 */
export async function isSuperadmin(): Promise<boolean> {
  try {
    const sb = await serverClient();
    const { data, error } = await sb.rpc('is_superadmin');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
