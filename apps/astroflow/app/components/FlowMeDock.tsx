'use client';

import { useEffect, useRef, useState } from 'react';

// FlowMe, everywhere. A floating guide on every page: tap the star, ask "how do
// I…", get warm, concrete steps. Mobile-first (full-width sheet on phones, a
// tucked card on desktop).
//
// SECURITY: this only POSTs your typed question to /api/flowme, which replies
// with TEXT guidance. It never sends identities, never runs code, never writes
// to any record. Acting on advice happens through the normal app UI, which is
// RLS-bound to your own account. There is no path from this chat to the codebase
// or to anyone else's data.
const QUICK = ['How do I add my chart?', 'What is my Atlas?', 'How do crossings work?', 'How do I invite a friend?'];

export default function FlowMeDock() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' }); }, [thread, busy]);

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    const next = [...thread, { role: 'user' as const, text }];
    setThread(next); setMsg(''); setBusy(true);
    try {
      const res = await fetch('/api/flowme', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history: thread.slice(-6) }),
      });
      const json = await res.json();
      setThread([...next, { role: 'assistant', text: res.ok ? json.reply : json.error || 'I stumbled — try again.' }]);
    } catch {
      setThread([...next, { role: 'assistant', text: 'The connection wavered — try once more.' }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* floating launcher */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Ask FlowMe"
          className="fixed z-[60] bottom-[78px] right-4 sm:bottom-4 w-14 h-14 rounded-full grid place-items-center shadow-xl active:scale-95 transition"
          style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)', boxShadow: '0 0 18px 2px rgba(154,143,224,0.55)' }}>
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}>✦</span>
        </button>
      )}

      {/* panel — full-width sheet on mobile, tucked card on desktop */}
      {open && (
        <div className="fixed z-[60] inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]">
          <div className="bg-[#0e1020]/97 border border-[#2c3350] sm:rounded-2xl rounded-t-2xl backdrop-blur-md flex flex-col max-h-[78vh] sm:max-h-[70vh]"
               style={{ animation: 'af-rise 0.22s ease-out' }}>
            {/* header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b6abec]" style={{ boxShadow: '0 0 8px 2px rgba(154,143,224,0.8)' }} />
              <span className="text-xs uppercase tracking-[0.24em] text-[#cfc8e8]">FlowMe</span>
              <span className="text-[#5b5e72] text-xs">· your guide</span>
              <button onClick={() => setOpen(false)} className="ml-auto text-[#9698a8] text-lg leading-none px-1 active:scale-90">✕</button>
            </div>

            {/* thread */}
            <div ref={scroll} className="flex-1 overflow-auto px-4 py-3 space-y-2.5 min-h-[120px]">
              {thread.length === 0 && (
                <>
                  <p className="font-serif text-[15px] text-[#ece9e0] leading-relaxed">
                    Stuck or curious? Ask me anything — how to read your Atlas, weave a constellation, or set up your profile.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK.map((q) => (
                      <button key={q} onClick={() => ask(q)} className="text-[11px] px-2.5 py-1 rounded-full border border-[#2c3350] text-[#cfc8e8] active:bg-[#1a1f33] transition">{q}</button>
                    ))}
                  </div>
                </>
              )}
              {thread.map((m, i) => (
                <p key={i} className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-[#9698a8]' : 'font-serif text-[#ece9e0]'}`}>
                  {m.role === 'user' ? <span className="text-[#5b5e72]">you · </span> : <span className="text-[#b6abec]">FlowMe · </span>}{m.text}
                </p>
              ))}
              {busy && <p className="text-sm text-[#b6abec] font-serif">FlowMe · <span className="opacity-60">listening to the stars…</span></p>}
            </div>

            {/* input */}
            <div className="flex gap-2 p-3 border-t border-white/8">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(msg); }}
                placeholder="Ask FlowMe — how do I…?" enterKeyHint="send"
                className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-lg px-3 py-2.5 text-sm text-[#ece9e0] placeholder-[#454962] outline-none focus:border-[#9a8fe0]/50" />
              <button onClick={() => ask(msg)} disabled={busy || !msg.trim()} className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-40 active:scale-95">
                {busy ? '…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
