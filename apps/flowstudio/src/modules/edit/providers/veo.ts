// ── L1 generation · Google Veo (OPTIONAL, direct) ────────────────────────────
// Use ONLY when 48kHz synced dialogue is required — otherwise go through fal.
// Lazy-imported so a fal-only v1 doesn't need @google/genai installed.
//   enable:  pnpm add @google/genai   +   GOOGLE_GENAI_API_KEY=... (or gcloud ADC)
import { resolveModel } from '../models';
import { downloadTo } from '../util';
import type { Scene } from '../types';

export async function genShotVeo(
  scene: Scene,
  outDir: string,
  opts: { variant?: number } = {},
): Promise<{ localPath: string; url: string; model: string }> {
  const model = resolveModel(scene.model ?? 'veo-direct');

  let GoogleGenAI: any;
  try {
    // Optional dep: left to native runtime resolution so the bundler never tries
    // to resolve it at build time (installed only when Veo direct is enabled).
    // @ts-ignore optional dependency, types absent until `pnpm add @google/genai`
    ({ GoogleGenAI } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@google/genai'));
  } catch {
    throw new Error("Veo provider needs '@google/genai' — run `pnpm add @google/genai`.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
  let op = await ai.models.generateVideos({
    model: model.slug,
    prompt: scene.prompt,
    config: { numberOfVideos: 1, aspectRatio: scene.ratio ?? '9:16' },
  });

  // Poll until the long-running operation resolves.
  while (!op.done) {
    await new Promise((r) => setTimeout(r, 8000));
    op = await ai.operations.getVideosOperation({ operation: op });
  }

  const url: string | undefined =
    op?.response?.generatedVideos?.[0]?.video?.uri ?? op?.response?.generatedVideos?.[0]?.video?.url;
  if (!url) throw new Error(`Veo returned no video for scene '${scene.id}'.`);

  const name = `${scene.id}${opts.variant != null ? `-v${opts.variant}` : ''}.mp4`;
  // Veo URIs may need the API key as a query param to fetch; downloadTo passes auth header.
  const localPath = await downloadTo(url, outDir, name, {
    headers: process.env.GOOGLE_GENAI_API_KEY ? { 'x-goog-api-key': process.env.GOOGLE_GENAI_API_KEY } : undefined,
  });
  return { localPath, url, model: model.slug };
}
