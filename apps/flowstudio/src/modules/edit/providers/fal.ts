// ── L1 generation · fal.ai (PRIMARY) ─────────────────────────────────────────
// One key → Kling / Veo / Seedance. We swap the slug, not the integration.
import { fal } from '@fal-ai/client';
import { resolveModel } from '../models';
import { downloadTo } from '../util';
import type { Scene } from '../types';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not set — generation requires the fal.ai key (see .env.local).');
  fal.config({ credentials: key });
  configured = true;
}

/**
 * Generate one hero shot and download it locally for assembly.
 * Returns the local file path. `outDir` is where the mp4 lands.
 */
export async function genShotFal(
  scene: Scene,
  outDir: string,
  opts: { variant?: number } = {},
): Promise<{ localPath: string; url: string; model: string }> {
  ensureConfigured();
  const model = resolveModel(scene.model);
  if (model.provider !== 'fal') {
    throw new Error(`genShotFal called with non-fal model '${scene.model}' (${model.provider}).`);
  }

  const res = await fal.subscribe(model.slug, {
    input: {
      prompt: scene.prompt,
      aspect_ratio: scene.ratio ?? '9:16',
      duration: scene.seconds,
    },
    logs: true,
  });

  // fal returns shapes that vary slightly by model family; probe the common ones.
  const data: any = res.data ?? res;
  const url: string | undefined = data?.video?.url ?? data?.videos?.[0]?.url ?? data?.output?.[0];
  if (!url) {
    throw new Error(`fal returned no video url for scene '${scene.id}' (model ${model.slug}).`);
  }

  const name = `${scene.id}${opts.variant != null ? `-v${opts.variant}` : ''}.mp4`;
  const localPath = await downloadTo(url, outDir, name);
  return { localPath, url, model: model.slug };
}
