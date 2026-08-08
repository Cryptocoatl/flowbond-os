// =============================================================================
// Server-side reads against the live kai_ engine (canonical fgsrc). Public data
// only (published region state + active missions) via the anon/publishable key,
// so no user session is required. Every read degrades gracefully: if env is
// missing or the DB is unreachable, the UI still renders from the seed.
// =============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SEED_VALLE_ESPEJO } from '@/lib/region';
import type { Mission, MissionCategory, RegionSummary } from './types';

function readClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** kai_get_region RPC → RegionSummary. Falls back to the local seed. */
export async function getRegion(slug: string): Promise<RegionSummary> {
  const seed: RegionSummary = {
    slug: SEED_VALLE_ESPEJO.slug,
    name: SEED_VALLE_ESPEJO.name,
    splatUrl: SEED_VALLE_ESPEJO.splatUrl,
    bounds: SEED_VALLE_ESPEJO.bounds,
    state: SEED_VALLE_ESPEJO.state,
    live: false,
  };
  const sb = readClient();
  if (!sb) return seed;
  try {
    const { data, error } = await sb.rpc('kai_get_region', { p_slug: slug });
    if (error || !data) return seed;
    const d = data as {
      slug: string;
      name: string;
      splatUrl: string;
      bounds: { lat: number; lng: number; radiusM: number };
      state: RegionSummary['state'];
    };
    return { ...d, live: true };
  } catch {
    return seed;
  }
}

const CATEGORY_BY_SLUG: Record<string, MissionCategory> = {
  'siembra-un-arbol': 'restore',
};

/** Active mission types from kai_mission_types (RLS: active are public). */
export async function listMissions(): Promise<Mission[]> {
  const sb = readClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('kai_mission_types')
      .select('slug,name,xp_reward,pulse_weight,active')
      .eq('active', true)
      .order('xp_reward', { ascending: false });
    if (error || !data) return [];
    return data.map((m) => ({
      slug: m.slug as string,
      name: m.name as string,
      xpReward: m.xp_reward as number,
      pulseWeight: m.pulse_weight as number,
      category: CATEGORY_BY_SLUG[m.slug as string] ?? 'restore',
    }));
  } catch {
    return [];
  }
}
