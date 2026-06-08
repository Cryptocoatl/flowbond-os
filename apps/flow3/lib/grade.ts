// FlowStudio grade engine — ONE source of truth for the look, used by both
// the live preview (CSS filters + overlay) and the export pipeline (canvas).
// Real, deterministic color/light operations applied to the user's own footage.

export type AspectKey = '16:9' | '9:16' | '1:1' | '2.39:1' | '4:5';
export type GradeKey = 'none' | 'cinematic' | 'warm' | 'cool' | 'noir' | 'vivid' | 'vintage';
export type TransitionKey = 'cut' | 'crossfade' | 'dip';
export type ResolutionKey = '720p' | '1080p' | '4k';

export interface EditState {
  aspect: AspectKey;
  grade: GradeKey;
  brightness: number; // 1 = neutral (0.5–1.5)
  contrast: number; // 1 = neutral (0.5–1.6)
  saturation: number; // 1 = neutral (0–2)
  temperature: number; // -100 cool … +100 warm
  vignette: number; // 0–1
  grain: number; // 0–1
  letterbox: boolean;
  transition: TransitionKey;
  resolution: ResolutionKey;
}

export const ASPECTS: Record<AspectKey, { w: number; h: number; label: string }> = {
  '16:9': { w: 16, h: 9, label: 'Wide 16:9' },
  '9:16': { w: 9, h: 16, label: 'Vertical 9:16' },
  '1:1': { w: 1, h: 1, label: 'Square 1:1' },
  '2.39:1': { w: 2.39, h: 1, label: 'Scope 2.39' },
  '4:5': { w: 4, h: 5, label: 'Portrait 4:5' },
};

export const RES_HEIGHT: Record<ResolutionKey, number> = {
  '720p': 720,
  '1080p': 1080,
  '4k': 2160,
};

// Each grade is a starting recipe + an overlay tone (split-tone shadows/highlights).
export const GRADES: Record<
  GradeKey,
  {
    label: string;
    state: Partial<EditState>;
    shadow: string; // overlay color toward shadows
    highlight: string; // overlay color toward highlights
    overlayAlpha: number;
  }
> = {
  none: { label: 'Flat', state: { brightness: 1, contrast: 1, saturation: 1, temperature: 0 }, shadow: '#000000', highlight: '#000000', overlayAlpha: 0 },
  cinematic: { label: 'Cinematic', state: { brightness: 1.02, contrast: 1.18, saturation: 1.12, temperature: 12 }, shadow: '#0e3a4f', highlight: '#f3b34d', overlayAlpha: 0.45 },
  warm: { label: 'Golden', state: { brightness: 1.05, contrast: 1.08, saturation: 1.15, temperature: 55 }, shadow: '#3a1d05', highlight: '#ffcf7a', overlayAlpha: 0.4 },
  cool: { label: 'Glacier', state: { brightness: 1.0, contrast: 1.12, saturation: 1.05, temperature: -50 }, shadow: '#06283d', highlight: '#bfe7ff', overlayAlpha: 0.4 },
  noir: { label: 'Noir', state: { brightness: 1.0, contrast: 1.3, saturation: 0, temperature: 0 }, shadow: '#000000', highlight: '#ffffff', overlayAlpha: 0.2 },
  vivid: { label: 'Vivid', state: { brightness: 1.05, contrast: 1.15, saturation: 1.5, temperature: 5 }, shadow: '#1a0b3a', highlight: '#fff0a0', overlayAlpha: 0.25 },
  vintage: { label: 'Super-8', state: { brightness: 1.06, contrast: 0.95, saturation: 0.85, temperature: 38 }, shadow: '#2a1a0a', highlight: '#ffe3b0', overlayAlpha: 0.5 },
};

export const DEFAULT_EDIT: EditState = {
  aspect: '16:9',
  grade: 'cinematic',
  brightness: 1.02,
  contrast: 1.18,
  saturation: 1.12,
  temperature: 12,
  vignette: 0.45,
  grain: 0.18,
  letterbox: false,
  transition: 'crossfade',
  resolution: '1080p',
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}

/** Apply a grade preset onto a state (preset values win, manual extras kept). */
export function applyGrade(state: EditState, grade: GradeKey): EditState {
  const g = GRADES[grade];
  return { ...state, grade, ...g.state } as EditState;
}

/** CSS filter string for the live <video>/<img> preview AND canvas ctx.filter. */
export function filterString(s: EditState): string {
  const t = s.temperature;
  const sepia = t > 0 ? `sepia(${(t / 100) * 0.35})` : '';
  const hue = `hue-rotate(${(-t * 0.12).toFixed(1)}deg)`;
  return `brightness(${s.brightness}) contrast(${s.contrast}) saturate(${s.saturation}) ${sepia} ${hue}`.trim();
}

/** Background gradient for the split-tone overlay div (soft-light blend). */
export function overlayGradient(s: EditState): { background: string; opacity: number } {
  const g = GRADES[s.grade];
  return {
    background: `linear-gradient(125deg, ${g.shadow} 0%, transparent 45%, ${g.highlight} 100%)`,
    opacity: g.overlayAlpha,
  };
}
