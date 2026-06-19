'use client';
import { useState } from 'react';
import { useT } from '../../lib/i18n/provider';

const STEPS: { glyph: string; title: string; body: string }[] = [
  {
    glyph: '✶',
    title: 'Your chart is a map of currents',
    body: 'The moment you were born, the sky held a precise arrangement. AstralFlow recomputes it to the degree — Sun, Moon, Rising, every planet, house and aspect — no guessing, no generic horoscopes.',
  },
  {
    glyph: '☉',
    title: 'Add your chart',
    body: 'Enter your birth date, time and place. We auto-resolve your coordinates and timezone, then calculate your full natal chart on the spot.',
  },
  {
    glyph: '✧',
    title: 'Explore the constellation',
    body: 'Everyone you can see becomes a star. Tap one to read who they are at their core — their gifts, their growth edges, the shape of their inner weather.',
  },
  {
    glyph: '⚭',
    title: 'Combine — and switch the lens',
    body: 'Weave two or more people together. The same connection reads differently through each lens: friendship, romance, co-living, or business. AstralFlow weights every aspect for the bond you actually care about.',
  },
  {
    glyph: '⊕',
    title: 'Position into real places',
    body: 'Astrocartography shows where each chart is most activated — the best place to retreat, build, launch, or gather. Tie people to lakehouses, retreats, events.',
  },
  {
    glyph: '❖',
    title: 'Flow maps & teams',
    body: 'Save groups as collective flow maps — the strongest bonds, the friction to tend, the best base for the crew. Configure thriving teams, households and partnerships, then revisit them in your dashboard.',
  },
  {
    glyph: '𝝣',
    title: 'Privacy-first, always',
    body: 'You choose who sees your chart: only you, specific people you grant, accepted friends, or everyone. Enforced in the database — not just hidden in the UI.',
  },
];

export default function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-[#9a8fe0]/30 bg-[#11122b] p-7 shadow-2xl af-rise">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#5b5e72] hover:text-[#9698a8] text-sm"
          aria-label={t('Close tour')}
        >
          ✕
        </button>
        <div className="text-4xl mb-4 text-[#e3c07a]" style={{ fontFamily: 'var(--font-display), serif' }}>
          {step.glyph}
        </div>
        <h3 className="text-2xl font-serif text-[#ece9e0] mb-2">{t(step.title)}</h3>
        <p className="text-[#b6b3cf] leading-relaxed text-[15px]">{t(step.body)}</p>

        <div className="flex items-center justify-between mt-7">
          <div className="flex gap-1.5">
            {STEPS.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-[#e3c07a]' : 'w-1.5 bg-[#3a3a55]'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="text-sm text-[#9698a8] px-3 py-1.5">
                {t('Back')}
              </button>
            )}
            {last ? (
              <a
                href="/auth/login"
                className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 py-1.5"
              >
                {t('Enter AstralFlow')}
              </a>
            ) : (
              <button
                onClick={() => setI(i + 1)}
                className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 py-1.5"
              >
                {t('Next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
