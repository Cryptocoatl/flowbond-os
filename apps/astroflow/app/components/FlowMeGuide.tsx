'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BondInvite from './BondInvite';

export interface GuideState {
  hasProfile: boolean;
  friends: number;
  souls: number;          // charted-but-unactivated guests
  constellations: number;
}

// FlowMe leads the dashboard: an instant, state-aware set of next steps (zero
// tokens), an easy add-friend (bond link + find-by-@handle), and a real chat
// where you can ask FlowMe what to do. Warm, visual, dynamic.
export default function FlowMeGuide({ state, me }: { state: GuideState; me: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState('');
  const [msg, setMsg] = useState('');
  const [thread, setThread] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  // The single most useful next step, chosen from where you are.
  const steps: { label: string; href?: string; onClick?: () => void; primary?: boolean }[] = [];
  if (!state.hasProfile) steps.push({ label: '✦ Add your chart', href: '/profile/new', primary: true });
  if (state.souls > 0) steps.push({ label: `Send ${state.souls} activation link${state.souls > 1 ? 's' : ''}`, onClick: () => document.getElementById('souls')?.scrollIntoView({ behavior: 'smooth' }), primary: state.hasProfile });
  if (state.friends === 0) steps.push({ label: '+ Invite your first friend', onClick: () => setOpen(true), primary: state.hasProfile && state.souls === 0 });
  steps.push({ label: 'Chart someone instantly', href: '/instant' });
  steps.push({ label: 'Weave a constellation', href: '/' });
  if (state.constellations > 0) steps.push({ label: 'Open a saved constellation', href: '/' });
  steps.push({ label: 'Study the cosmos ✦', href: '/cosmos' });

  const greeting = !state.hasProfile
    ? 'Welcome to your sky. Start by adding your chart — your star — and everything else opens from there.'
    : state.souls > 0
      ? `You've charted ${state.souls} soul${state.souls > 1 ? 's' : ''} waiting to activate. Send their links and watch them light up your constellation.`
      : state.friends === 0
        ? 'Your chart is set. Now invite a friend — share your bond link and your circle begins to glow.'
        : `Your circle holds ${state.friends} ${state.friends === 1 ? 'soul' : 'souls'}. Weave them into a constellation, or ask me anything below.`;

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    const next = [...thread, { role: 'user' as const, text }];
    setThread(next); setMsg(''); setBusy(true);
    try {
      const res = await fetch('/api/flowme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, state, history: thread }),
      });
      const json = await res.json();
      setThread([...next, { role: 'assistant', text: res.ok ? json.reply : json.error || 'I stumbled — try again.' }]);
    } catch {
      setThread([...next, { role: 'assistant', text: 'The connection wavered — try once more.' }]);
    } finally {
      setBusy(false);
    }
  }

  function findByHandle() {
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    if (h) router.push(`/chart/${h}`);
  }

  return (
    <div
      className="rounded-2xl p-[1px] mb-5"
      style={{ background: 'linear-gradient(135deg, rgba(154,143,224,0.5), rgba(227,192,122,0.28), rgba(123,208,198,0.4))' }}
    >
      <div className="rounded-2xl bg-[#0e1020]/95 p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(420px 180px at 88% -20%, rgba(154,143,224,0.22), transparent 70%)', animation: 'af-aurora 9s ease-in-out infinite' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#b6abec]" style={{ boxShadow: '0 0 8px 2px rgba(154,143,224,0.8)' }} />
            <span className="text-xs uppercase tracking-[0.24em] text-[#cfc8e8]">FlowMe</span>
            <span className="text-[#5b5e72] text-xs">· your guide</span>
          </div>
          <p className="font-serif text-[17px] text-[#ece9e0] leading-relaxed mb-3">{greeting}</p>

          <div className="flex flex-wrap gap-2">
            {steps.map((s, i) =>
              s.href ? (
                <Link
                  key={i}
                  href={s.href}
                  className={`text-sm rounded-lg px-4 py-2 transition ${s.primary ? 'bg-[#e3c07a] text-[#0a0b12] font-semibold hover:brightness-110' : 'bg-[#11131f] border border-[#242a3b] text-[#cfc8e8] hover:border-[#9a8fe0]/50'}`}
                >
                  {s.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={s.onClick}
                  className={`text-sm rounded-lg px-4 py-2 transition ${s.primary ? 'bg-[#e3c07a] text-[#0a0b12] font-semibold hover:brightness-110' : 'bg-[#11131f] border border-[#242a3b] text-[#cfc8e8] hover:border-[#9a8fe0]/50'}`}
                >
                  {s.label}
                </button>
              ),
            )}
          </div>

          {/* Easy add-friend: bond link + find by @handle */}
          {open && (
            <div className="mt-4 rounded-xl border border-[#9a8fe0]/30 bg-[#11131f] p-4" style={{ animation: 'af-rise 0.35s ease-out' }}>
              <p className="text-sm text-[#cfc8e8] mb-3">Two easy ways to grow your circle:</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <BondInvite />
                <span className="text-[11px] text-[#5b5e72]">share your link — they bond the moment they accept</span>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-lg px-3">
                  <span className="text-[#5b5e72] text-sm">@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_]/gi, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') findByHandle(); }}
                    placeholder="find someone by handle"
                    className="flex-1 bg-transparent py-2 text-sm text-[#ece9e0] outline-none"
                  />
                </div>
                <button onClick={findByHandle} disabled={!handle.trim()} className="text-sm bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-4 disabled:opacity-40">
                  Find
                </button>
              </div>
              <p className="text-[10px] text-[#5b5e72] mt-1.5">Opens their star — request to see their chart if they keep it close.</p>
            </div>
          )}

          {/* Ask FlowMe */}
          {thread.length > 0 && (
            <div className="mt-4 space-y-2">
              {thread.map((m, i) => (
                <p key={i} className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-[#9698a8]' : 'font-serif text-[#ece9e0]'}`}>
                  {m.role === 'user' ? <span className="text-[#5b5e72]">you · </span> : <span className="text-[#b6abec]">FlowMe · </span>}
                  {m.text}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(msg); }}
              placeholder="Ask FlowMe — how do I…?"
              className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-lg px-3 py-2 text-sm text-[#ece9e0] placeholder-[#454962] outline-none focus:border-[#9a8fe0]/50"
            />
            <button onClick={() => ask(msg)} disabled={busy || !msg.trim()} className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-40">
              {busy ? '…' : 'Ask'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
