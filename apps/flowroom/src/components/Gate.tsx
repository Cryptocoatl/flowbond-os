import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Phase = 'email' | 'code';

/**
 * The gate.
 *
 * It must be impossible to learn from this screen whether an email is on the
 * room's list, so the request always returns the same thing at roughly the
 * same speed and the copy never acknowledges the address. The membership
 * check runs in the Worker on service_role — an unauthenticated browser has
 * no database surface at all.
 */
export default function Gate({ slug, denied = false }: { slug: string; denied?: boolean }) {
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/gate/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, email: email.trim().toLowerCase() }),
      });
    } catch {
      /* Even a network failure must not become a signal. */
    }
    setBusy(false);
    setPhase('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    // Wrong code and not-a-member produce the same message, on purpose.
    if (err) setError('That code didn’t work. Check the link you were sent.');
  }

  const field =
    'w-full border-2 bg-black/45 px-4 py-3.5 text-white placeholder:text-white/35 ' +
    'transition-colors focus:outline-none';

  return (
    <main className="fixed inset-0 grid overflow-hidden md:grid-cols-[1fr_minmax(24rem,38%)]">
      {/* Photography side. No text ever sits on it. */}
      <div className="relative hidden md:block">
        <img
          src="/deck/golden-dancer.webp"
          alt=""
          aria-hidden="true"
          className="u-kb absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0" style={{ background: 'rgb(11 11 12 / 0.28)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-9">
          <p className="t-display text-[clamp(2rem,4vw,3.4rem)] leading-[0.9] text-white drop-shadow-lg">
            One move,
            <br />
            <span style={{ color: 'var(--gold)' }}>multiplied.</span>
          </p>
        </div>
      </div>

      {/* Form side. Solid ink, nothing moving, everything readable. */}
      <div className="relative flex flex-col justify-center overflow-y-auto bg-ink px-7 py-14 md:px-10">
        <div className="mx-auto w-full max-w-[24rem]">
          <p className="t-tag mb-8" style={{ color: 'var(--gold)' }}>
            1 Million Women Dance × DANZ
          </p>

          <h1 className="t-display mb-5 text-[clamp(2.4rem,6vw,3.6rem)] text-white">
            {phase === 'email' ? (
              <>
                A room
                <br />
                <span style={{ color: 'var(--gold)' }}>opened for you.</span>
              </>
            ) : (
              <>
                Check
                <br />
                <span style={{ color: 'var(--gold)' }}>your inbox.</span>
              </>
            )}
          </h1>

          {phase === 'email' ? (
            <>
              <p className="t-body mb-8">
                {denied
                  ? 'This link isn’t open on this account. Sign in with the address the invitation was sent to.'
                  : 'Enter the address your invitation was sent to and we’ll send a six-digit code. No password to set.'}
              </p>

              <form onSubmit={requestCode} className="space-y-4">
                <label className="block">
                  <span className="t-tag mb-2 block text-white/70">Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={field}
                    style={{ borderColor: 'var(--hair)' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--hair)')}
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="t-tag w-full px-6 py-4 transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--gold)', color: 'var(--ink)' }}
                >
                  {busy ? 'Sending…' : 'Send me a code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="t-body mb-8">
                If that address is on this room’s list, a six-digit code is on its way. It expires in
                an hour.
              </p>

              <form onSubmit={verify} className="space-y-4">
                <label className="block">
                  <span className="t-tag mb-2 block text-white/70">Six-digit code</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`${field} text-center font-mono text-3xl tracking-[0.4em]`}
                    style={{ borderColor: 'var(--hair)' }}
                  />
                </label>

                {error && (
                  <p role="alert" className="text-[0.9rem]" style={{ color: 'var(--rose)' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="t-tag w-full px-6 py-4 transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--gold)', color: 'var(--ink)' }}
                >
                  {busy ? 'Opening…' : 'Enter the room'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhase('email');
                    setCode('');
                    setError(null);
                  }}
                  className="t-mono w-full py-2 text-white/60 transition-colors hover:text-white"
                >
                  Use a different address
                </button>
              </form>
            </>
          )}

          <p className="t-mono mt-12 text-white/45">Not listed · not indexed · not shared</p>
        </div>
      </div>
    </main>
  );
}
