'use client';

import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase-browser';
import { richKey } from '@/lib/rich';

/**
 * FBID login — REAL Layer-0 identity, passwordless, inline (no hub dependency).
 *
 * Onboard with WHATEVER you have — email OR phone (SMS). Both mint the same FBID:
 *   email: signInWithOtp({email})  → 8-digit code → verifyOtp(type:'email')
 *   phone: signInWithOtp({phone})  → 6-digit code → verifyOtp(type:'sms')
 *   → activate_app('reciprociudad')  (mints FBID + registers app connection)
 *
 * Phone is designed for the oldest handsets: just a number + a code, no app,
 * no email. The phone tab shows only when SMS is provisioned (NEXT_PUBLIC_PHONE_LOGIN=1).
 */
const SLUG = 'reciprociudad';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ENABLED = process.env.NEXT_PUBLIC_PHONE_LOGIN === '1';

type Channel = 'email' | 'phone';
type Step = 'start' | 'code' | 'done';

/** Normalize to E.164, defaulting to Mexico (+52) when no country code is given. */
function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[^\d+]/g, '');
  if (!s) return null;
  if (!s.startsWith('+')) s = s.startsWith('52') ? `+${s}` : `+52${s}`;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

export default function JoinFBID({ copy }: { copy: Record<string, string> }) {
  const [channel, setChannel] = useState<Channel>('email');
  const [step, setStep] = useState<Step>('start');
  const [value, setValue] = useState(''); // email or phone as typed
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState('');

  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          setIdentity(data.session.user.email ?? data.session.user.phone ?? '');
          setStep('done');
        }
      })
      .catch(() => {});
  }, []);

  async function signOut() {
    setBusy(true);
    await browserClient().auth.signOut();
    setBusy(false);
    setIdentity('');
    setCode('');
    setValue('');
    setStep('start');
  }

  async function sendCode() {
    setError('');
    const sb = browserClient();
    if (channel === 'email') {
      const v = value.trim();
      if (!EMAIL.test(v)) return setError('Escribe un correo válido.');
      setBusy(true);
      const { error } = await sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true } });
      setBusy(false);
      if (error) return setError('No pudimos enviar el código. Inténtalo de nuevo.');
    } else {
      const phone = normalizePhone(value);
      if (!phone) return setError('Escribe un celular válido (ej. 55 1234 5678).');
      setValue(phone);
      setBusy(true);
      const { error } = await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
      setBusy(false);
      if (error) return setError('No pudimos enviar el SMS. Revisa el número e inténtalo.');
    }
    setStep('code');
  }

  async function verify() {
    const token = code.replace(/\D/g, '');
    if (token.length < 4) return setError('Escribe el código que te llegó.');
    setError('');
    setBusy(true);
    const sb = browserClient();
    const { data, error } =
      channel === 'email'
        ? await sb.auth.verifyOtp({ email: value.trim(), token, type: 'email' })
        : await sb.auth.verifyOtp({ phone: value.trim(), token, type: 'sms' });
    if (error) {
      setBusy(false);
      return setError('Código incorrecto o expirado. Pídelo de nuevo.');
    }
    setIdentity(data.user?.email ?? data.user?.phone ?? value.trim());
    try {
      await sb.rpc('activate_app', { p_app_slug: SLUG });
    } catch {
      /* non-critical */
    }
    setBusy(false);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <div className="join-in">
        <span className="eyebrow">{copy['unete.doneEyebrow']}</span>
        <h2 className="display-md">{richKey(copy, 'unete.doneTitle')}</h2>
        <p>
          Tu identidad <b>FBID</b> está activa: {identity && <b style={{ color: 'var(--miel)' }}>{identity}</b>}{' '}
          es ahora tu llave única para todo el ecosistema FlowBond — sin contraseñas, tú decides qué
          compartes.
        </p>
        <p>{richKey(copy, 'unete.doneNext')}</p>
        <div className="hero-cta" style={{ marginTop: 8 }}>
          <a href="#red" className="btn btn-sun">
            Registrar mi nodo →
          </a>
          <button className="btn btn-ghost-l" onClick={signOut} disabled={busy}>
            {busy ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    );
  }

  const isPhone = channel === 'phone';

  return (
    <div className="join-in">
      <span className="eyebrow">{copy['unete.eyebrow']}</span>
      <h2 className="display-md">{richKey(copy, 'unete.title')}</h2>
      <p>{richKey(copy, 'unete.body')}</p>

      {PHONE_ENABLED && step === 'start' && (
        <div className="channel-tabs" role="tablist" aria-label="Método de entrada">
          <button
            role="tab"
            aria-selected={!isPhone}
            className={`channel-tab${!isPhone ? ' on' : ''}`}
            onClick={() => {
              setChannel('email');
              setError('');
            }}
          >
            Correo
          </button>
          <button
            role="tab"
            aria-selected={isPhone}
            className={`channel-tab${isPhone ? ' on' : ''}`}
            onClick={() => {
              setChannel('phone');
              setError('');
            }}
          >
            Celular
          </button>
        </div>
      )}

      {step === 'start' ? (
        <div className="form">
          <input
            type={isPhone ? 'tel' : 'email'}
            inputMode={isPhone ? 'tel' : 'email'}
            placeholder={isPhone ? '55 1234 5678' : 'tu@correo.com'}
            aria-label={isPhone ? 'Tu celular' : 'Tu correo'}
            autoComplete={isPhone ? 'tel' : 'email'}
            value={value}
            disabled={busy}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendCode();
            }}
          />
          <button className="btn btn-sun" onClick={sendCode} disabled={busy} aria-live="polite">
            {busy ? 'Enviando código…' : 'Enviarme el código →'}
          </button>
        </div>
      ) : (
        <div className="form">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder={isPhone ? 'Código de 6 dígitos' : 'Código de 8 dígitos'}
            aria-label="Código de verificación"
            value={code}
            disabled={busy}
            autoFocus
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') verify();
            }}
          />
          <button className="btn btn-sun" onClick={verify} disabled={busy} aria-live="polite">
            {busy ? 'Entrando…' : 'Entrar a la red →'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <p className="note">
          {isPhone ? 'Te llegó un SMS a ' : 'Enviamos el código a '}
          <b style={{ color: 'var(--miel)' }}>{value.trim()}</b>.{' '}
          <button
            type="button"
            onClick={() => {
              setStep('start');
              setCode('');
              setError('');
            }}
            className="linklike"
          >
            {isPhone ? 'Cambiar número' : 'Cambiar correo'}
          </button>
        </p>
      )}

      <p className={`msg err${error ? ' show' : ''}`} role="alert">
        {error}
      </p>
      <p className="note">{richKey(copy, 'unete.note')}</p>
    </div>
  );
}
