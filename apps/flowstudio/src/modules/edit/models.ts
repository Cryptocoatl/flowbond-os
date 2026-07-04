// ── Model registry (Gate-0 surface) ──────────────────────────────────────────
// Model slugs, pricing and tiers MOVE FAST. This is the ONE place to update them.
// Before a real run, confirm each slug against the live list at:
//   https://fal.ai/models   (Kling / Veo / Seedance current ids)
// A live check always beats a hardcoded string. Everything else in the pipeline
// references these keys, never raw slugs, so a slug change is a one-line edit here.
//
// Last Gate-0 review: 2026-06-19 (slugs UNVERIFIED against dashboard — the
// fal model page 404'd on automated fetch; eyeball them once before shipping).

export interface ModelDef {
  provider: 'fal' | 'veo' | 'runway';
  slug: string;
  /** Human note: what this model is best at (from ~/FlowStudio/RULES.md picks). */
  note: string;
}

export const MODEL_REGISTRY: Record<string, ModelDef> = {
  // fal.ai — PRIMARY. One key, swap the slug to switch models.
  kling: {
    provider: 'fal',
    slug: 'fal-ai/kling-video/v2/standard/text-to-video',
    note: 'Volume/price workhorse (Kling 3.0). Default for most shots.',
  },
  veo: {
    provider: 'fal',
    slug: 'fal-ai/veo3/text-to-video',
    note: 'Hero realism (Veo 3.1 via fal). Use for the money shots.',
  },
  seedance: {
    provider: 'fal',
    slug: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    note: 'Character consistency (Seedance). Use when a subject recurs.',
  },

  // Direct providers — OPTIONAL, only when their specialty is invoked.
  'veo-direct': {
    provider: 'veo',
    slug: 'veo-3.1-generate-preview', // @google/genai model id
    note: 'Veo direct — ONLY when 48kHz synced dialogue is required.',
  },
  'runway-direct': {
    provider: 'runway',
    slug: 'gen4_turbo', // @runwayml/sdk model id (bump to Gen-4.5 when GA)
    note: 'Runway — motion brush / control-surface shots.',
  },
};

export const DEFAULT_MODEL = 'kling';

/** Resolve a ModelRef (registry key OR raw slug) to a concrete model def. */
export function resolveModel(ref?: string): ModelDef {
  if (!ref) return MODEL_REGISTRY[DEFAULT_MODEL];
  if (MODEL_REGISTRY[ref]) return MODEL_REGISTRY[ref];
  // Treat an unknown ref as a raw fal slug (forward-compatible escape hatch).
  return { provider: 'fal', slug: ref, note: 'raw slug (not in registry)' };
}
