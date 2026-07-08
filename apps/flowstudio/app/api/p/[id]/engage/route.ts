import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/p/[id]/engage — { kind: 'view'|'like'|'interaction' }.
// views are anonymous (counter only); likes/interactions require an FBID session
// and mint FlowPoints to the registered split (one mint per user, deduped in SQL).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };
  if (!['view', 'like', 'interaction'].includes(kind ?? '')) {
    return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
  }
  const sb = await serverClient();
  const { data, error } = await sb.rpc('flowstudio_engage', { p_publication: id, p_kind: kind });
  if (error) {
    const status = error.message.includes('auth_required') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}
