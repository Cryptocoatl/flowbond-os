'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendMagicLink } from '@/lib/fbid';

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const authError = params.get('error');

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await sendMagicLink(email, next);
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <span className="gold" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          FlowScrow
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: '6px 0 4px', lineHeight: 1.1 }}>
          Conditional-release escrow
        </h1>
        <p style={{ fontSize: 13.5, color: '#9fb0a4', margin: '0 0 20px', lineHeight: 1.55 }}>
          The closing releases its documents only when every task is completed and independently
          verified. Sign in with your FBID to see your deal.
        </p>

        {sent ? (
          <p style={{ fontSize: 14, color: '#cfe0d2', lineHeight: 1.6 }}>
            A magic link is on its way to <b>{email}</b>. Open it on this device to continue.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="field"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
            <button className="btn btn-gold" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send magic link'}
            </button>
            {(err || authError) && (
              <p style={{ fontSize: 12.5, color: '#d98c7a', margin: 0 }}>
                {err ?? 'That link expired. Request a new one.'}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh' }} />}>
      <LoginInner />
    </Suspense>
  );
}
