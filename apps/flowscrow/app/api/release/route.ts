import { NextResponse, type NextRequest } from 'next/server';
import { authClient } from '@/lib/supabase/server';

// Counsel/escrow release (C2). Requires status 'cleared'; flips documents released.
// Counsel-only; enforced in the RPC.
export async function POST(req: NextRequest) {
  const { dealId } = await req.json().catch(() => ({}));
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 });
  const sb = await authClient();
  const { data, error } = await sb.rpc('flowscrow_release', { p_deal: dealId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, deal: data });
}
