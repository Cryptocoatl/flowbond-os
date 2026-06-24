import { NextResponse, type NextRequest } from 'next/server';
import { authClient } from '@/lib/supabase/server';

// Counsel records approval (the gate). Counsel-only; enforced in the RPC. The
// recompute inside the RPC flips the deal to 'cleared' once all Phase-B confirmed.
export async function POST(req: NextRequest) {
  const { dealId } = await req.json().catch(() => ({}));
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 });
  const sb = await authClient();
  const { data, error } = await sb.rpc('flowscrow_counsel_approve', { p_deal: dealId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, deal: data });
}
