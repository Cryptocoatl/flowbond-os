import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase-middleware';

/**
 * Runs the secure Supabase session refresh on every page/route (excluding static
 * assets and the Sani Templo static film). This keeps the FBID session valid and
 * fresh server-side so protected surfaces and RLS always see a real auth.uid().
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sanitemplo|flowmap-widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|glb|json|ico|txt|xml)$).*)',
  ],
};
