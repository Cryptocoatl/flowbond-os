// FLOW3 cost model — single source of truth, used by both the studio UI
// (preview) and the /api/create route (authoritative server-side calculation).

export type CreationMode = 'dream' | 'video' | 'game' | 'world';
export type VideoQuality = 'standard' | 'cinematic' | 'epic';

export const WELCOME_GRANT = 500;

export const MODES: Record<
  CreationMode,
  { label: string; icon: string; tagline: string; base: number }
> = {
  dream: { label: 'Dream', icon: '✨', tagline: 'Images & visions', base: 15 },
  video: { label: 'Video', icon: '🎬', tagline: 'Cinematic AI film', base: 60 },
  game: { label: 'Game', icon: '🎮', tagline: 'Playable worlds', base: 350 },
  world: { label: 'World', icon: '🌌', tagline: 'Living 3D realms', base: 500 },
};

export const VIDEO_QUALITY: Record<VideoQuality, { label: string; mult: number }> = {
  standard: { label: 'Standard', mult: 1 },
  cinematic: { label: 'Cinematic', mult: 2 },
  epic: { label: 'Epic', mult: 4 },
};

export const VIDEO_DURATIONS = [10, 30, 60] as const;

export interface CreationOptions {
  quality?: VideoQuality;
  duration?: number; // seconds, video only
}

export function creationCost(mode: CreationMode, options: CreationOptions = {}): number {
  const base = MODES[mode].base;
  if (mode !== 'video') return base;

  const quality = VIDEO_QUALITY[options.quality ?? 'standard'];
  const duration = VIDEO_DURATIONS.includes(options.duration as 10 | 30 | 60)
    ? (options.duration as number)
    : 10;
  return Math.round(base * quality.mult * (duration / 10));
}
