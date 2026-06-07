'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AstroProfile, RelContext } from '../../lib/astro/types';
import { synastry, REL_CONTEXTS } from '../../lib/astro/aspects';
import { panorama } from '../../lib/astro/interpret';
import { browserClient } from '../../lib/supabase';
import ReadingPanel from './ReadingPanel';
import BondInvite from './BondInvite';
import Tour from './Tour';

type Mode = 'explore' | 'combine';

interface Node extends AstroProfile {
  x: number;
  y: number;
}

const SIZE = 620;
const C = SIZE / 2;
const R = 232;

function harmonyColor(score: number) {
  if (score >= 56) return '#7bd0c6';
  if (score <= 44) return '#e8956a';
  return '#6b6e86';
}

export default function Constellation({
  profiles,
  myFbid,
  hasProfile,
}: {
  profiles: AstroProfile[];
  myFbid: string | null;
  hasProfile: boolean;
}) {
  const [mode, setMode] = useState<Mode>('explore');
  const [context, setContext] = useState<RelContext>('friendship');
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [mapName, setMapName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [tour, setTour] = useState(false);

  const nodes: Node[] = useMemo(() => {
    const n = profiles.length || 1;
    return profiles.map((p, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { ...p, x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
    });
  }, [profiles]);

  const byFbid = useMemo(() => Object.fromEntries(nodes.map((n) => [n.fbid, n])), [nodes]);

  function onNodeClick(fbid: string) {
    setSaveMsg('');
    if (mode === 'explore') {
      setActive((a) => (a === fbid ? null : fbid));
    } else {
      setSelected((s) => (s.includes(fbid) ? s.filter((x) => x !== fbid) : [...s, fbid]));
    }
  }

  // Pairwise scores between selected nodes (combine mode) drive edge colour + a
  // live, deterministic compatibility read — computed client-side by the engine.
  const edges = useMemo(() => {
    if (mode !== 'combine' || selected.length < 2) return [];
    const out: { a: Node; b: Node; score: number }[] = [];
    for (let i = 0; i < selected.length; i++)
      for (let j = i + 1; j < selected.length; j++) {
        const a = byFbid[selected[i]];
        const b = byFbid[selected[j]];
        if (a?.chart && b?.chart) out.push({ a, b, score: synastry(a.chart, b.chart, context).score });
      }
    return out;
  }, [mode, selected, context, byFbid]);

  const avgScore = edges.length ? Math.round(edges.reduce((s, e) => s + e.score, 0) / edges.length) : null;
  const selectedProfiles = selected.map((f) => byFbid[f]).filter(Boolean);
  const pairPanorama =
    selectedProfiles.length === 2 && selectedProfiles[0].chart && selectedProfiles[1].chart
      ? panorama(selectedProfiles[0].chart, selectedProfiles[1].chart, context)
      : null;

  async function saveFlowMap() {
    setSaveMsg('');
    const res = await fetch('/api/flowmap', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: mapName, memberFbids: selected, context }),
    });
    const json = await res.json();
    setSaveMsg(res.ok ? 'Flow map saved ✦' : json.error || 'Failed to save');
    if (res.ok) setMapName('');
  }

  const activeProfile = active ? byFbid[active] : null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-serif text-[#ece9e0]">AstroFlow</h1>
          <p className="text-[#9698a8] text-sm">
            Your stars, woven with your people. Degree-accurate · privacy-first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-[#242a3b] overflow-hidden">
            {(['explore', 'combine'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setActive(null);
                  setSelected([]);
                }}
                className={`px-4 py-1.5 text-xs uppercase tracking-wider ${
                  mode === m ? 'bg-[#e3c07a] text-[#0a0b12]' : 'text-[#9698a8]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTour(true)}
            className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]"
          >
            Tour
          </button>
          {myFbid && (
            <Link
              href="/dashboard"
              className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]"
            >
              Dashboard
            </Link>
          )}
          {myFbid ? (
            <Link
              href="/profile/new"
              className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec]"
            >
              {hasProfile ? 'Edit your chart' : '+ Add your profile'}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#e3c07a] text-[#0a0b12] font-semibold"
            >
              Log in
            </Link>
          )}
          {myFbid && (
            <button
              onClick={async () => {
                await browserClient().auth.signOut();
                window.location.assign('/');
              }}
              className="text-xs text-[#5b5e72] hover:text-[#9698a8]"
              title="Sign out"
            >
              sign out
            </button>
          )}
        </div>
      </header>

      {/* Relationship lens — re-weights every connection for the chosen context */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72]">Lens</span>
        {REL_CONTEXTS.map((c) => (
          <button
            key={c}
            onClick={() => setContext(c)}
            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${
              context === c
                ? 'bg-[#9a8fe0]/20 border-[#9a8fe0]/50 text-[#cfc8e8]'
                : 'border-[#242a3b] text-[#9698a8]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* The constellation */}
        <div>
          {profiles.length === 0 ? (
            <div className="aspect-square rounded-2xl border border-dashed border-[#242a3b] flex flex-col items-center justify-center text-center p-8">
              <p className="text-[#9698a8] mb-4">No charts you can see yet.</p>
              <Link
                href="/profile/new"
                className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5"
              >
                + Add your profile
              </Link>
            </div>
          ) : (
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full">
              {/* edges (combine mode) */}
              {edges.map((e, i) => (
                <line
                  key={i}
                  x1={e.a.x}
                  y1={e.a.y}
                  x2={e.b.x}
                  y2={e.b.y}
                  stroke={harmonyColor(e.score)}
                  strokeWidth={1 + Math.abs(e.score - 50) / 20}
                  strokeOpacity={0.7}
                />
              ))}
              <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(154,143,224,0.10)" />
              {avgScore !== null && (
                <text x={C} y={C} textAnchor="middle" dominantBaseline="middle" className="fill-[#ece9e0]" style={{ fontSize: 34, fontFamily: 'var(--font-display), serif' }}>
                  {avgScore}
                </text>
              )}
              {avgScore !== null && (
                <text x={C} y={C + 26} textAnchor="middle" className="fill-[#5b5e72]" style={{ fontSize: 11, letterSpacing: 2 }}>
                  {context.toUpperCase()} FLOW
                </text>
              )}
              {nodes.map((n) => {
                const isSel = selected.includes(n.fbid);
                const isActive = active === n.fbid;
                const r = isSel || isActive ? 13 : 9;
                return (
                  <g key={n.fbid} onClick={() => onNodeClick(n.fbid)} style={{ cursor: 'pointer' }}>
                    <circle cx={n.x} cy={n.y} r={r + 6} fill={n.avatarColor} opacity={isSel || isActive ? 0.28 : 0.12} />
                    <circle cx={n.x} cy={n.y} r={r} fill={n.avatarColor} stroke={isSel ? '#e3c07a' : 'transparent'} strokeWidth={2.5} />
                    <text
                      x={n.x}
                      y={n.y > C ? n.y + 24 : n.y - 16}
                      textAnchor="middle"
                      className="fill-[#cfc8e8]"
                      style={{ fontSize: 12 }}
                    >
                      {n.displayName}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
          <p className="text-[10px] text-[#5b5e72] text-center mt-1">
            {mode === 'explore'
              ? 'Tap a star to read their chart.'
              : 'Tap stars to weave them — lines show how each connection flows under this lens.'}
          </p>
        </div>

        {/* Side panel */}
        <div>
          {mode === 'explore' && activeProfile && (
            <div className="border border-[#242a3b] rounded-xl p-5 bg-[#11131f]">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full" style={{ background: activeProfile.avatarColor }} />
                <h2 className="text-2xl font-serif text-[#ece9e0]">{activeProfile.displayName}</h2>
              </div>
              <p className="text-xs font-mono text-[#5b5e72] mt-1">
                @{activeProfile.handle} · {activeProfile.visibility}
              </p>
              <p className="font-serif text-lg mt-3 text-[#ece9e0]">
                {activeProfile.chart.bodies.Sun.sign} Sun · {activeProfile.chart.bodies.Moon.sign} Moon
                {activeProfile.chart.asc ? ` · ${activeProfile.chart.asc.sign} Rising` : ''}
              </p>
              <Link
                href={`/chart/${activeProfile.handle}`}
                className="inline-block mt-4 text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2"
              >
                Open full chart →
              </Link>
              <ReadingPanel handles={[activeProfile.handle]} />
            </div>
          )}
          {mode === 'explore' && !activeProfile && (
            <div className="border border-dashed border-[#242a3b] rounded-xl p-8 text-center text-[#9698a8]">
              Tap a star to read their chart.
            </div>
          )}

          {mode === 'combine' && (
            <div className="border border-[#242a3b] rounded-xl p-5 bg-[#11131f]">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#b6abec] mb-3">
                Combine · {context}
              </h2>
              {/* Missing someone? One link bonds your skies and they appear here. */}
              {myFbid && (
                <div className="mb-4 pb-4 border-b border-white/5">
                  <BondInvite compact />
                  <p className="text-[10px] text-[#5b5e72] mt-1.5">
                    Send your astrobond link — they create their FBID + chart, you see each other
                    everywhere, and you can weave them into any universe.
                  </p>
                </div>
              )}
              {selectedProfiles.length < 2 ? (
                <p className="text-[#9698a8] text-sm">Select two or more stars to weave a flow map.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedProfiles.map((p) => (
                      <span key={p.fbid} className="text-xs px-2.5 py-1 rounded-full" style={{ background: `${p.avatarColor}22`, color: '#cfc8e8' }}>
                        {p.displayName}
                      </span>
                    ))}
                  </div>
                  {avgScore !== null && (
                    <p className="font-serif text-[#ece9e0]">
                      {selectedProfiles.length === 2 ? 'Compatibility' : 'Group flow'}:{' '}
                      <b style={{ color: harmonyColor(avgScore) }}>{avgScore}</b> / 100
                    </p>
                  )}
                  {pairPanorama && (
                    <p className="text-sm text-[#cfc8e8] mt-2 leading-relaxed">{pairPanorama.headline}</p>
                  )}

                  {/* FlowMe narrative for a pair or a collective (with context switch) */}
                  {selectedProfiles.length >= 2 && (
                    <ReadingPanel handles={selectedProfiles.map((p) => p.handle)} pair />
                  )}

                  {/* Save collective flow map */}
                  <div className="mt-5 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72]">
                      Save as collective flow map
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        value={mapName}
                        onChange={(e) => setMapName(e.target.value)}
                        placeholder="e.g. Tulum retreat crew"
                        className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm text-[#ece9e0]"
                      />
                      <button
                        onClick={saveFlowMap}
                        disabled={!mapName.trim() || !myFbid}
                        className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                    {!myFbid && <p className="text-[10px] text-[#d9883c] mt-1">Sign in to save flow maps.</p>}
                    {saveMsg && <p className="text-xs text-[#7fd1a8] mt-2">{saveMsg}</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Tour open={tour} onClose={() => setTour(false)} />
    </div>
  );
}
