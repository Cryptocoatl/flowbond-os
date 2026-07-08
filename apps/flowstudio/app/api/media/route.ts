import { NextRequest } from 'next/server';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { safeUnderStudio } from '../../../lib/paths';

export const runtime = 'nodejs';

// GET /api/media?path=<absolute path under ~/FlowStudio> — range-aware mp4 stream.
export async function GET(req: NextRequest) {
  const p = safeUnderStudio(req.nextUrl.searchParams.get('path') || '');
  if (!p) return new Response('bad path', { status: 400 });
  let s;
  try {
    s = await stat(p);
  } catch {
    return new Response('not found', { status: 404 });
  }
  const type = p.endsWith('.mp4') ? 'video/mp4' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
  const range = req.headers.get('range');
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    const start = m ? +m[1] : 0;
    const end = m && m[2] ? +m[2] : s.size - 1;
    const stream = Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${s.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Content-Type': type,
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(p)) as ReadableStream;
  return new Response(stream, {
    headers: { 'Content-Length': String(s.size), 'Accept-Ranges': 'bytes', 'Content-Type': type },
  });
}
