'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '../../lib/i18n/provider';
import { WHY, BASIS_SUMMARY, SCORE_SUMMARY } from '../../lib/astro/guide';

// FlowMe, everywhere — now a real native-feel chat: bubbles, typing dots,
// suggestion chips that stay with you, and INSTANT in-house answers. The big
// "why" questions are answered locally from lib/astro/guide.ts (zero tokens,
// zero waiting); only free-typed questions travel to /api/flowme.
//
// SECURITY: unchanged — this only POSTs your typed question to /api/flowme,
// which replies with TEXT guidance. It never sends identities, never runs
// code, never writes to any record. There is no path from this chat to the
// codebase or to anyone else's data.

interface Msg { role: 'user' | 'assistant'; text: string; local?: boolean }

export default function FlowMeDock() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<Msg[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' }); }, [thread, busy]);

  // Instant answers from the in-house guide — no network, no tokens.
  const LOCAL: { q: string; a: string }[] = [
    { q: 'Why the bond?', a: WHY[1].a },
    { q: 'What is this based on?', a: BASIS_SUMMARY },
    { q: 'How is the number made?', a: SCORE_SUMMARY },
    { q: 'Is my data safe?', a: WHY[3].a },
  ];
  // These still travel to FlowMe (they need app know-how, kept server-side).
  const REMOTE = ['How do I add my chart?', 'How do I invite a friend?', 'What is my Atlas?'];

  function askLocal(item: { q: string; a: string }) {
    setAsked((s) => [...s, item.q]);
    setThread((th) => [...th, { role: 'user', text: t(item.q) }, { role: 'assistant', text: t(item.a), local: true }]);
  }

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    const next = [...thread, { role: 'user' as const, text }];
    setThread(next); setMsg(''); setBusy(true);
    try {
      const res = await fetch('/api/flowme', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history: thread.slice(-6).map(({ role, text }) => ({ role, text })) }),
      });
      const json = await res.json();
      setThread([...next, { role: 'assistant', text: res.ok ? json.reply : json.error || t('I stumbled — try again.') }]);
    } catch {
      setThread([...next, { role: 'assistant', text: t('The connection wavered — try once more.') }]);
    } finally { setBusy(false); }
  }

  const chips = (
    <div className="flex flex-wrap gap-1.5">
      {LOCAL.filter((l) => !asked.includes(l.q)).map((l) => (
        <button key={l.q} onClick={() => askLocal(l)}
          className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#e3c07a]/35 text-[#e3c07a] active:bg-[#e3c07a]/10 transition">
          {t(l.q)}
        </button>
      ))}
      {REMOTE.map((q) => (
        <button key={q} onClick={() => ask(t(q))}
          className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#2c3350] text-[#cfc8e8] active:bg-[#1a1f33] transition">
          {t(q)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* floating launcher */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label={t('Ask FlowMe')}
          className="fixed z-[60] bottom-[78px] right-4 sm:bottom-4 w-14 h-14 rounded-full grid place-items-center shadow-xl active:scale-95 transition"
          style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)', boxShadow: '0 0 18px 2px rgba(154,143,224,0.55)' }}>
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}>✦</span>
        </button>
      )}

      {/* panel — full-width sheet on mobile, tucked card on desktop */}
      {open && (
        <div className="fixed z-[60] inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]">
          <div className="bg-[#0e1020]/97 border border-[#2c3350] sm:rounded-2xl rounded-t-2xl backdrop-blur-md flex flex-col max-h-[78vh] sm:max-h-[70vh]"
               style={{ animation: 'af-sheet-rise 0.28s cubic-bezier(0.2,0.7,0.2,1)' }}>
            {/* header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b6abec]" style={{ boxShadow: '0 0 8px 2px rgba(154,143,224,0.8)' }} />
              <span className="text-xs uppercase tracking-[0.24em] text-[#cfc8e8]">FlowMe</span>
              <span className="text-[#5b5e72] text-xs">{t('· your guide')}</span>
              <Link href="/guide" onClick={() => setOpen(false)} className="ml-auto text-[11px] text-[#e3c07a] active:opacity-70">📖 {t('Guide')}</Link>
              <button onClick={() => setOpen(false)} className="text-[#9698a8] text-lg leading-none px-1 active:scale-90">✕</button>
            </div>

            {/* thread */}
            <div ref={scroll} className="flex-1 overflow-auto px-3 py-3 space-y-2.5 min-h-[140px]">
              {thread.length === 0 && (
                <div className="af-msg">
                  <div className="flex items-end gap-2">
                    <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs" style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)' }}>✦</span>
                    <div className="af-bubble-flowme px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]">
                      {t('Stuck or curious? Ask me anything — the golden questions I answer instantly, from AstralFlow’s own memory.')}
                    </div>
                  </div>
                  <div className="mt-3 pl-8">{chips}</div>
                </div>
              )}
              {thread.map((m, i) => (
                <div key={i} className={`af-msg flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs" style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)' }}>✦</span>
                  )}
                  <div className={`${m.role === 'user' ? 'af-bubble-user' : 'af-bubble-flowme'} px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap`}>
                    {m.text}
                    {m.local && (
                      <Link href="/guide" onClick={() => setOpen(false)} className="block mt-1.5 text-[11px] text-[#b6abec] underline decoration-dotted">
                        {t('Read the full guide ✦')}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="af-msg flex items-end gap-2">
                  <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs" style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)' }}>✦</span>
                  <div className="af-bubble-flowme px-4 py-3 af-typing"><span /> <span /> <span /></div>
                </div>
              )}
              {/* chips stay with you after answers */}
              {thread.length > 0 && !busy && <div className="pt-1 pl-8">{chips}</div>}
            </div>

            {/* input */}
            <div className="flex gap-2 p-3 border-t border-white/8">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(msg); }}
                placeholder={t('Ask FlowMe — how do I…?')} enterKeyHint="send"
                className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-full px-4 py-2.5 text-sm text-[#ece9e0] placeholder-[#454962] outline-none focus:border-[#9a8fe0]/50" />
              <button onClick={() => ask(msg)} disabled={busy || !msg.trim()} aria-label={t('Ask')}
                className="w-10 h-10 shrink-0 rounded-full grid place-items-center bg-[#e3c07a] text-[#0a0b12] font-semibold disabled:opacity-40 active:scale-95 transition">
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
