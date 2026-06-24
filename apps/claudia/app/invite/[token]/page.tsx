'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · invite landing  (/invite/[token])
//
//  The invite link is  /invite/<token>#<linkKey>.  The link key lives in the
//  URL FRAGMENT (after '#') — browsers NEVER send it to the server, so the
//  server can't open the room key it wraps. Here we read the fragment, park the
//  {token, linkKey} for the app, and bounce to '/' where the vault gate signs
//  in / unlocks and then redeems the invite (see MeetingPanel).
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Preparando tu invitación…');

  useEffect(() => {
    const token = String(params?.token || '');
    const linkKey = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!token || !linkKey) {
      setMsg('Este enlace de invitación está incompleto o no es válido.');
      return;
    }
    try {
      sessionStorage.setItem('claudia.pendingInvite', JSON.stringify({ token, linkKey }));
      setMsg('Invitación lista. Entrando a ClaudIA…');
    } catch {
      setMsg('No se pudo preparar la invitación en este navegador.');
      return;
    }
    const t = setTimeout(() => router.replace('/'), 700);
    return () => clearTimeout(t);
  }, [params, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0E1A2B', color: '#F4F1EA', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🤝</div>
        <h1 style={{ fontSize: 20, fontWeight: 400, letterSpacing: '0.04em', margin: '0 0 8px', background: 'linear-gradient(90deg,#FFD27A,#2FB6A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Invitación a una sala de ClaudIA
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(244,241,234,.7)' }}>{msg}</p>
        <p style={{ fontSize: 11, letterSpacing: '0.06em', color: 'rgba(244,241,234,.4)', marginTop: 14 }}>
          zero-knowledge · la llave nunca toca el servidor
        </p>
      </div>
    </div>
  );
}
