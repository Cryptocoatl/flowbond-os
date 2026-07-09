// Typed wrappers over the banoseco_* SECURITY DEFINER RPCs — the only write
// surface. Every call uses the browser Supabase client (RLS + auth.uid()).
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from './supabase/client';
import type {
  Currency,
  GuardianProfile,
  ImpactSummary,
  LeaderRow,
  Mission,
  NearbyToilet,
} from './types';

type SB = SupabaseClient;
const sb = (): SB => browserClient();

export async function nearbyToilets(
  lat: number,
  lng: number,
  radiusKm = 8,
): Promise<NearbyToilet[]> {
  const { data, error } = await sb().rpc('banoseco_nearby_toilets', {
    in_lat: lat,
    in_lng: lng,
    in_radius_km: radiusKm,
  });
  if (error) throw error;
  return (data ?? []) as NearbyToilet[];
}

/** Open missions joined with their toilet, for the ops list. */
export async function openMissions(): Promise<Mission[]> {
  const { data, error } = await sb()
    .from('banoseco_missions')
    .select(
      'id,toilet_id,kind,status,reward_xp,reward_oro,reward_points,guardian_id,opened_at,claimed_at,completed_at,proof_url,notes,toilet:banoseco_toilets(code,name,neighborhood)',
    )
    .in('status', ['open', 'claimed', 'done'])
    .order('opened_at', { ascending: true });
  if (error) throw error;
  // supabase types the embedded relation as an array; normalize to a single object
  return (data ?? []).map((m) => {
    const t = m as unknown as Mission & { toilet: Mission['toilet'] | Mission['toilet'][] };
    return { ...t, toilet: Array.isArray(t.toilet) ? t.toilet[0] ?? null : t.toilet };
  }) as Mission[];
}

export async function impactSummary(): Promise<ImpactSummary | null> {
  const { data, error } = await sb().rpc('banoseco_impact_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as ImpactSummary | null;
}

export async function leaderboard(limit = 10): Promise<LeaderRow[]> {
  const { data, error } = await sb().rpc('banoseco_leaderboard', { in_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function guardianProfile(): Promise<GuardianProfile | null> {
  const { data, error } = await sb().rpc('banoseco_guardian_profile');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as GuardianProfile | null;
}

export async function guardianBalance(currency: Currency = 'oro'): Promise<number> {
  const { data, error } = await sb().rpc('banoseco_guardian_balance', {
    in_user_id: undefined,
    in_currency: currency,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Register this user's connection to the app (flowbond_app_connections). */
export async function connectApp(): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_connect');
  if (error) throw error;
  return data as string;
}

export async function becomeGuardian(displayName?: string): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_become_guardian', {
    in_display_name: displayName ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function refillEnergy(): Promise<number> {
  const { data, error } = await sb().rpc('banoseco_refill_energy', {
    in_full: 8,
    in_after_hours: 20,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function claimMission(missionId: string): Promise<boolean> {
  const { data, error } = await sb().rpc('banoseco_claim_mission', { in_mission_id: missionId });
  if (error) throw error;
  return Boolean(data);
}

export async function completeMission(
  missionId: string,
  proofUrl?: string,
): Promise<{ oro: number; xp: number }> {
  const { data, error } = await sb().rpc('banoseco_complete_mission', {
    in_mission_id: missionId,
    in_proof_url: proofUrl ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? { oro: 0, xp: 0 }) as { oro: number; xp: number };
}

export async function recordDonation(
  toiletId: string,
  amountMxn: number,
  method = 'qr',
): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_record_donation', {
    in_toilet_id: toiletId,
    in_amount_mxn: amountMxn,
    in_method: method,
  });
  if (error) throw error;
  return data as string;
}
