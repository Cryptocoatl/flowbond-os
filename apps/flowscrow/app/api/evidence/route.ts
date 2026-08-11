import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EVIDENCE } from '@/lib/server/evidence';

// Estefanía's private exhibit. It lives server-side on purpose: anything a
// client component imports is shipped in the public JS bundle, so gating it in
// React alone would leave the text readable in devtools by anyone who loaded
// the page — Russell included. The payload leaves this route only when the
// caller presents the vault code that resolves to her.
export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({}));
  // Codes are not a fixed six digits — Estefanía's is eight. Keep this range in
  // step with MIN_LEN/MAX_LEN in the vault component, or a valid code is turned
  // away here with a 400 while the keypad happily accepts it.
  if (typeof code !== 'string' || !/^\d{4,12}$/.test(code)) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  // Read env per call: on Workers, module scope runs before the request env exists.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await sb.rpc('flowscrow_vault_resolve', { p_code: code });
  if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 400 });

  const person = (data as { person_key: string | null }[] | null)?.[0]?.person_key ?? null;
  // Deliberately the same 404 for a bad code and for a valid non-Estefanía code:
  // a witness or Russell must not be able to learn that an exhibit exists at all.
  if (person !== 'steph') return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(
    { evidence: EVIDENCE },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
