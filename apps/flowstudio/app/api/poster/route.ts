import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { safeUnderStudio, studioRoot } from '../../../lib/paths';
import { run } from '../../../src/modules/edit/util';

export const runtime = 'nodejs';

// GET /api/poster?path=<mp4>&t=<sec> — a cached single-frame JPG poster via ffmpeg.
export async function GET(req: NextRequest) {
  const p = safeUnderStudio(req.nextUrl.searchParams.get('path') || '');
  if (!p) return new Response('bad path', { status: 400 });
  let s;
  try {
    s = await stat(p);
  } catch {
    return new Response('not found', { status: 404 });
  }
  const at = req.nextUrl.searchParams.get('t') || '1';
  const key = createHash('sha1').update(`${p}:${s.mtimeMs}:${at}`).digest('hex').slice(0, 16);
  const cacheDir = join(studioRoot(), '.cache', 'posters');
  await mkdir(cacheDir, { recursive: true });
  const out = join(cacheDir, `${key}.jpg`);
  if (!existsSync(out)) {
    try {
      await run(process.env.FFMPEG_BIN || 'ffmpeg', ['-y', '-ss', String(at), '-i', p, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', out]);
    } catch {
      return new Response('poster failed', { status: 500 });
    }
  }
  const buf = await readFile(out);
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' } });
}
