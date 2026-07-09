// Shotstack adapter — server render of the edit timeline → real MP4 with
// audio, transitions and any resolution. Activates when SHOTSTACK_KEY is set.
// Uses the free 'stage' sandbox unless SHOTSTACK_ENV=v1 (production).
import { type EditState } from '../grade';
import type { Operation } from '../pricing';

const ENV = process.env.SHOTSTACK_ENV || 'stage';
const BASE = `https://api.shotstack.io/${ENV}`;

export function shotstackConfigured(): boolean {
  return Boolean(process.env.SHOTSTACK_KEY);
}

function headers() {
  return { 'x-api-key': process.env.SHOTSTACK_KEY as string, 'Content-Type': 'application/json' };
}

export interface RenderClip {
  src: string; // public/signed URL of the uploaded clip
  type: 'video' | 'image';
  length: number; // seconds
}

const RES_SIZE: Record<EditState['resolution'], 'sd' | 'hd' | '1080'> = {
  '720p': 'hd',
  '1080p': '1080',
  '4k': '1080', // Shotstack stage caps at 1080; production supports higher
};

const TRANSITION = (t: EditState['transition']) => (t === 'crossfade' ? 'fade' : t === 'dip' ? 'fade' : undefined);

// Translate our EditState + ordered clips into a Shotstack edit JSON.
export function buildEdit(clips: RenderClip[], edit: EditState, soundtrack?: string) {
  const aspectRatio = edit.aspect === '9:16' ? '9:16' : edit.aspect === '1:1' ? '1:1' : edit.aspect === '4:5' ? '9:16' : '16:9';

  let start = 0;
  const items = clips.map((c) => {
    const item = {
      asset: { type: c.type === 'image' ? 'image' : 'video', src: c.src },
      start,
      length: c.length,
      fit: 'cover',
      transition: TRANSITION(edit.transition) ? { in: TRANSITION(edit.transition), out: TRANSITION(edit.transition) } : undefined,
      // Shotstack filters (valid names only): approximate our grade.
      filter: edit.grade === 'noir' ? 'greyscale'
        : edit.grade === 'vintage' ? 'muted'
        : edit.grade === 'vivid' ? 'boost'
        : undefined,
    };
    start += c.length;
    return item;
  });

  const tracks: Array<{ clips: unknown[] }> = [{ clips: items }];
  if (soundtrack) tracks.push({ clips: [{ asset: { type: 'audio', src: soundtrack }, start: 0, length: start }] });

  return {
    timeline: { background: '#000000', tracks },
    // resolution preset only — DON'T also send `size` (Shotstack rejects both at once)
    output: { format: 'mp4', aspectRatio, resolution: RES_SIZE[edit.resolution] },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function render(clips: RenderClip[], edit: EditState, soundtrack?: string, capMs = 240_000): Promise<{ url: string | null; id: string }> {
  if (!shotstackConfigured()) throw new Error('shotstack_not_configured');

  const body = buildEdit(clips, edit, soundtrack);
  const submit = await fetch(`${BASE}/render`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!submit.ok) throw new Error(`shotstack_submit_${submit.status}:${await submit.text()}`);
  const { response } = (await submit.json()) as { response: { id: string } };
  const id = response.id;

  const deadline = Date.now() + capMs;
  while (Date.now() < deadline) {
    await sleep(3000);
    const s = await fetch(`${BASE}/render/${id}`, { headers: headers() });
    const { response: r } = (await s.json()) as { response: { status: string; url?: string } };
    if (r.status === 'done') return { url: r.url ?? null, id };
    if (r.status === 'failed') throw new Error('shotstack_failed');
  }
  throw new Error('shotstack_timeout');
}

export const RENDER_OP: Operation = 'render';
