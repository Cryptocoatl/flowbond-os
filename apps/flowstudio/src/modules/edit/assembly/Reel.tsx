// ── L3 assembly · Remotion seam (NOT wired in v1) ────────────────────────────
// Remotion is the doc's PRIMARY assembly engine, deferred because it needs a
// paid company license for a for-profit org (FlowBond): ~$25/seat/mo with a
// $100/mo or $1000/yr minimum (verified 2026-06-19). The FFmpeg path
// (assembly/ffmpeg.ts) ships the same beat-synced reel for free today.
//
// To activate later:
//   1) pnpm add remotion @remotion/cli @remotion/player @remotion/bundler \
//        @remotion/renderer @remotion/media-utils
//   2) Replace this file's body with a real <Composition> (1080x1920, 30fps):
//        - one <Sequence> per clip, durationInFrames = round(slot * fps)
//        - cut points = beatmap.downbeats (same computeSlots() output as ffmpeg)
//        - burn captions from the chorus section via <AbsoluteFill>
//      and render headlessly with @remotion/bundler + @remotion/renderer.
//   3) Route engine:'remotion' through assembly/render.ts.
//
// Kept dependency-free on purpose so a fal-only v1 typechecks and builds without
// the Remotion packages installed.
import type { BeatMap } from '../types';

export interface ReelProps {
  clips: { path: string; seconds: number }[];
  beatmap: BeatMap;
  audioPath: string;
  captions?: { text: string; start: number; end: number }[];
  width?: number; // 1080
  height?: number; // 1920
  fps?: number; // 30
}

/** Intended composition metadata — consumed once a real Remotion root exists. */
export const REEL_COMPOSITION = {
  id: 'flowstudio-reel',
  width: 1080,
  height: 1920,
  fps: 30,
} as const;
