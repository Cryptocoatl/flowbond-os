'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Starfield from '../components/Starfield';
import Aurora from '../components/Aurora';
import {
  creationCost,
  MODES,
  VIDEO_DURATIONS,
  VIDEO_QUALITY,
  type CreationMode,
  type VideoQuality,
} from '@/lib/credits';

interface Creation {
  id: string;
  mode: CreationMode;
  prompt: string;
  title: string | null;
  status: 'dreaming' | 'rendering' | 'complete' | 'failed';
  cost: number;
  output_url: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<Creation['status'], string> = {
  dreaming: 'text-flow-violet bg-flow-violet/10 dreaming',
  rendering: 'text-flow-cyan bg-flow-cyan/10 dreaming',
  complete: 'text-flow-emerald bg-flow-emerald/10',
  failed: 'text-red-400 bg-red-400/10',
};

function CreditOrb({ balance }: { balance: number | null }) {
  return (
    <div className="glass rounded-2xl px-5 py-2.5 flex items-center gap-2.5 animate-pulse-glow">
      <span className="text-flow-gold text-lg">⚡</span>
      <span className="font-display font-bold text-lg tabular-nums">
        {balance === null ? '···' : balance.toLocaleString()}
      </span>
      <span className="text-white/40 text-xs uppercase tracking-wider">FlowCredits</span>
    </div>
  );
}

function Studio() {
  const params = useSearchParams();
  const initialMode = (params.get('mode') as CreationMode) ?? 'video';

  const [mode, setMode] = useState<CreationMode>(
    initialMode in MODES ? initialMode : 'video',
  );
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<VideoQuality>('cinematic');
  const [duration, setDuration] = useState<number>(10);
  const [balance, setBalance] = useState<number | null>(null);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cost = creationCost(mode, { quality, duration });

  const load = useCallback(async () => {
    const [creditsRes, creationsRes] = await Promise.all([
      fetch('/api/credits'),
      fetch('/api/create'),
    ]);
    if (creditsRes.status === 401) {
      setNeedsAuth(true);
      return;
    }
    const credits = await creditsRes.json();
    setBalance(credits.balance ?? 0);
    if (creationsRes.ok) {
      const data = await creationsRes.json();
      setCreations(data.creations ?? []);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setNotice('The cosmos is unreachable — check your connection.'));
  }, [load]);

  const manifest = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          options: mode === 'video' ? { quality, duration } : {},
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setNotice(
          `Not enough FlowCredits — this dream costs ${data.cost} ⚡. Earn more in the garden or on the dancefloor.`,
        );
        return;
      }
      if (!res.ok) {
        setNotice(data.error ?? 'Something rippled in the void. Try again.');
        return;
      }
      setBalance(data.balance);
      setCreations((prev) => [data.creation, ...prev]);
      setPrompt('');
      setNotice(null);
    } finally {
      setBusy(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="glass rounded-3xl p-10 max-w-md text-center">
          <div className="text-5xl mb-6">🌌</div>
          <h1 className="font-display text-3xl font-bold mb-3">The Studio awaits</h1>
          <p className="text-white/50 mb-8">
            One FlowBond identity opens every world. Sign in to claim your 500 ⚡
            welcome grant.
          </p>
          <Link
            href="/auth/login?next=/studio"
            className="btn-cosmic px-8 py-4 rounded-2xl font-bold inline-block"
          >
            Enter with FBID
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
      {/* Top bar */}
      <nav className="flex items-center justify-between py-6 mb-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-flow-violet to-flow-cyan flex items-center justify-center font-display font-bold text-lg">
            F3
          </div>
          <span className="font-display font-semibold tracking-widest text-white/90 hidden sm:block">
            FLOW3 STUDIO
          </span>
        </Link>
        <CreditOrb balance={balance} />
      </nav>

      {/* Composer */}
      <section className="glass rounded-3xl p-6 sm:p-10 mb-14">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
          What do you want to <span className="text-cosmic">bring into existence</span>?
        </h1>
        <p className="text-white/40 mb-8">
          If you can dream it and know how to prompt it, you can make it real.
        </p>

        {/* Mode pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(Object.entries(MODES) as [CreationMode, (typeof MODES)[CreationMode]][]).map(
            ([key, m]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === key
                    ? 'btn-cosmic'
                    : 'glass glass-hover text-white/60'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ),
          )}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={
            mode === 'video'
              ? 'A bioluminescent jungle at dawn, the camera gliding between glowing cacao trees while a heartbeat of drums rises…'
              : mode === 'game'
                ? 'A cooperative garden-defense game where players grow living plant allies that dance to the rhythm of real music…'
                : mode === 'world'
                  ? 'A floating temple city above Tulum where every visitor’s heartbeat shapes the architecture…'
                  : 'A mother ceiba tree whose roots are rivers of light, holding the whole ecosystem in her branches…'
          }
          className="w-full bg-black/30 border border-white/10 rounded-2xl p-5 text-white placeholder-white/25 focus:border-flow-violet/60 focus:outline-none focus:ring-2 focus:ring-flow-violet/20 resize-none text-lg mb-6"
        />

        {/* Video options */}
        {mode === 'video' && (
          <div className="flex flex-wrap gap-6 mb-8">
            <div>
              <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Quality</p>
              <div className="flex gap-2">
                {(
                  Object.entries(VIDEO_QUALITY) as [
                    VideoQuality,
                    (typeof VIDEO_QUALITY)[VideoQuality],
                  ][]
                ).map(([key, q]) => (
                  <button
                    key={key}
                    onClick={() => setQuality(key)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      quality === key
                        ? 'bg-flow-violet/30 border border-flow-violet/60 text-white'
                        : 'glass text-white/50'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Duration</p>
              <div className="flex gap-2">
                {VIDEO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      duration === d
                        ? 'bg-flow-cyan/20 border border-flow-cyan/60 text-white'
                        : 'glass text-white/50'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cost + manifest */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-white/50">
            This dream costs{' '}
            <span className="text-flow-gold font-display font-bold text-xl">{cost} ⚡</span>
          </p>
          <button
            onClick={manifest}
            disabled={busy || !prompt.trim()}
            className="btn-cosmic px-10 py-4 rounded-2xl font-bold text-lg w-full sm:w-auto"
          >
            {busy ? 'Manifesting…' : 'Manifest ✦'}
          </button>
        </div>

        {notice && (
          <p className="mt-5 text-sm text-flow-magenta bg-flow-magenta/10 border border-flow-magenta/30 rounded-xl px-4 py-3">
            {notice}
          </p>
        )}
      </section>

      {/* Gallery */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-6">
          Your creations{' '}
          <span className="text-white/30 text-base font-sans">
            {creations.length > 0 && `· ${creations.length}`}
          </span>
        </h2>
        {creations.length === 0 ? (
          <div className="glass rounded-3xl p-14 text-center text-white/35">
            <div className="text-4xl mb-4 animate-float">✦</div>
            Nothing manifested yet. The void is listening.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {creations.map((c) => (
              <div key={c.id} className="glass glass-hover rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{MODES[c.mode]?.icon ?? '✨'}</span>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[c.status]}`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed line-clamp-3 mb-4">
                  {c.title ?? c.prompt}
                </p>
                <div className="flex items-center justify-between text-xs text-white/35">
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  <span className="text-flow-gold/80">{c.cost} ⚡</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StudioPage() {
  return (
    <main className="relative min-h-screen bg-void">
      <Starfield />
      <Aurora />
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    </main>
  );
}
