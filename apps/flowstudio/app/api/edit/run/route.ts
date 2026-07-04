import { NextRequest, NextResponse } from 'next/server';
import { runEdit } from '../../../../src/modules/edit/pipeline';
import type { EditJob } from '../../../../src/modules/edit/types';

// Generation + ffmpeg assembly is long-running; keep this off the edge runtime.
export const runtime = 'nodejs';
export const maxDuration = 800;

// POST /api/edit/run — body is an EditJob (see jobs/este-mundial.json).
// Returns the assembled reel path, hook variants, beat map, and Origo verify URL.
export async function POST(req: NextRequest) {
  try {
    const job = (await req.json()) as EditJob;
    if (!job?.audioUrl || !Array.isArray(job?.scenes) || job.scenes.length === 0) {
      return NextResponse.json({ error: 'job requires audioUrl and at least one scene' }, { status: 400 });
    }
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'generation not configured (missing FAL_KEY)' }, { status: 503 });
    }
    const result = await runEdit(job);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'edit run failed' }, { status: 500 });
  }
}
