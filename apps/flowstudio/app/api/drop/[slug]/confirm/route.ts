import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../../lib/supabase-server';
import { eventBySlug } from '../../../../../lib/flowdrop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/drop/[slug]/confirm — record a contribution AFTER its bytes are uploaded.
// Inserts under the contributor's RLS session, which re-checks ownership + open event.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ev = await eventBySlug(slug);
  if (!ev) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  if (ev.status !== 'open') return NextResponse.json({ error: 'drops_closed' }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    kind?: 'photo' | 'video';
    filename?: string;
    size?: number;
    contentHash?: string;
    capturedAt?: string;
  };
  // The path must live in THIS user's folder under THIS event (defence in depth).
  if (!body.path?.startsWith(`${ev.id}/${user.id}/`)) {
    return NextResponse.json({ error: 'bad_path' }, { status: 400 });
  }
  if (body.kind !== 'photo' && body.kind !== 'video') {
    return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('flowdrop_contributions')
    .insert({
      event_id: ev.id,
      contributor_fbid: user.id,
      kind: body.kind,
      storage_path: body.path,
      content_hash: body.contentHash ?? null,
      original_filename: body.filename ?? null,
      size_bytes: body.size ?? null,
      captured_at: body.capturedAt ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
