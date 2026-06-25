'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Seguridad — rotar mi llave  (/security)
//
//  Rotate the vault's key material when a recovery phrase may have leaked
//  (screenshot, lost paper, shared device). Flow:
//    unlock (factor 1) → step-up a 2nd factor → re-key → new phrase shown once.
//  A leaked phrase ALONE can't reach this: rotation needs ≥2 distinct factors,
//  and the old phrase opens nothing once the re-key commits.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { getVault } from '../../lib/claudia/client';
import { hubRedirect } from '@flowbond/auth';

type Phase = 'loading' | 'signin' | 'no-vault' | 'unlock' | 'stepup' | 'rotating' | 'done';

export default function SecurityPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [factors, setFactors] = useState<string[]>([]);
  const [proven, setProven] = useState<string[]>([]);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const enrolled = await getVault().isEnrolled();
        if (!enrolled) { setPhase('no-vault'); return; }
        setFactors(await getVault().availableFactors());
        setPhase('unlock');
      } catch (e) {
        setPhase((e as Error).message === 'not-signed-in' ? 'signin' : 'no-vault');
      }
    })();
  }, []);

  const refreshProofs = () => setProven(getVault().provenFactors());

  async function unlockPasskey() {
    setBusy('unlock'); setErr('');
    try { await getVault().unlockWithPasskey(); refreshProofs(); setPhase('stepup'); }
    catch { setErr('No se pudo abrir con passkey.'); } finally { setBusy(''); }
  }
  async function unlockRecovery() {
    setBusy('unlock'); setErr('');
    try { await getVault().unlockWithRecovery(recoveryInput); setRecoveryInput(''); refreshProofs(); setPhase('stepup'); }
    catch { setErr('Esa frase no abrió la bóveda.'); } finally { setBusy(''); }
  }

  async function stepPasskey() {
    setBusy('passkey'); setErr('');
    const ok = await getVault().provePasskey();
    if (!ok) setErr('No se pudo verificar el passkey.');
    refreshProofs(); setBusy('');
  }
  async function stepRecovery() {
    setBusy('recovery'); setErr('');
    const ok = await getVault().proveRecovery(recoveryInput);
    if (!ok) setErr('Esa frase no es válida.'); else setRecoveryInput('');
    refreshProofs(); setBusy('');
  }
  async function sendOtp() {
    setBusy('otp-send'); setErr('');
    try { await getVault().sendRotationOtp(); setOtpSent(true); }
    catch { setErr('No se pudo enviar el código por correo.'); } finally { setBusy(''); }
  }
  async function verifyOtp() {
    setBusy('otp'); setErr('');
    const ok = await getVault().verifyRotationOtp(otpCode);
    if (!ok) setErr('Código incorrecto o expirado.'); else setOtpCode('');
    refreshProofs(); setBusy('');
  }

  async function doRotate() {
    setBusy('rotate'); setErr(''); setPhase('rotating');
    try {
      const { recoveryPhrase } = await getVault().rotateRecoveryKey();
      setNewPhrase(recoveryPhrase);
      setPhase('done');
    } catch (e) {
      const m = (e as Error).message;
      setErr(m === 'need-two-factors' ? 'Necesitas confirmar dos factores.' : 'No se pudo rotar la llave. Tus llaves actuales siguen intactas.');
      setPhase('stepup');
    } finally { setBusy(''); }
  }

  const has = (f: string) => proven.includes(f);
  const canPasskeyStep = factors.includes('passkey') && !has('passkey');
  const canRecoveryStep = factors.includes('recovery') && !has('recovery');

  return (
    <div style={shell}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 30 }}>🔑</div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: '0.05em', margin: '8px 0 4px', background: 'linear-gradient(90deg,#FFD27A,#2FB6A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Rotar mi llave
          </h1>
          <p style={muted}>Genera una llave nueva si tu frase pudo quedar expuesta. La anterior dejará de funcionar.</p>
        </div>

        {phase === 'loading' && <p style={{ ...muted, textAlign: 'center' }}>Despertando…</p>}

        {phase === 'signin' && (
          <Card>
            <p style={muted}>Entra con tu FBID para gestionar tu seguridad.</p>
            <button style={cta} onClick={() => { window.location.href = hubRedirect('claudia', `${window.location.origin}/security`); }}>Entrar ✦</button>
          </Card>
        )}

        {phase === 'no-vault' && (
          <Card><p style={muted}>Aún no tienes una bóveda. Crea una en ClaudIA primero.</p>
            <button style={cta} onClick={() => window.open('https://claudiaflow.life', '_blank')}>Abrir ClaudIA ↗</button>
          </Card>
        )}

        {phase === 'unlock' && (
          <Card>
            <p style={muted}><strong>Paso 1 de 2 · </strong>Abre tu bóveda (primer factor).</p>
            {factors.includes('passkey') && <button style={cta} onClick={unlockPasskey} disabled={!!busy}>{busy === 'unlock' ? 'Verificando…' : 'Abrir con passkey'}</button>}
            {factors.includes('recovery') && (
              <div style={{ marginTop: 12 }}>
                <textarea value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} rows={2} placeholder="frase de recuperación actual (24 palabras)" style={field} />
                <button style={ctaGhost} onClick={unlockRecovery} disabled={!!busy || !recoveryInput.trim()}>Abrir con frase</button>
              </div>
            )}
          </Card>
        )}

        {phase === 'stepup' && (
          <Card>
            <p style={muted}><strong>Paso 2 de 2 · </strong>Confirma un segundo factor distinto. ({proven.length}/2)</p>
            <div style={{ display: 'flex', gap: 6, margin: '6px 0 14px' }}>
              {proven.map((p) => <span key={p} style={chip}>✓ {LABEL[p] ?? p}</span>)}
            </div>

            {canPasskeyStep && <button style={cta} onClick={stepPasskey} disabled={!!busy}>{busy === 'passkey' ? 'Verificando…' : 'Confirmar con passkey'}</button>}

            {canRecoveryStep && (
              <div style={{ marginTop: 10 }}>
                <textarea value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} rows={2} placeholder="frase de recuperación actual" style={field} />
                <button style={ctaGhost} onClick={stepRecovery} disabled={!!busy || !recoveryInput.trim()}>Confirmar con frase</button>
              </div>
            )}

            {!has('email') && (
              <div style={{ marginTop: 10 }}>
                {!otpSent ? (
                  <button style={ctaGhost} onClick={sendOtp} disabled={!!busy}>{busy === 'otp-send' ? 'Enviando…' : 'Enviarme un código por correo'}</button>
                ) : (
                  <div>
                    <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="código del correo" style={{ ...field, height: 40 }} />
                    <button style={ctaGhost} onClick={verifyOtp} disabled={!!busy || !otpCode.trim()}>Confirmar código</button>
                  </div>
                )}
              </div>
            )}

            {getVault().rotationReady() && (
              <button style={{ ...cta, marginTop: 16, background: 'linear-gradient(135deg,#FF8A6B,#FFD27A)' }} onClick={doRotate} disabled={!!busy}>
                Rotar mi llave ahora →
              </button>
            )}
            <p style={{ ...muted, fontSize: 11, marginTop: 10 }}>Tus datos no se borran: se vuelven a sellar bajo la nueva llave. La rotación es atómica — si algo falla, tus llaves actuales quedan intactas.</p>
          </Card>
        )}

        {phase === 'rotating' && <Card><p style={{ ...muted, textAlign: 'center' }}>Generando tu nueva llave… 🔐</p></Card>}

        {phase === 'done' && (
          <Card>
            <p style={muted}>✓ Listo. Tu llave anterior ya no funciona. Guarda tu <strong>nueva frase</strong> en un lugar seguro y privado — es tu único respaldo y no la guardamos en ningún servidor.</p>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 14, padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 14, lineHeight: 1.8, wordSpacing: '0.3em', color: '#FFD27A' }}>
              {newPhrase}
            </div>
            <button style={{ ...cta, marginTop: 14 }} onClick={() => window.location.href = '/'}>La guardé — volver</button>
          </Card>
        )}

        {err && <p style={{ color: '#FF8A6B', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{err}</p>}
      </div>
    </div>
  );
}

const LABEL: Record<string, string> = { passkey: 'passkey', recovery: 'frase', email: 'correo' };

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(244,241,234,.1)', borderRadius: 18, padding: 22 }}>{children}</div>;
}

const shell: React.CSSProperties = { minHeight: '100vh', background: '#0E1A2B', color: '#F4F1EA', display: 'grid', placeItems: 'center', padding: 22, fontFamily: 'system-ui, sans-serif' };
const muted: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.6, color: 'rgba(244,241,234,.72)', margin: '0 0 12px' };
const cta: React.CSSProperties = { width: '100%', border: 'none', borderRadius: 12, padding: '11px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0E1A2B', background: 'linear-gradient(135deg,#FFD27A,#2FB6A8)', fontFamily: 'system-ui, sans-serif' };
const ctaGhost: React.CSSProperties = { width: '100%', marginTop: 8, border: '1px solid rgba(244,241,234,.2)', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontSize: 13.5, color: '#F4F1EA', background: 'transparent', fontFamily: 'system-ui, sans-serif' };
const field: React.CSSProperties = { width: '100%', resize: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 12, color: '#F4F1EA', padding: '10px 12px', fontSize: 14, fontFamily: 'ui-monospace, monospace', marginBottom: 4, boxSizing: 'border-box' };
const chip: React.CSSProperties = { fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(47,182,168,.16)', border: '1px solid rgba(47,182,168,.35)', color: '#2FB6A8' };
