'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  actions?: { tool: string; detail: string }[];
}

const PROMPTS = [
  'What needs me today?',
  'Show the highest-fit grants for FlowBond.life',
  'Draft the Gitcoin application for FlowBond.life',
  'Who haven’t I followed up with?',
];

export default function ClaudiaChat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'I’m here, Steph. I hold every grant, every draft, and every conversation. Ask me what needs you, point me at a funder, or tell me to draft something — I’ll do the work and keep the thread.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...msgs, { role: 'user' as const, content }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/claudia/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply, actions: data.actions }]);
      if (data.actions?.length) router.refresh();
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: `I hit a snag: ${e instanceof Error ? e.message : 'unknown'}` }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: 9e9, behavior: 'smooth' }));
    }
  }

  return (
    <div className="gf-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 440 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--gf-border)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/claudia-logo.png" alt="" width={28} height={28} />
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-display), Georgia, serif' }}>Talk to ClaudIA</div>
          <div style={{ fontSize: 11, color: 'var(--gf-muted)' }}>she reads and acts on your real grants &amp; CRM</div>
        </div>
      </div>

      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 460 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'linear-gradient(180deg, rgba(246,220,166,0.16), rgba(240,168,104,0.08))' : 'var(--gf-bg-2)',
                border: '1px solid var(--gf-border)',
              }}
            >
              {m.content}
            </div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {m.actions.map((a, j) => (
                  <span key={j} className="gf-tag" style={{ color: 'var(--cl-gold)', borderColor: 'currentColor' }}>
                    ✦ {a.tool.replace(/_/g, ' ')}: {a.detail}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--cl-gold)', fontSize: 13, fontStyle: 'italic' }}>
            ClaudIA is thinking<span className="cl-twinkle">…</span>
          </div>
        )}
      </div>

      {msgs.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 18px 12px' }}>
          {PROMPTS.map((p) => (
            <button key={p} className="gf-btn" style={{ fontSize: 12, padding: '6px 12px', background: 'transparent' }} onClick={() => send(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1px solid var(--gf-border)' }}>
        <input
          className="gf-input"
          style={{ flex: 1 }}
          placeholder="Ask ClaudIA…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          disabled={busy}
        />
        <button className="cl-btn" onClick={() => send(input)} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
