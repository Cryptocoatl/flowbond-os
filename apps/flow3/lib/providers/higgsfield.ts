// Higgsfield adapter — routes FlowStudio generation through the user's existing
// Higgsfield credit pool (the same account the local ~/FlowStudio pipeline uses).
// Plain REST against the platform API; activates the moment the key pair is set.
// Endpoints + models are env-overridable so DoP/Soul/Kling can be swapped without code.
//
// Auth (Higgsfield V2):  Authorization: Key KEY_ID:KEY_SECRET
//   set HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET, or a single HIGGSFIELD_KEY="id:secret".

const HF_BASE = process.env.HIGGSFIELD_BASE || 'https://platform.higgsfield.ai';

export const HF_PATHS = {
  text_to_video: process.env.HIGGSFIELD_T2V_PATH || '/v1/text2video/dop',
  image_to_video: process.env.HIGGSFIELD_I2V_PATH || '/v1/image2video/dop',
};

export const HF_MODELS = {
  text_to_video: process.env.HIGGSFIELD_MODEL_T2V || 'dop-turbo',
  image_to_video: process.env.HIGGSFIELD_MODEL_I2V || 'dop-turbo',
};

function credentials(): string | null {
  if (process.env.HIGGSFIELD_KEY) return process.env.HIGGSFIELD_KEY;
  const id = process.env.HIGGSFIELD_KEY_ID;
  const secret = process.env.HIGGSFIELD_KEY_SECRET;
  return id && secret ? `${id}:${secret}` : null;
}

export function higgsfieldConfigured(): boolean {
  return credentials() !== null;
}

function headers() {
  return { Authorization: `Key ${credentials()}`, 'Content-Type': 'application/json' };
}

interface HFResult {
  url: string | null;
  raw: unknown;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Submit a job, poll {base}/requests/{id}/status until completed, return the media url.
async function runJob(path: string, input: Record<string, unknown>, capMs = 240_000): Promise<HFResult> {
  if (!higgsfieldConfigured()) throw new Error('higgsfield_not_configured');

  const submit = await fetch(`${HF_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`higgsfield_submit_${submit.status}:${await submit.text()}`);
  const job = (await submit.json()) as { id?: string; request_id?: string };
  const id = job.id || job.request_id;
  if (!id) throw new Error('higgsfield_no_request_id');

  const deadline = Date.now() + capMs;
  while (Date.now() < deadline) {
    await sleep(2500);
    const s = await fetch(`${HF_BASE}/requests/${id}/status`, { headers: headers() });
    if (!s.ok) continue;
    const st = (await s.json()) as {
      status: string;
      video?: { url?: string };
      image?: { url?: string };
      results?: Array<{ url?: string }>;
    };
    if (st.status === 'completed') {
      return { url: st.video?.url || st.image?.url || st.results?.[0]?.url || null, raw: st };
    }
    if (st.status === 'failed' || st.status === 'nsfw') {
      throw new Error(`higgsfield_${st.status}`);
    }
  }
  throw new Error('higgsfield_timeout');
}

export function textToVideo(prompt: string, opts: { seconds?: number; aspect?: string } = {}) {
  return runJob(HF_PATHS.text_to_video, {
    model: HF_MODELS.text_to_video,
    prompt,
    duration: opts.seconds ?? 5,
    aspect_ratio: opts.aspect ?? '16:9',
  });
}

export function imageToVideo(imageUrl: string, prompt: string, opts: { seconds?: number } = {}) {
  return runJob(HF_PATHS.image_to_video, {
    model: HF_MODELS.image_to_video,
    prompt,
    duration: opts.seconds ?? 5,
    input_images: [{ type: 'image_url', image_url: imageUrl }],
  });
}

// Higgsfield has no generic video upscale / music endpoint in this adapter —
// the dispatcher falls back to fal for those ops when fal is configured.
export function upscale(): Promise<HFResult> {
  throw new Error('higgsfield_op_unsupported:upscale');
}
export function music(): Promise<HFResult> {
  throw new Error('higgsfield_op_unsupported:music');
}
