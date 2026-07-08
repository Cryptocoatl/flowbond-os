import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /events/[slug]/join?code=… — accept an editor invite, then land on the pool.
// Acceptance runs through the SECURITY DEFINER RPC flowdrop_accept_invite.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = new URL(req.url).searchParams.get('code') ?? '';
  const origin = new URL(req.url).origin;
  const here = `/events/${slug}/join?code=${encodeURIComponent(code)}`;

  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login?next=${encodeURIComponent(here)}`);

  if (code) {
    // Best-effort: a bad/claimed code just lands the user on the event page.
    await sb.rpc('flowdrop_accept_invite', { p_slug: slug, p_code: code });
  }
  return NextResponse.redirect(`${origin}/events/${slug}`);
}
