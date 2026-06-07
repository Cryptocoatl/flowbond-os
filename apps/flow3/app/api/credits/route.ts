import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/credits — balance + recent ledger for the signed-in steward.
// First call also claims the one-time welcome grant (idempotent in the DB).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: balance, error: balanceError } = await supabase.rpc('fc_claim_welcome');
  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  const { data: ledger } = await supabase
    .from('flowcredits_ledger')
    .select('id, delta, kind, reason, app_slug, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ balance, ledger: ledger ?? [] });
}
