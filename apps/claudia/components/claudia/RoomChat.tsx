'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · RoomChat  (components/claudia/RoomChat.tsx)
//
//  The wired private chat inside a group-ZK room — follow-ups on a shared
//  recap, or a standalone community thread. Every message is encrypted under
//  the room key client-side; the server relays ciphertext only. The room owner
//  can mint an invite LINK whose key rides in the URL fragment (never sent to
//  the server), so anyone with the link can join while the server stays blind.
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { getVault } from '../../lib/claudia/client';

interface Msg { id: string; senderId: string; text: string; at: string }

export function RoomChat({ roomId, canInvite }: { roomId: string; canInvite: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const me = getVault().myFbid;
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try { setMsgs(await getVault().loadRoomMessages(roomId)); setErr(''); }
    catch (e) { setErr((e as Error).message); }
  }, [roomId]);

  // poll every 4s while the room is open (messages are ciphertext on the wire)
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput(''); setSending(true);
    try { await getVault().postRoomMessage(roomId, text); await refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setSending(false); }
  }

  async function makeInvite() {
    setErr('');
    try {
      const { token, linkKey } = await getVault().createInvite(roomId, { maxUses: 25 });
      // The link key rides in the URL fragment (#…) — browsers never send it to the server.
      const url = `${window.location.origin}/invite/${token}#${linkKey}`;
      setInviteUrl(url);
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(244,241,234,.1)', paddingTop: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={sectionHead}>Conversación · seguimiento</div>
        {canInvite && (
          <button onClick={makeInvite} style={linkBtn}>{copied ? '✓ enlace copiado' : '+ enlace de invitación'}</button>
        )}
      </div>

      {inviteUrl && (
        <div style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(47,182,168,.1)', border: '1px solid rgba(47,182,168,.28)', fontSize: 11, wordBreak: 'break-all', color: 'rgba(244,241,234,.8)' }}>
          {inviteUrl}
          <div style={{ marginTop: 4, color: 'rgba(244,241,234,.45)' }}>La llave va en el “#” — el servidor nunca la ve. Cualquiera con el enlace puede unirse.</div>
        </div>
      )}

      <div ref={scrollRef} className="scroll" style={{ maxHeight: 240, overflowY: 'auto', background: 'rgba(0,0,0,.18)', border: '1px solid rgba(244,241,234,.08)', borderRadius: 12, padding: 12 }}>
        {msgs.length ? msgs.map((m) => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
              <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: mine ? 'rgba(47,182,168,.16)' : 'rgba(255,210,122,.1)', border: `1px solid ${mine ? 'rgba(47,182,168,.3)' : 'rgba(255,210,122,.18)'}` }}>
                {!mine && <div style={{ fontSize: 10, color: 'rgba(244,241,234,.45)', marginBottom: 2 }}>{m.senderId.slice(0, 8)}…</div>}
                {m.text}
              </div>
            </div>
          );
        }) : <span style={{ fontSize: 12.5, color: 'rgba(244,241,234,.4)' }}>Aún no hay mensajes. Escribe el primero del seguimiento.</span>}
      </div>

      {err && <p style={{ color: '#FF8A6B', fontSize: 12, margin: '6px 0 0' }}>{err === 'not-room-member' ? 'No tienes acceso a esta sala.' : 'No se pudo cargar el chat.'}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribe al grupo…"
          style={{ flex: 1, resize: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 12, color: '#F4F1EA', padding: '10px 12px', fontSize: 13.5, fontFamily: 'system-ui, sans-serif', lineHeight: 1.4 }}
        />
        <button onClick={send} disabled={sending || !input.trim()} style={{ border: 'none', borderRadius: 12, padding: '0 16px', cursor: sending || !input.trim() ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, color: '#0E1A2B', background: 'linear-gradient(135deg,#FFD27A,#2FB6A8)', opacity: sending || !input.trim() ? 0.4 : 1 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

const sectionHead: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2FB6A8', fontWeight: 500,
};
const linkBtn: React.CSSProperties = {
  border: '1px solid rgba(47,182,168,.4)', background: 'rgba(47,182,168,.1)', color: '#2FB6A8',
  borderRadius: 9, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
};
