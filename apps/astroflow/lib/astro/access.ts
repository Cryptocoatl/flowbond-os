import { serverClient } from '../supabase-server';
import type { AstroProfile, Chart, BirthData, Visibility } from './types';

function rowToProfile(r: any): AstroProfile {
  return {
    fbid: r.fbid,
    handle: r.handle,
    displayName: r.display_name,
    avatarColor: r.avatar_color,
    visibility: r.visibility as Visibility,
    birth: {
      date: r.birth_date, time: r.birth_time, tz: r.birth_tz,
      lat: r.birth_lat, lng: r.birth_lng, place: r.birth_place,
    } as BirthData,
    chart: r.chart as Chart,
  };
}

/**
 * Your CIRCLE — the only people your constellation should ever show: yourself,
 * people you've accepted a bond with, and people who granted you access. Never
 * strangers. (A blanket `select *` leaked every 'public' profile into everyone's
 * sky; `my_circle()` scopes it server-side via current_fbid().)
 */
export async function visibleProfiles(): Promise<AstroProfile[]> {
  const sb = await serverClient();
  const { data, error } = await sb.rpc('my_circle');
  // The home/constellation is public-facing; never hard-fail on a read error
  // (e.g. an unauthenticated visitor) — just show an empty sky.
  if (error) return [];
  return ((data ?? []) as any[])
    .sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))
    .map(rowToProfile);
}

export type ProfileLookup =
  | { status: 'ok'; profile: AstroProfile }
  | { status: 'forbidden' }   // exists but caller can't see it (private/not friend/not granted)
  | { status: 'not_found' };

/**
 * Load one profile by handle. RLS hides forbidden rows, so we distinguish a
 * genuinely missing handle from one that exists-but-is-private by a second
 * existence probe against Layer-0 users.
 */
export async function getProfileByHandle(handle: string): Promise<ProfileLookup> {
  const sb = await serverClient();
  const { data } = await sb.from('profiles').select('*').eq('handle', handle).maybeSingle();
  if (data) return { status: 'ok', profile: rowToProfile(data) };
  // RLS hid the row (or it doesn't exist). AstralFlow owns its own @handle
  // namespace (flowbond_users has no handle column), so probe astroflow.profiles
  // via a security-definer RPC to tell "private" apart from "missing".
  const { data: exists } = await sb.rpc('handle_exists', { target_handle: handle });
  return exists ? { status: 'forbidden' } : { status: 'not_found' };
}

export async function myFbid(): Promise<string | null> {
  const sb = await serverClient();
  const { data } = await sb.rpc('current_fbid');
  return (data as string) ?? null;
}

// ── Privacy layers ──────────────────────────────────────────────────────────
// can_view() (RLS) decides IF you see a profile; the share LEVEL decides HOW
// DEEP: light = big three only, standard = full chart, deep = + shadow work &
// patterns & other traditions, open_heart = everything (full transparency).
export type ShareLevel = 'light' | 'standard' | 'deep' | 'open_heart';

export const LEVEL_RANK: Record<ShareLevel, number> = {
  light: 0, standard: 1, deep: 2, open_heart: 3,
};

export const atLeast = (lvl: ShareLevel | null, min: ShareLevel) =>
  lvl !== null && LEVEL_RANK[lvl] >= LEVEL_RANK[min];

/** How deep the current caller may read this profile (null = no access). */
export async function myLevelOn(ownerFbid: string): Promise<ShareLevel | null> {
  const sb = await serverClient();
  const { data } = await sb.rpc('my_level_on', { owner: ownerFbid });
  return (data as ShareLevel) ?? null;
}

/** Consent-transparency: owners see who reads their chart (and how often). */
export async function logChartRead(ownerFbid: string, kind: 'chart' | 'reading' | 'synastry') {
  const sb = await serverClient();
  await sb.rpc('log_chart_read', { owner: ownerFbid, k: kind }).then(() => {}, () => {});
}
