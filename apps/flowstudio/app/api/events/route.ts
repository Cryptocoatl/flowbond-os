import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase-server';
import { slugify } from '../../../lib/flowdrop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/events — { title, description? } → create an event + its drop link.
export async function POST(req: NextRequest) {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { title, description } = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const base = slugify(title) || 'event';
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;

  // Insert under the owner's session so RLS WITH CHECK (owner_fbid = auth.uid()) holds.
  const { data, error } = await sb
    .from('flowdrop_events')
    .insert({ slug, owner_fbid: user.id, title: title.trim(), description: description?.trim() || null })
    .select('slug')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slug: data.slug });
}
