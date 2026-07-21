'use client';
import { useState } from 'react';
import { sendFeedback } from '../../lib/analytics';
import { useT } from '../../lib/i18n/provider';

// A small, non-invasive way for anyone to tell us how a screen felt — a quick
// reaction plus an optional note. Fully anonymous (no identity is stored) and
// safe (the note is DATA only: bounded, control-chars stripped server-side,
// never executed, never fed to a model as instructions). Purely to improve the
// platform from real, direct user signal.
const KINDS: { kind: 'love' | 'confusing' | 'bug' | 'idea'; emoji: string; label: string }[] = [
  { kind: 'love', emoji: '💜', label: 'Love it' },
  { kind: 'idea', emoji: '💡', label: 'An idea' },
  { kind: 'confusing', emoji: '🤔', label: 'Confusing' },
  { kind: 'bug', emoji: '🐞', label: 'Something broke' },
];

export default function FeedbackButton({ screen = '', inline = false }: { screen?: string; inline?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<typeof KINDS[number]['kind'] | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!kind) return;
    await sendFeedback(kind, note, screen);
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setKind(null); setNote(''); }, 1400);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={inline
          ? 'text-[12px] text-[#8a8ea3] hover:text-[#cfc8e8] underline'
          : 'af-btn af-btn-ghost text-[13px]'}
      >
        {t('Share how this felt')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border-t sm:border af-sheet-rise"
            style={{ borderColor: '#242a3b', background: '#0e1020' }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="p-5 pb-7">
              {sent ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">✦</div>
                  <div className="text-[15px] text-[#cfc8e8]">{t('Thank you — this helps us make it better.')}</div>
                </div>
              ) : (
                <>
                  <div className="text-[15px] font-semibold text-[#cfc8e8]">{t('How did this feel?')}</div>
                  <p className="text-[12px] text-[#8a8ea3] mt-0.5">{t('Anonymous — it only helps us improve AstralFlow.')}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {KINDS.map((k) => (
                      <button key={k.kind} onClick={() => setKind(k.kind)}
                        className="rounded-xl border p-2.5 text-left transition-colors"
                        style={{ borderColor: kind === k.kind ? '#8F7CFF' : '#2c3350', background: kind === k.kind ? '#8F7CFF1a' : 'transparent' }}>
                        <span className="text-lg">{k.emoji}</span>
                        <div className="text-[12px] text-[#cfc8e8] mt-0.5">{t(k.label)}</div>
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="af-input mt-3 w-full min-h-[60px]" maxLength={1000}
                    placeholder={t('Anything you want to add (optional)')}
                    value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex items-center gap-2 mt-3">
                    <button className="af-btn af-btn-primary" disabled={!kind} onClick={submit}>{t('Send')}</button>
                    <button className="af-btn af-btn-ghost" onClick={() => setOpen(false)}>{t('Cancel')}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
