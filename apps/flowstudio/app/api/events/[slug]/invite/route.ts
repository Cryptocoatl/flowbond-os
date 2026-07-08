import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../../lib/supabase-server';
import { eventBySlug } from '../../../../../lib/flowdrop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/events/[slug]/invite — owner mints an editor invite link.
// The roster write happens inside the SECURITY DEFINER RPC flowdrop_create_invite
// (which checks ownership), so no service-role key is needed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ev = await eventBySlug(slug);
  if (!ev) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  const { data: code, error } = await sb.rpc('flowdrop_create_invite', { p_event: ev.id });
  if (error) {
    const status = error.message.includes('not_owner') ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ code, url: `${origin}/events/${slug}/join?code=${code}` });
}
