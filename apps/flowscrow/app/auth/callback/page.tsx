'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase/client';

// Client-side FBID callback. Supabase magic links can land here in three shapes:
//   • ?code=…                (PKCE — from the on-site form)
//   • #access_token=…        (implicit — fragment, unreadable by a server route)
//   • ?token_hash=…&type=…   (verify-style)
// Handling it on the client covers all three deterministically (a server route
// can't see the fragment — that was the "missing code and token_hash" failure).
// After a session exists we register the app via activate_app('flowscrow') and
// land on `next`.
function CallbackInner() {
  const router = useRouter();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    const sb = browserClient();
    (async () => {
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next') || '/dashboard';
      const safeNext = next.startsWith('/') ? next : '/dashboard';

      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');
      const type = (url.searchParams.get('type') as EmailOtpType | null) ?? 'magiclink';
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await sb.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        }
      } catch {
        /* fall through to the session check below */
      }

      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session) {
        setMsg('That link expired or was already used. Redirecting…');
        router.replace('/login?error=auth_failed');
        return;
      }

      // Bootstrap the FBID identity + register the app connection. Idempotent;
      // never block login if it hiccups.
      try {
        await sb.rpc('activate_app', { p_app_slug: 'flowscrow' });
      } catch {
        /* non-fatal */
      }
      router.replace(safeNext);
    })();
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <span className="gold" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          FlowScrow
        </span>
        <p style={{ marginTop: 10, fontSize: 14, color: '#cfe0d2' }}>{msg}</p>
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh' }} />}>
      <CallbackInner />
    </Suspense>
  );
}
