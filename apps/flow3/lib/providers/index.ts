// Provider dispatcher — one seam the API route calls, so swapping the generative
// backend is an env flag, not a code change.
//
//   GEN_PROVIDER=higgsfield | fal   (explicit)
//   unset → auto: prefer Higgsfield if its keys are present, else fal.
//
// Higgsfield covers text/image-to-video; upscale + music fall back to fal.

import * as fal from './fal';
import * as hf from './higgsfield';
import type { Operation } from '../pricing';

export type Provider = 'higgsfield' | 'fal';

export interface GenResult {
  url: string | null;
  raw: unknown;
  provider: Provider;
  model: string;
}

export function activeProvider(): Provider {
  const forced = process.env.GEN_PROVIDER as Provider | undefined;
  if (forced === 'higgsfield' || forced === 'fal') return forced;
  return hf.higgsfieldConfigured() ? 'higgsfield' : 'fal';
}

export function anyConfigured(): boolean {
  return hf.higgsfieldConfigured() || fal.falConfigured();
}

interface GenInput {
  op: Operation;
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  seconds?: number;
  aspect?: string;
}

export async function generate(input: GenInput): Promise<GenResult> {
  const { op, prompt = '', imageUrl = '', videoUrl = '', seconds = 5, aspect } = input;
  const provider = activeProvider();

  // upscale + music: only fal implements them — route there regardless of the
  // primary provider, as long as a fal key exists.
  const falOnly = op === 'upscale' || op === 'music';
  const useHf = provider === 'higgsfield' && hf.higgsfieldConfigured() && !falOnly;

  if (useHf) {
    let r: { url: string | null; raw: unknown };
    let model = hf.HF_MODELS.text_to_video;
    if (op === 'text_to_video') { model = hf.HF_MODELS.text_to_video; r = await hf.textToVideo(prompt, { seconds, aspect }); }
    else if (op === 'image_to_video') { model = hf.HF_MODELS.image_to_video; r = await hf.imageToVideo(imageUrl, prompt, { seconds }); }
    else throw new Error(`higgsfield_op_unsupported:${op}`);
    return { ...r, provider: 'higgsfield', model };
  }

  if (!fal.falConfigured()) throw new Error('no_provider_configured');
  let r: { url: string | null; raw: unknown };
  let model = fal.FAL_MODELS.text_to_video;
  if (op === 'text_to_video') { model = fal.FAL_MODELS.text_to_video; r = await fal.textToVideo(prompt, { seconds, aspect }); }
  else if (op === 'image_to_video') { model = fal.FAL_MODELS.image_to_video; r = await fal.imageToVideo(imageUrl, prompt, { seconds }); }
  else if (op === 'upscale') { model = fal.FAL_MODELS.upscale; r = await fal.upscale(videoUrl); }
  else if (op === 'music') { model = fal.FAL_MODELS.music; r = await fal.music(prompt, { seconds }); }
  else throw new Error(`invalid_op:${op}`);
  return { ...r, provider: 'fal', model };
}
