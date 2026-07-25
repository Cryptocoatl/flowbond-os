// =============================================================================
// Region loader. Reads via the kai_get_region RPC (the single read contract any
// renderer uses). During Phase 0/1, before the DB migration is applied, it
// falls back to a local seed so the world can be built and demoed. The fallback
// is dev-only and never a write path.
// =============================================================================

import type { RegionVisualState } from '@flowbond/state-engine';
import type { MappingConfig } from '@flowbond/world-runtime';

export interface RegionData {
  slug: string;
  name: string;
  /** R2 URL of the region's .spz Gaussian splat */
  splatUrl: string;
  /** geofence center + radius (meters) for proof validation */
  bounds: { lat: number; lng: number; radiusM: number };
  /** current stored visual state */
  state: RegionVisualState;
  /** per-region visual mapping override, if any */
  mapping?: MappingConfig;
}

/** Dev seed for "Valle Espejo" (Tepoztlán-inspired — never labeled as such). */
export const SEED_VALLE_ESPEJO: RegionData = {
  slug: 'valle-espejo',
  name: 'Valle Espejo',
  splatUrl:
    process.env.NEXT_PUBLIC_SPLAT_URL ??
    'https://media.play.flowbond.life/valle-espejo/base.spz',
  bounds: { lat: 18.985, lng: -99.093, radiusM: 4000 },
  state: {
    vitality: 0.42,
    canopy: 0.5,
    water: 0.35,
    biodiversity: 0.3,
    communityPulse: 0.15,
  },
};

export async function getRegion(slug: string): Promise<RegionData> {
  // PHASE-2/3: replace with `supabase.rpc('kai_get_region', { p_slug: slug })`.
  // Kept as a seed until 02_migration_kai_world.sql is applied to /test.
  if (slug === SEED_VALLE_ESPEJO.slug) return SEED_VALLE_ESPEJO;
  throw new Error(`unknown region: ${slug}`);
}
