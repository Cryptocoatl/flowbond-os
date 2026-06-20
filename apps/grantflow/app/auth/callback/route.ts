import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Exchanges the magic-link code for a cookie session, then sends them in.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const origin = req.nextUrl.origin;
  if (code) {
    const sb = await authClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  }
  return NextResponse.redirect(`${origin}/claudia`);
}
