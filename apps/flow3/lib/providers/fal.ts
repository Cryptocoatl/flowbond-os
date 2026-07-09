// fal.ai adapter — cheapest + fastest generative video/upscale/music.
// Plain REST against the queue API; activates the moment FAL_KEY is set.
// Model ids are env-overridable so you can swap LTX/Wan/Kling without code.

const FAL_BASE = 'https://queue.fal.run';

export const FAL_MODELS = {
  text_to_video: process.env.FAL_MODEL_T2V || 'fal-ai/ltx-video',
  image_to_video: process.env.FAL_MODEL_I2V || 'fal-ai/wan-i2v',
  upscale: process.env.FAL_MODEL_UPSCALE || 'fal-ai/ccsr',
  music: process.env.FAL_MODEL_MUSIC || 'fal-ai/stable-audio',
};

export function falConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

function headers() {
  return { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' };
}

interface FalResult {
  url: string | null;
  raw: unknown;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Submit to the queue, poll until COMPLETED, return the output media url.
async function runModel(model: string, input: Record<string, unknown>, capMs = 180_000): Promise<FalResult> {
  if (!falConfigured()) throw new Error('fal_not_configured');

  const submit = await fetch(`${FAL_BASE}/${model}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal_submit_${submit.status}:${await submit.text()}`);
  const job = (await submit.json()) as { request_id: string; status_url?: string; response_url?: string };

  const statusUrl = job.status_url || `${FAL_BASE}/${model}/requests/${job.request_id}/status`;
  const responseUrl = job.response_url || `${FAL_BASE}/${model}/requests/${job.request_id}`;

  const deadline = Date.now() + capMs;
  while (Date.now() < deadline) {
    await sleep(2500);
    const s = await fetch(statusUrl, { headers: headers() });
    const st = (await s.json()) as { status: string };
    if (st.status === 'COMPLETED') {
      const r = await fetch(responseUrl, { headers: headers() });
      const data = (await r.json()) as Record<string, unknown>;
      return { url: extractUrl(data), raw: data };
    }
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error('fal_job_failed');
  }
  throw new Error('fal_timeout');
}

function extractUrl(data: Record<string, unknown>): string | null {
  const v = data.video as { url?: string } | undefined;
  const a = data.audio as { url?: string } | undefined;
  const imgs = data.images as Array<{ url?: string }> | undefined;
  const file = data.file as { url?: string } | undefined;
  return v?.url || a?.url || file?.url || imgs?.[0]?.url || null;
}

export function textToVideo(prompt: string, opts: { seconds?: number; aspect?: string } = {}) {
  return runModel(FAL_MODELS.text_to_video, {
    prompt,
    num_frames: Math.round((opts.seconds ?? 5) * 24),
    aspect_ratio: opts.aspect ?? '16:9',
  });
}

export function imageToVideo(imageUrl: string, prompt: string, opts: { seconds?: number } = {}) {
  return runModel(FAL_MODELS.image_to_video, {
    image_url: imageUrl,
    prompt,
    num_frames: Math.round((opts.seconds ?? 5) * 24),
  });
}

export function upscale(videoUrl: string, opts: { scale?: number } = {}) {
  return runModel(FAL_MODELS.upscale, { video_url: videoUrl, scale: opts.scale ?? 2 });
}

export function music(prompt: string, opts: { seconds?: number } = {}) {
  return runModel(FAL_MODELS.music, { prompt, seconds_total: opts.seconds ?? 20 });
}
