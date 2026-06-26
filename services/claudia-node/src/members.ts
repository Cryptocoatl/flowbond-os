// ════════════════════════════════════════════════════════════════════════
//  ClaudIA node · membership  (src/members.ts)
//
//  The node serves the PRIVATE MEMBERSHIP only. It maps an incoming platform
//  sender → FBID (via 0010 channel links) and reads their SafeFlow tier (0007),
//  using the Supabase SERVICE ROLE. This is authz metadata only — no ZK content
//  is read here; the sealed vault stays device-keyed.
// ════════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const sb: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type Tier = 'free' | 'plus' | 'pro';

/** Resolve a platform sender to a member FBID, or null if not linked. */
export async function memberFor(platform: string, platformId: string): Promise<string | null> {
  const { data, error } = await sb.rpc('claudia_channel_user', { p_platform: platform, p_platform_id: platformId });
  if (error) return null;
  return (data as string) ?? null;
}

/** Redeem a one-time link code the member sent from a platform → bind + return FBID. */
export async function redeemCode(code: string, platform: string, platformId: string, display: string | null): Promise<string | null> {
  const { data, error } = await sb.rpc('claudia_redeem_channel_code', {
    p_code: code, p_platform: platform, p_platform_id: platformId, p_display: display,
  });
  if (error) return null;
  return (data as string) ?? null;
}

/** Account-wide tier for a member (service role bypasses RLS). Defaults to free. */
export async function tierFor(userId: string): Promise<Tier> {
  const { data } = await sb
    .from('flowbond_entitlements')
    .select('tier,expires_at')
    .eq('user_id', userId)
    .eq('app_slug', '*')
    .maybeSingle();
  const row = data as { tier: Tier; expires_at: string | null } | null;
  if (!row) return 'free';
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'free';
  return row.tier;
}
