// ── L1 dispatcher ────────────────────────────────────────────────────────────
// Route a scene to the right backend. fal is the default and the only one v1
// needs; veo/runway are pulled in lazily only when a scene asks for them.
import { resolveModel } from '../models';
import type { Scene } from '../types';
import { genShotFal } from './fal';

export interface ShotResult {
  localPath: string;
  url: string;
  model: string;
  provider: 'fal' | 'veo' | 'runway';
}

export async function genShot(scene: Scene, outDir: string, opts: { variant?: number } = {}): Promise<ShotResult> {
  // Explicit per-scene provider wins; otherwise infer from the model's registry entry.
  const provider = scene.provider ?? resolveModel(scene.model).provider;

  if (provider === 'veo') {
    const { genShotVeo } = await import('./veo');
    return { ...(await genShotVeo(scene, outDir, opts)), provider };
  }
  if (provider === 'runway') {
    const { genShotRunway } = await import('./runway');
    return { ...(await genShotRunway(scene, outDir, opts)), provider };
  }
  return { ...(await genShotFal(scene, outDir, opts)), provider: 'fal' };
}
