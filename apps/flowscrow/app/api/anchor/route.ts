import { NextResponse, type NextRequest } from 'next/server';
import { authClient } from '@/lib/supabase/server';

// Initiator records the optional on-chain anchor (C3). The wallet signs + pays
// client-side; this only stores tx_hash + package_hash. Initiator-only; enforced
// in the RPC. Nothing sensitive on-chain.
export async function POST(req: NextRequest) {
  const { dealId, txHash, packageHash, chain } = await req.json().catch(() => ({}));
  if (!dealId || !txHash || !packageHash) {
    return NextResponse.json({ error: 'dealId, txHash, packageHash required' }, { status: 400 });
  }
  const sb = await authClient();
  const { data, error } = await sb.rpc('flowscrow_record_anchor', {
    p_deal: dealId,
    p_tx_hash: txHash,
    p_package_hash: packageHash,
    p_chain: chain ?? 'base',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, anchor: data });
}
