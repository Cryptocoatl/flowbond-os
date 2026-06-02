'use client';
import { Suspense, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { browserClient } from '../../../lib/supabase';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const urlError = params.get('error');

  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState<false | 'magic' | 'reset'>(false);
  const [error, setError] = useState<string | null>(urlError ? 'That link expired — try again.' : null);
  const [pending, start] = useTransition();

  const sb = browserClient();

  // FlowBond identity is shared across every app: one auth.uid → one FBID
  // (public.flowbond_users). activate() guarantees the FBID row exists.
  async function wireFbidAndGo() {
    try {
      await sb.rpc('activate');
    } catch {
      /* trigger already created it; safe to ignore */
    }
    window.location.assign(next);
  }

  function callbackUrl() {
    const origin = window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  function onPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    start(async () => {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
      else await wireFbidAndGo();
    });
  }

  function onMagic(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    start(async () => {
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
      });
      if (error) setError(error.message);
      else setSent('magic');
    });
  }

  function onReset() {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setError(null);
    start(async () => {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl(),
      });
      if (error) setError(error.message);
      else setSent('reset');
    });
  }

  const input =
    'w-full bg-[#11131f] border border-[#242a3b] rounded-lg px-3 py-2 text-[#ece9e0] text-sm';

  if (sent)
    return (
      <p className="text-[#cfc8e8] text-sm">
        {sent === 'magic'
          ? `Check ${email} for a sign-in link.`
          : `Check ${email} for a password-reset link.`}
      </p>
    );

  return (
    <div>
      <div className="flex rounded-full border border-[#242a3b] overflow-hidden w-fit mb-5">
        {(['password', 'magic'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider ${
              mode === m ? 'bg-[#e3c07a] text-[#0a0b12]' : 'text-[#9698a8]'
            }`}
          >
            {m === 'password' ? 'Password' : 'Magic link'}
          </button>
        ))}
      </div>

      <form onSubmit={mode === 'password' ? onPassword : onMagic} className="space-y-3">
        <input
          className={input}
          type="email"
          placeholder="you@flowbond.life"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {mode === 'password' && (
          <input
            className={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        )}
        {error && <p className="text-[#d9663c] text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg py-3 disabled:opacity-50"
        >
          {pending ? 'One moment…' : mode === 'password' ? 'Log in' : 'Send magic link'}
        </button>
      </form>

      {mode === 'password' && (
        <button onClick={onReset} className="text-xs text-[#9698a8] mt-3 underline">
          Forgot / set a password
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto p-6 mt-16 text-[#ece9e0]">
      <h1 className="text-3xl font-serif mb-1">Enter AstroFlow</h1>
      <p className="text-[#9698a8] text-sm mb-6">
        One FlowBond identity, every app. Sign in to weave your stars.
      </p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
