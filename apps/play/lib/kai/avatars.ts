// Avatar presets. Two kinds:
//  · 'glb'  — self-hosted rigged humanoids with embedded idle/walk anims.
//  · 'proc' — procedural characters built from Three primitives (no GLB/CDN),
//             so players get more choices immediately and offline. url = 'proc:<id>'.
// Custom Ready Player Me creation plugs in later once an RPM app subdomain exists.
import type { ProcId } from '@/components/game/ProcAvatar';

export interface AvatarPreset {
  id: string;
  name: string;
  role: string;
  /** GLB path, or 'proc:<procId>' for a procedural avatar. */
  url: string;
  kind: 'glb' | 'proc';
  scale: number;
  /** radians to add so the model faces its movement direction (rig-dependent). */
  faceOffset: number;
  emoji: string;
}

export const AVATARS: AvatarPreset[] = [
  { id: 'kai', name: 'Kai', role: 'Guardián de la selva', url: 'proc:kai', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🧒' },
  { id: 'tef', name: 'Tef', role: 'Amiga del mar', url: 'proc:tef', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🌊' },
  { id: 'niko', name: 'Niko', role: 'Inventor curioso', url: 'proc:niko', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🥽' },
  { id: 'sol', name: 'Sol', role: 'Guardiana del sol', url: 'proc:sol', kind: 'proc', scale: 1, faceOffset: 0, emoji: '☀️' },
  { id: 'luna', name: 'Luna', role: 'Viajera de estrellas', url: 'proc:luna', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🌙' },
  { id: 'terra', name: 'Terra', role: 'Amiga de la tierra', url: 'proc:terra', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🌱' },
  { id: 'lumen', name: 'Lumen', role: 'Espíritu de luz', url: 'proc:lumen', kind: 'proc', scale: 1, faceOffset: 0, emoji: '✨' },
  { id: 'pip', name: 'Pip', role: 'Robot compañero', url: 'proc:pip', kind: 'proc', scale: 1, faceOffset: 0, emoji: '🤖' },
  { id: 'explorer', name: 'Explorer', role: 'Listo para explorar', url: '/avatars/soldier.glb', kind: 'glb', scale: 1, faceOffset: Math.PI, emoji: '🧭' },
  { id: 'spirit-bot', name: 'Spirit Bot', role: 'Guardián juguetón', url: '/avatars/robot.glb', kind: 'glb', scale: 1, faceOffset: 0, emoji: '🛸' },
];

export const DEFAULT_AVATAR = AVATARS[0];

const find = (url?: string | null) => AVATARS.find((a) => a.url === url);
export const avatarScale = (url?: string | null): number => find(url)?.scale ?? 1;
export const avatarFaceOffset = (url?: string | null): number => find(url)?.faceOffset ?? 0;
export const isProc = (url?: string | null): boolean => !!url && url.startsWith('proc:');
export const procId = (url: string): ProcId => url.slice('proc:'.length) as ProcId;
