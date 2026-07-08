import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '../../../../lib/runs';

export const runtime = 'nodejs';

// GET /api/edit/status?id=run-xxx
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const run = await getRun(id);
  return NextResponse.json(run ?? { state: 'unknown' });
}
