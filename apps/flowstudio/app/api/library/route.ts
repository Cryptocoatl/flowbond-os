import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/library — record a personal media item after its bytes were uploaded
// (direct-to-bucket) under the user's own folder. RLS re-checks ownership.
export async function POST(req: NextRequest) {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    path?: string; kind?: 'photo' | 'video'; title?: string; size?: number; contentHash?: string;
  };
  if (!body.path?.startsWith(`${user.id}/`)) return NextResponse.json({ error: 'bad_path' }, { status: 400 });
  if (body.kind !== 'photo' && body.kind !== 'video') return NextResponse.json({ error: 'bad_kind' }, { status: 400 });

  const { data, error } = await sb
    .from('studio_media')
    .insert({
      owner_fbid: user.id,
      kind: body.kind,
      storage_path: body.path,
      title: body.title?.slice(0, 120) ?? null,
      size_bytes: body.size ?? null,
      content_hash: body.contentHash ?? null,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
