import { NextResponse, type NextRequest } from 'next/server';
import type { Hex } from 'viem';
import { authClient } from '@/lib/supabase/server';
import { verifyWalletSignature, attestationMessage } from '@/lib/server/siwe';

// Optional supplementary personal wallet signature. We verify the signature
// server-side against the canonical attestation message, then store only the
// address via the RPC. Never a private key.
export async function POST(req: NextRequest) {
  const { dealId, address, signature, nonce } = await req.json().catch(() => ({}));
  if (!dealId || !address || !signature || !nonce) {
    return NextResponse.json(
      { error: 'dealId, address, signature, nonce required' },
      { status: 400 },
    );
  }

  const message = attestationMessage(dealId, address, nonce);
  const valid = await verifyWalletSignature({ address, message, signature: signature as Hex });
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

  const sb = await authClient();
  const { data, error } = await sb.rpc('flowscrow_set_wallet', {
    p_deal: dealId,
    p_address: address,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, party: data });
}
