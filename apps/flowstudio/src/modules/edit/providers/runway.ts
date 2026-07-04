// ── L1 generation · Runway (OPTIONAL, direct) ────────────────────────────────
// Motion brush / control-surface shots. Lazy-imported so v1 doesn't need the SDK.
//   enable:  pnpm add @runwayml/sdk   +   RUNWAYML_API_SECRET=...
import { resolveModel } from '../models';
import { downloadTo } from '../util';
import type { Scene } from '../types';

// Runway ratios are 'WIDTH:HEIGHT' pixel strings, not '9:16'. Map common ones.
const RATIO: Record<string, string> = { '9:16': '720:1280', '16:9': '1280:720', '1:1': '960:960' };

export async function genShotRunway(
  scene: Scene,
  outDir: string,
  opts: { variant?: number } = {},
): Promise<{ localPath: string; url: string; model: string }> {
  const model = resolveModel(scene.model ?? 'runway-direct');

  let RunwayML: any;
  try {
    // Optional dep: native runtime resolution only (see veo.ts).
    // @ts-ignore optional dependency, types absent until `pnpm add @runwayml/sdk`
    RunwayML = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@runwayml/sdk')).default;
  } catch {
    throw new Error("Runway provider needs '@runwayml/sdk' — run `pnpm add @runwayml/sdk`.");
  }

  const client = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET });
  // Omit promptImage → text-to-video mode.
  const task = await client.textToVideo
    .create({
      model: model.slug,
      promptText: scene.prompt,
      ratio: RATIO[scene.ratio ?? '9:16'] ?? '720:1280',
      duration: scene.seconds,
    })
    .waitForTaskOutput();

  const url: string | undefined = task?.output?.[0];
  if (!url) throw new Error(`Runway returned no video for scene '${scene.id}'.`);

  const name = `${scene.id}${opts.variant != null ? `-v${opts.variant}` : ''}.mp4`;
  const localPath = await downloadTo(url, outDir, name);
  return { localPath, url, model: model.slug };
}
