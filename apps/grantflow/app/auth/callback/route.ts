import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { authClient } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Receives the session back from the FBID hub. The hub forwards magic links as a
// `token_hash` (redeemed cross-domain with verifyOtp — no PKCE code_verifier
// needed); OAuth/PKCE still arrives as `code`. Handle both, then send them in.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = (url.searchParams.get('type') ?? 'magiclink') as EmailOtpType;
  const nextParam = url.searchParams.get('next') ?? '/claudia';
  const next = nextParam.startsWith('/') ? nextParam : '/claudia';

  const sb = await authClient();
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  } else if (tokenHash) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  } else {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
