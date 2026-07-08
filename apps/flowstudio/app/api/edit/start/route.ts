import { NextRequest, NextResponse } from 'next/server';
import { startRun } from '../../../../lib/runs';
import type { EditJob } from '../../../../src/modules/edit/types';

export const runtime = 'nodejs';
export const maxDuration = 800;

// POST /api/edit/start — body { job } → kicks off the pipeline, returns { id }.
export async function POST(req: NextRequest) {
  try {
    const { job } = (await req.json()) as { job: EditJob };
    if (!job?.audioUrl || !Array.isArray(job?.scenes) || job.scenes.length === 0) {
      return NextResponse.json({ error: 'job requires audioUrl and at least one scene' }, { status: 400 });
    }
    if (!process.env.FAL_KEY && job.scenes.some((s) => !s.clipPath)) {
      return NextResponse.json({ error: 'generation needs FAL_KEY (or give every scene a clipPath)' }, { status: 503 });
    }
    const id = await startRun(job);
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed to start' }, { status: 500 });
  }
}
