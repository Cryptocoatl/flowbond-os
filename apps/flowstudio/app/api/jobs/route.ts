import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { jobsDir, slug } from '../../../lib/paths';
import type { EditJob } from '../../../src/modules/edit/types';

export const runtime = 'nodejs';

// GET /api/jobs — list saved job configs (file + title + scene count).
export async function GET() {
  try {
    const files = (await readdir(jobsDir())).filter((f) => f.endsWith('.json'));
    const jobs = await Promise.all(
      files.map(async (f) => {
        try {
          const j = JSON.parse(await readFile(join(jobsDir(), f), 'utf8'));
          return { file: f, title: j.title ?? f, scenes: j.scenes?.length ?? 0 };
        } catch {
          return { file: f, title: f, scenes: 0 };
        }
      }),
    );
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ jobs: [] });
  }
}

// POST /api/jobs — save a composed job to src/modules/edit/jobs/<slug>.json
export async function POST(req: NextRequest) {
  try {
    const job = (await req.json()) as EditJob;
    if (!job?.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    await mkdir(jobsDir(), { recursive: true });
    const file = `${slug(job.title)}.json`;
    await writeFile(join(jobsDir(), file), JSON.stringify(job, null, 2));
    return NextResponse.json({ file });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'save failed' }, { status: 500 });
  }
}
