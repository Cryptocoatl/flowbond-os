'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendMagicLink } from '@/lib/fbid';
import { Totem } from '@/components/hud/Totem';

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const linkError = params.get('error') === 'link';

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
    <div className="authwrap panel">
      <Totem className="totembig" uid="login" />
      <span className="eyebrow">Entra a la red</span>
      <h1 className="bs-h1" style={{ fontSize: 'clamp(28px,6vw,44px)' }}>
        Sé <span className="jade">guardián</span> del territorio.
      </h1>

      <div className="authcard">
        {sent ? (
          <p className="lede" style={{ margin: '0 auto' }}>
            Te enviamos un enlace mágico a <b>{email}</b>. Ábrelo en este dispositivo para entrar.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p className="lede" style={{ margin: '0 auto 6px' }}>
              Un enlace mágico por correo. Sin contraseñas — tu identidad FBID, una sola vez.
            </p>
            <input
              className="field"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Correo electrónico"
            />
            <button className="act gold" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Enviando…' : 'Enviar enlace mágico'}
            </button>
            {(err || linkError) && (
              <p className="note" style={{ color: 'var(--bs-clay)' }}>
                {err ?? 'Ese enlace expiró. Pide uno nuevo.'}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="panel" />}>
      <LoginInner />
    </Suspense>
  );
}
