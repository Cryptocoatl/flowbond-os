import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/library/[id]/share — flip a personal item between private and shared.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { visibility } = (await req.json().catch(() => ({}))) as { visibility?: string };
  if (!['private', 'unlisted', 'public'].includes(visibility ?? '')) {
    return NextResponse.json({ error: 'bad_visibility' }, { status: 400 });
  }

  // RLS owner policy ensures the user can only flip their own rows.
  const { error } = await sb.from('studio_media').update({ visibility }).eq('id', id).eq('owner_fbid', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
