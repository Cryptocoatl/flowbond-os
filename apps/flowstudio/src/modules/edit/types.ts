// ── FlowStudio · AI Video Edit — shared types ────────────────────────────────
// One job description drives the whole pipeline (L1 generation → L2 beat →
// L3 assembly → L6 provenance). Keep this the single source of truth for the
// shape that `jobs/*.json` files and `POST /api/edit/run` accept.

/** Which generation backend a scene should use. Defaults to fal (the primary). */
export type Provider = 'fal' | 'veo' | 'runway';

/** A registry key (see models.ts) OR a raw fal slug, so jobs stay future-proof
 *  when the model list moves under us. */
export type ModelRef = string;

export interface Scene {
  id: string;
  prompt: string;
  /** Clip length in seconds (generation + the slot it fills on the timeline). */
  seconds: number;
  /** Override provider/model per shot. Omit → fal + the job's default model. */
  provider?: Provider;
  model?: ModelRef;
  ratio?: string; // default '9:16'
}

/** Honest C2PA-style component labeling. NEVER "100% human". */
export interface ProvenanceComponents {
  lyrics_direction?: string; // e.g. 'humanEdits'
  audio?: string; // e.g. 'trainedAlgorithmicMedia (Suno)'
  video?: string; // e.g. 'compositeWithTrainedAlgorithmicMedia (Kling/Veo)'
}

export interface Provenance {
  fbid: string;
  components: ProvenanceComponents;
  license: string;
  proofOfHuman: boolean;
}

export interface EditJob {
  title: string;
  author: string;
  /** Local path or URL to the audio (song / stems). Drives the beat map. */
  audioUrl: string;
  ratio?: string; // default '9:16'
  /** How many alternate opening hooks to render (the first scene, re-rolled). */
  hookVariants?: number;
  scenes: Scene[];
  captions?: string;
  /** RULES.md tier (1 = cloud/public-by-design). Gates which providers may run. */
  tier?: 0 | 1 | 2;
  /** Free-text guardrails baked into every generation prompt + the review gate. */
  ipGuardrails?: string;
  provenance: Provenance;
}

// ── Beat map (L2 output) ─────────────────────────────────────────────────────
export interface BeatSection {
  start: number; // seconds
  label: string; // 'intro' | 'verse' | 'chorus' | ...
}

export interface BeatMap {
  bpm: number;
  duration: number; // seconds
  beats: number[]; // all beat onsets (seconds)
  downbeats: number[]; // bar starts — where cuts should land
  sections: BeatSection[];
  source: 'librosa' | 'vibemv' | 'manual';
}

// ── Pipeline result ──────────────────────────────────────────────────────────
export interface GeneratedClip {
  sceneId: string;
  provider: Provider;
  model: string;
  localPath: string;
  url?: string;
  seconds: number;
  variant?: number; // hook variant index, when applicable
}

export interface EditResult {
  mp4: string; // path to the assembled (and, when configured, stamped) reel
  hookVariants: string[]; // paths to alternate-hook reels
  beatmap: BeatMap;
  clips: GeneratedClip[];
  handoffDir?: string; // CapCut/DaVinci handoff package
  origoUrl?: string;
  verifyBadge?: string;
  warnings: string[];
}
