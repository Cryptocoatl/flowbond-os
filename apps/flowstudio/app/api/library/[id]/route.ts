import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../lib/supabase-server';
import { MEDIA_BUCKET } from '../../../../lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/library/[id] — remove a personal item (storage object + row). Both
// run under the user's session; storage + table RLS enforce ownership.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: row } = await sb.from('studio_media').select('storage_path').eq('id', id).eq('owner_fbid', user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await sb.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  const { error } = await sb.from('studio_media').delete().eq('id', id).eq('owner_fbid', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
