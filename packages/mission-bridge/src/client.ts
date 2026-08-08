// =============================================================================
// MissionBridgeClient — typed wrapper over the kai_* RPCs.
// Reads via kai_get_region / views; writes via RPC only. A UE or console client
// would call the identical RPCs — no business logic lives here.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Proof, ProofStatus, ProofSubmission } from './types';

export class MissionBridgeClient {
  constructor(private readonly sb: SupabaseClient) {}

  /** Submit a proof. RPC enforces geofence, one-pending-per-day, dup-hash. */
  async submitProof(input: ProofSubmission): Promise<{ proofId: string }> {
    const { data, error } = await this.sb.rpc('kai_submit_proof', {
      p_region_slug: input.regionSlug,
      p_mission_slug: input.missionSlug,
      p_lat: input.lat,
      p_lng: input.lng,
      p_performed_at: new Date(input.performedAt).toISOString(),
      p_media_key: input.mediaKey,
      p_media_hash: input.mediaHash,
    });
    if (error) throw new Error(`kai_submit_proof: ${error.message}`);
    return { proofId: data as string };
  }

  /**
   * Validate (approve/reject) a proof. RPC enforces validator ≠ submitter and,
   * on approval, applies the bloom delta + grants soulbound XP atomically.
   */
  async validateProof(
    proofId: string,
    decision: Extract<ProofStatus, 'validated' | 'rejected'>,
    note?: string,
  ): Promise<void> {
    const { error } = await this.sb.rpc('kai_validate_proof', {
      p_proof_id: proofId,
      p_decision: decision,
      p_note: note ?? null,
    });
    if (error) throw new Error(`kai_validate_proof: ${error.message}`);
  }

  /** List proofs awaiting validation (admin panel). RLS gates visibility. */
  async pendingProofs(regionSlug: string): Promise<Proof[]> {
    const { data, error } = await this.sb
      .from('kai_proofs_admin')
      .select('*')
      .eq('region_slug', regionSlug)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });
    if (error) throw new Error(`pendingProofs: ${error.message}`);
    return (data ?? []) as unknown as Proof[];
  }
}
