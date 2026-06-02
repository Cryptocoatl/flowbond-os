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

/** All profiles the caller is permitted to see (RLS-filtered). */
export async function visibleProfiles(): Promise<AstroProfile[]> {
  const sb = await serverClient();
  const { data, error } = await sb.from('profiles').select('*').order('display_name');
  // The home/constellation is public-facing; never hard-fail on a read error
  // (e.g. an unauthenticated visitor) — just show an empty sky.
  if (error) return [];
  return (data ?? []).map(rowToProfile);
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
  // RLS hid the row (or it doesn't exist). AstroFlow owns its own @handle
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
