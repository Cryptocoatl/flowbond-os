// Shared shape of a garden survey proposal — produced by /api/flowgarden/survey
// and committed by /api/flowgarden/survey/apply. Nothing is written to the
// database until the gardener confirms, so this type is the contract between
// "what the model saw" and "what the human accepted".

export interface SurveyZone {
  /** Stable within one survey; used by plants/missions to reference this zone. */
  key: string
  name: string
  zone_type: string | null
  sun_exposure: 'full_sun' | 'partial_shade' | 'full_shade' | null
  soil_notes: string | null
  description: string | null
  /** Which uploaded photos this zone was read from (indices into the survey). */
  photo_indexes: number[]
  /** Rough placement on a 0–100 grid, so the map has a starting arrangement
   *  the gardener can drag into place. Not a measurement — a first guess. */
  x: number
  y: number
}

export interface SurveyPlant {
  key: string
  zone_key: string | null
  /** Everyday name the gardener would use. */
  name: string
  /** Botanical name when the model is confident enough to commit to one. */
  species: string | null
  variety: string | null
  quantity: number
  status: string
  health_status: 'excellent' | 'good' | 'stressed' | 'critical' | 'unknown'
  notes: string | null
  photo_indexes: number[]
  /** 0–1. Below ~0.6 the UI asks the gardener to confirm the identification. */
  confidence: number
}

export interface SurveyMission {
  key: string
  zone_key: string | null
  plant_key: string | null
  title: string
  description: string | null
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  /** Days from now; the apply step turns this into a real due date. */
  due_in_days: number | null
  xp_reward: number
  /** Why this mission exists — shown to the gardener so the plan is legible
   *  rather than magic. This is the difference between a to-do list and advice. */
  reason: string
}

export interface SurveyResult {
  /** One or two sentences a human would say about this garden right now. */
  summary: string
  zones: SurveyZone[]
  plants: SurveyPlant[]
  missions: SurveyMission[]
  /** Things the model could not tell from the photos and wants a photo of. */
  needs_better_photo: string[]
}

/** JSON Schema handed to Claude via output_config.format. */
export const SURVEY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'zones', 'plants', 'missions', 'needs_better_photo'],
  properties: {
    summary: { type: 'string' },
    zones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'name', 'zone_type', 'sun_exposure', 'soil_notes', 'description', 'photo_indexes', 'x', 'y'],
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          zone_type: {
            type: ['string', 'null'],
            enum: ['raised_bed', 'grounded_bed', 'container', 'greenhouse', 'nursery', 'lawn', 'compost', 'herb_garden', 'orchard', 'other', null],
          },
          sun_exposure: { type: ['string', 'null'], enum: ['full_sun', 'partial_shade', 'full_shade', null] },
          soil_notes: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          photo_indexes: { type: 'array', items: { type: 'integer' } },
          x: { type: 'integer' },
          y: { type: 'integer' },
        },
      },
    },
    plants: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'zone_key', 'name', 'species', 'variety', 'quantity', 'status', 'health_status', 'notes', 'photo_indexes', 'confidence'],
        properties: {
          key: { type: 'string' },
          zone_key: { type: ['string', 'null'] },
          name: { type: 'string' },
          species: { type: ['string', 'null'] },
          variety: { type: ['string', 'null'] },
          quantity: { type: 'integer' },
          status: {
            type: 'string',
            enum: ['seed', 'germinating', 'seedling', 'transplanted', 'established', 'flowering', 'fruiting', 'harvested', 'dormant', 'dead'],
          },
          health_status: { type: 'string', enum: ['excellent', 'good', 'stressed', 'critical', 'unknown'] },
          notes: { type: ['string', 'null'] },
          photo_indexes: { type: 'array', items: { type: 'integer' } },
          confidence: { type: 'number' },
        },
      },
    },
    missions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'zone_key', 'plant_key', 'title', 'description', 'urgency', 'due_in_days', 'xp_reward', 'reason'],
        properties: {
          key: { type: 'string' },
          zone_key: { type: ['string', 'null'] },
          plant_key: { type: ['string', 'null'] },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          due_in_days: { type: ['integer', 'null'] },
          xp_reward: { type: 'integer' },
          reason: { type: 'string' },
        },
      },
    },
    needs_better_photo: { type: 'array', items: { type: 'string' } },
  },
} as const
