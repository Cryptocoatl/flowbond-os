'use client';

import { useState } from 'react';
import type { JoinResponse } from '@/lib/types';

const FBID = {
  endpoint: '/api/fbid/link',
  appSlug: 'reciprociudad',
  flow: 'reciprociudad_join',
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function JoinFBID() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [invalid, setInvalid] = useState(false);

  async function join() {
    const v = email.trim();
    if (!EMAIL.test(v)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setStatus('busy');
    try {
      const r = await fetch(FBID.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v, app: FBID.appSlug, flow: FBID.flow }),
      });
      if (!r.ok) throw new Error('bad status');
      (await r.json()) as JoinResponse;
      setStatus('ok');
      setEmail('');
    } catch {
      setStatus('err');
    }
  }

  const done = status === 'ok';

  return (
    <div className="join-in">
      <span className="eyebrow">Empieza el viaje</span>
      <h2 className="display-md">
        Siembra tu lugar <em className="agua">en el lago</em>.
      </h2>
      <p>
        Crea tu cuenta con tu identidad <b>FBID</b> y empieza a dar, recibir y regenerar. Te
        avisamos en cuanto tu zona de la ciudad se active.
      </p>
      <div className="form">
        <input
          type="email"
          placeholder="tu@correo.com"
          aria-label="Tu correo"
          autoComplete="email"
          value={email}
          disabled={done}
          onChange={(e) => {
            setEmail(e.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') join();
          }}
          style={invalid ? { borderColor: 'var(--coral)' } : undefined}
        />
        <button
          className="btn btn-sun"
          onClick={join}
          disabled={status === 'busy' || done}
          aria-live="polite"
        >
          {status === 'busy'
            ? 'Sembrando…'
            : done
              ? 'Bienvenida a la red'
              : 'Crear mi cuenta →'}
        </button>
      </div>
      <p className={`msg ok${status === 'ok' ? ' show' : ''}`} role="status">
        Listo. Tu identidad FBID quedó sembrada en la red — te escribimos pronto.
      </p>
      <p className={`msg err${status === 'err' ? ' show' : ''}`} role="alert">
        Algo falló al conectar. Inténtalo de nuevo en un momento.
      </p>
      <p className="note">Una identidad FBID, todas las posibilidades. Sin spam, sin letras chiquitas.</p>
    </div>
  );
}
