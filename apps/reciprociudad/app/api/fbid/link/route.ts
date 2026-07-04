import { NextRequest, NextResponse } from 'next/server';
import { captureJoin } from '@/lib/reciprociudad';
import { hasServiceRole } from '@/lib/supabase-server';
import type { JoinResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * POST /api/fbid/link  — the `reciprociudad_join` flow.
 *
 * Contract: { email, app, flow } → { ok, fbid }
 *
 * What this does today: validates the email and captures the join lead into the
 * `reciprociudad` schema (server-side, service role) via the `reciprociudad_join`
 * RPC, returning the lead id as `fbid`.
 *
 * Architecture note — the real Layer-0 identity:
 *   FBID = public.flowbond_users.id = auth.users.id. The sanctioned writes that
 *   mint/link that identity (`link_auth_or_create_identity()`, `activate_app(slug)`)
 *   operate on the CURRENT authenticated session (auth.uid()) — they take no
 *   email argument and cannot be driven by a service key alone. So a bare email
 *   capture is intentionally a *lead*, not a forged identity.
 *
 *   TODO(fbid): when the public auth surface is added (magic-link / OAuth via
 *   @flowbond/auth), complete the link inside the authenticated session:
 *     const sb = await serverClient();            // user JWT
 *     await sb.rpc('activate_app', { p_slug: 'reciprociudad' });  // → link_auth_or_create_identity()
 *     const { data: fbid } = await sb.rpc('current_fbid');
 *   That registers the app in `flowbond_app_connections` and returns the true FBID.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const flow = typeof body?.flow === 'string' ? body.flow : 'reciprociudad_join';

  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, fbid: null } satisfies JoinResponse, { status: 400 });
  }

  // Demo mode: no service key wired → validate and acknowledge without a write.
  if (!hasServiceRole) {
    return NextResponse.json({ ok: true, fbid: null } satisfies JoinResponse);
  }

  try {
    const fbid = await captureJoin(email, flow);
    return NextResponse.json({ ok: true, fbid } satisfies JoinResponse);
  } catch (err) {
    console.error('[reciprociudad] join capture failed:', err);
    return NextResponse.json({ ok: false, fbid: null } satisfies JoinResponse, { status: 500 });
  }
}
