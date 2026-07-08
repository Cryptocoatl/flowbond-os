'use client';
import { useState } from 'react';
import type { Creation, Branch } from '../../lib/library';
import { Branch as BranchIcon, Film, Music, Play, Shield, Clock } from './icons';

const media = (p: string) => `/api/media?path=${encodeURIComponent(p)}`;
const poster = (p: string, t = 1) => `/api/poster?path=${encodeURIComponent(p)}&t=${t}`;

const kindColor: Record<Branch['kind'], string> = {
  clean: 'var(--cta)', lyric: 'var(--indigo)', hook: '#f59e0b', other: 'var(--muted)',
};

export default function CreationDetail({ creation }: { creation: Creation }) {
  const [active, setActive] = useState<Branch | undefined>(creation.branches[0]);
  const [certs, setCerts] = useState<Record<string, string>>(() =>
    Object.fromEntries(creation.branches.filter((b) => b.cert).map((b) => [b.name, b.cert!.id])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const cuts: { sceneId: string; start: number; end: number }[] = creation.cutSheet?.cuts ?? [];
  const bpm = creation.cutSheet?.beatmap?.bpm;
  const totalDur = cuts.length ? cuts[cuts.length - 1].end : 0;

  async function register(b: Branch) {
    setBusy(b.name);
    try {
      const res = await fetch('/api/origo/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: b.path, title: `${creation.title} — ${b.label}`, author: creation.author }),
      });
      const data = await res.json();
      if (data.certId) setCerts((c) => ({ ...c, [b.name]: data.certId }));
      else alert(data.reason || data.error || 'Registration failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{creation.title}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-white/50">
            {creation.author && <span>{creation.author}</span>}
            {bpm && <span className="flex items-center gap-1"><Music className="h-3.5 w-3.5" />{Math.round(bpm)} BPM</span>}
            <span className="flex items-center gap-1"><BranchIcon className="h-3.5 w-3.5" />{creation.branchCount} cuts</span>
            <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" />{creation.shotCount} shots</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Player */}
        <div className="panel relative overflow-hidden rounded-2xl">
          {active ? (
            <video key={active.path} src={media(active.path)} poster={poster(active.path)} controls playsInline
              className="mx-auto max-h-[72vh] w-auto bg-black" />
          ) : (
            <div className="grid h-96 place-items-center text-white/30">No cut rendered yet</div>
          )}
          {active && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm text-white/70">{active.label} · {active.sizeMB} MB</span>
              {certs[active.name] ? (
                <a href={`https://origo.flowme.one/?cert=${certs[active.name]}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium"
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <Shield className="h-3.5 w-3.5" /> {certs[active.name]}
                </a>
              ) : (
                <button onClick={() => register(active)} disabled={busy === active.name}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--cta)' }}>
                  <Shield className="h-3.5 w-3.5" /> {busy === active.name ? 'Registering…' : 'Register on Origo'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Branch tree */}
        <div>
          <h2 className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
            <BranchIcon className="h-4 w-4" /> Branches
          </h2>
          <div className="space-y-2">
            {creation.branches.map((b) => {
              const on = active?.name === b.name;
              return (
                <button key={b.name} onClick={() => setActive(b)}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: on ? 'var(--border-strong)' : 'var(--border)', background: on ? 'var(--panel-2)' : 'transparent' }}>
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: kindColor[b.kind] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{b.label}</span>
                    <span className="text-[11px] text-white/40">{b.sizeMB} MB · {new Date(b.mtime).toLocaleDateString()}</span>
                  </span>
                  {certs[b.name] && <Shield className="h-4 w-4 shrink-0" style={{ color: 'var(--emerald)' }} />}
                  {on && <Play className="h-4 w-4 shrink-0 text-white/70" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cut timeline */}
      {cuts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
            <Clock className="h-4 w-4" /> Cut timeline · {totalDur.toFixed(1)}s
          </h2>
          <div className="flex h-12 w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            {cuts.map((c, i) => (
              <div key={i} title={`${c.sceneId} · ${c.start.toFixed(1)}–${c.end.toFixed(1)}s`}
                className="group relative grid place-items-center border-r text-[10px] text-white/70 transition-colors hover:bg-white/5"
                style={{ width: `${((c.end - c.start) / totalDur) * 100}%`, borderColor: 'var(--border)', background: i % 2 ? 'var(--panel)' : 'var(--panel-2)' }}>
                <span className="truncate px-1">{c.sceneId}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shots */}
      {creation.shots.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
            <Film className="h-4 w-4" /> Generated shots
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {creation.shots.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <div className="relative aspect-[9/16] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={poster(s.path)} alt={s.id} loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-center text-[10px] text-white/80">{s.id}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
