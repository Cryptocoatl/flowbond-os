'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AstroProfile, RelContext } from '../../lib/astro/types';
import { synastry, REL_CONTEXTS } from '../../lib/astro/aspects';
import { panorama } from '../../lib/astro/interpret';
import { browserClient } from '../../lib/supabase';
import ReadingPanel from './ReadingPanel';
import BondInvite from './BondInvite';
import FindFriends from './FindFriends';
import Tour from './Tour';

type Mode = 'explore' | 'combine';

interface Node extends AstroProfile {
  x: number;
  y: number;
}

const SIZE = 620;
const C = SIZE / 2;
const R = 232;
// Invisible touch target around each star — the real fix for "can't tap": in a
// 620 viewBox scaled to a ~360px phone, r=34 ≈ a 40px tap zone (Apple minimum).
const HIT = 34;
const GHOST_HIT = 28;

function harmonyColor(score: number) {
  if (score >= 56) return '#7bd0c6';
  if (score <= 44) return '#e8956a';
  return '#6b6e86';
}

export interface GhostNode {
  id: string;
  display_name: string;
  avatar_color: string;
  sun: string | null;
  moon: string | null;
  rising: string | null;
  claim_code: string;
}

export interface SavedMap {
  id: string;
  name: string;
  context: string;
  member_count: number;
}

export default function Constellation({
  profiles,
  myFbid,
  hasProfile,
  guests = [],
  friendFbids = [],
  savedMaps = [],
}: {
  profiles: AstroProfile[];
  myFbid: string | null;
  hasProfile: boolean;
  guests?: GhostNode[];
  friendFbids?: string[];
  savedMaps?: SavedMap[];
}) {
  const friendSet = useMemo(() => new Set(friendFbids), [friendFbids]);
  const [addFriend, setAddFriend] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('explore');
  const [context, setContext] = useState<RelContext>('friendship');
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [activeGhost, setActiveGhost] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [mapName, setMapName] = useState('');
  const [mapPurpose, setMapPurpose] = useState('');
  const [mapIntention, setMapIntention] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [tour, setTour] = useState(false);

  // ghost avatars orbit an inner ring — charted, waiting to activate their FBID
  const ghostNodes = useMemo(() => {
    const n = guests.length || 1;
    return guests.map((g, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n;
      return { ...g, x: C + R * 0.6 * Math.cos(a), y: C + R * 0.6 * Math.sin(a) };
    });
  }, [guests]);

  function inviteGhost(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  }

  const activeGhostNode = guests.find((g) => g.id === activeGhost) ?? null;

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

  function switchMode(m: Mode) {
    setMode(m);
    setActive(null);
    setActiveGhost(null);
    setSelected([]);
    setSaveMsg('');
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
      body: JSON.stringify({ name: mapName, memberFbids: selected, context, purpose: mapPurpose, intention: mapIntention }),
    });
    const json = await res.json();
    setSaveMsg(res.ok ? 'Flow map saved ✦' : json.error || 'Failed to save');
    if (res.ok) { setMapName(''); setMapPurpose(''); setMapIntention(''); }
  }

  const activeProfile = active ? byFbid[active] : null;

  // On mobile the side panel becomes a bottom sheet that slides up only when
  // there's something to act on; on desktop (sm+) it's always the right column.
  const sheetOpen = mode === 'combine' || !!activeProfile || !!activeGhostNode;
  function closeSheet() {
    setActive(null);
    setActiveGhost(null);
    if (mode === 'combine') switchMode('explore');
  }

  // ── The detail / combine panel (one instance, repositioned responsively) ──
  const panel = (
    <div className="p-5 sm:p-5">
      {mode === 'explore' && activeProfile && (
        <div className="border border-[#242a3b] rounded-2xl p-5 bg-[#11131f]">
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
          <Link href={`/chart/${activeProfile.handle}`} className="af-btn af-btn-primary w-full mt-4">
            ✦ Open full resume — chart, systems &amp; map
          </Link>
          <ReadingPanel handles={[activeProfile.handle]} />
        </div>
      )}
      {mode === 'explore' && activeGhostNode && (
        <div className="border border-dashed border-[#3a4158] rounded-2xl p-5 bg-[#11131f]">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full border border-dashed" style={{ borderColor: activeGhostNode.avatar_color, background: `${activeGhostNode.avatar_color}33` }} />
            <h2 className="text-2xl font-serif text-[#ece9e0]">{activeGhostNode.display_name}</h2>
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8fb8e0] mt-1">ghost star · awaiting FBID</p>
          <p className="font-serif text-lg mt-3 text-[#cfc8e8]">
            {activeGhostNode.sun} Sun · {activeGhostNode.moon} Moon{activeGhostNode.rising ? ` · ${activeGhostNode.rising} Rising` : ''}
          </p>
          <p className="text-sm text-[#9698a8] mt-3 leading-relaxed">
            You charted them, but their star is still light passing through. Invite them to activate their
            FBID — they take this avatar space for real, and you&apos;re bonded into full flow.
          </p>
          <button
            onClick={() => inviteGhost(activeGhostNode.claim_code)}
            className="inline-block mt-4 text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-xl px-4 py-2.5 active:scale-95 transition"
          >
            {copied === activeGhostNode.claim_code ? 'Activation link copied ✓' : '✦ Copy their activation link'}
          </button>
        </div>
      )}
      {mode === 'explore' && !activeProfile && !activeGhostNode && (
        <div className="hidden sm:block border border-dashed border-[#242a3b] rounded-2xl p-8 text-center text-[#9698a8]">
          Tap a star to read their chart{guests.length > 0 ? ', or a ghost star ✦ to invite them in' : ''}.
        </div>
      )}

      {mode === 'combine' && (
        <div className="border border-[#242a3b] rounded-2xl p-5 bg-[#11131f]">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#b6abec] mb-3">Combine · {context}</h2>
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
            <p className="text-[#9698a8] text-sm">Tap two or more stars above to weave a flow map.</p>
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
              {pairPanorama && <p className="text-sm text-[#cfc8e8] mt-2 leading-relaxed">{pairPanorama.headline}</p>}
              {selectedProfiles.length >= 2 && <ReadingPanel handles={selectedProfiles.map((p) => p.handle)} pair />}
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <label className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72]">Save as a constellation</label>
                <input
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="Name it — e.g. Tulum retreat crew"
                  className="af-input"
                />
                <select value={mapPurpose} onChange={(e) => setMapPurpose(e.target.value)} className="af-input">
                  <option value="">What is this group? (optional)</option>
                  {['team / project', 'family', 'romance', 'co-living / house', 'friends', 'creative collab', 'dynamic mix'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <textarea
                  value={mapIntention}
                  onChange={(e) => setMapIntention(e.target.value)}
                  placeholder="Why this constellation? What do you want to understand together? (focuses the reading)"
                  rows={2}
                  className="af-input resize-none"
                />
                <button onClick={saveFlowMap} disabled={!mapName.trim() || !myFbid} className="af-btn af-btn-gold w-full">
                  ✦ Save constellation
                </button>
                {!myFbid && <p className="text-[10px] text-[#d9883c]">Sign in to save constellations.</p>}
                {saveMsg && <p className="text-xs text-[#7fd1a8]">{saveMsg}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative mx-auto max-w-5xl px-4 pt-3 pb-6 sm:pb-8">
      {/* ── Top bar: clean on mobile, full actions on desktop ── */}
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl font-serif text-[#ece9e0] leading-tight">AstralFlow</h1>
          <p className="hidden sm:block text-[#9698a8] text-sm">
            Your stars, woven with your people. Degree-accurate · privacy-first.
          </p>
        </div>

        {/* desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {myFbid && hasProfile && (
            <button onClick={() => setAddFriend((v) => !v)} className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#e3c07a] text-[#0a0b12] font-semibold">+ Add friend</button>
          )}
          <button onClick={() => setTour(true)} className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]">Tour</button>
          {myFbid && <Link href="/dashboard" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]">Dashboard</Link>}
          {myFbid ? (
            <Link href="/profile/new" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec]">{hasProfile ? 'Edit your chart' : '+ Add your profile'}</Link>
          ) : (
            <Link href="/auth/login" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#e3c07a] text-[#0a0b12] font-semibold">Log in</Link>
          )}
          {myFbid && (
            <button onClick={async () => { await browserClient().auth.signOut(); window.location.assign('/'); }} className="text-xs text-[#5b5e72] hover:text-[#9698a8]" title="Sign out">sign out</button>
          )}
        </div>

        {/* mobile: primary CTA + overflow menu */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          {myFbid ? (
            <Link href="/profile/new" className="text-[11px] font-semibold px-3 py-2 rounded-full bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] active:scale-95 transition">
              {hasProfile ? 'Edit' : '+ Chart'}
            </Link>
          ) : (
            <Link href="/auth/login" className="text-[11px] font-semibold px-3 py-2 rounded-full bg-[#e3c07a] text-[#0a0b12] active:scale-95 transition">Log in</Link>
          )}
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="More" className="w-9 h-9 grid place-items-center rounded-full border border-[#242a3b] text-[#cfc8e8] text-lg active:scale-90 transition">⋯</button>
        </div>
      </header>

      {/* mobile overflow menu */}
      {menuOpen && (
        <div className="sm:hidden mb-3 rounded-2xl border border-[#242a3b] bg-[#11131f] overflow-hidden af-rise">
          {myFbid && hasProfile && (
            <button onClick={() => { setAddFriend((v) => !v); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-[#cfc8e8] border-b border-white/5 active:bg-white/5">+ Add friend</button>
          )}
          {myFbid && <Link href="/dashboard" className="block px-4 py-3 text-sm text-[#cfc8e8] border-b border-white/5 active:bg-white/5">Dashboard</Link>}
          <button onClick={() => { setTour(true); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-[#cfc8e8] border-b border-white/5 active:bg-white/5">Take the tour</button>
          {myFbid && (
            <button onClick={async () => { await browserClient().auth.signOut(); window.location.assign('/'); }} className="w-full text-left px-4 py-3 text-sm text-[#9698a8] active:bg-white/5">Sign out</button>
          )}
        </div>
      )}

      {/* Add a friend — find them by handle, or share your bond link */}
      {addFriend && (
        <div className="mb-4 rounded-2xl border border-[#9a8fe0]/30 bg-[#11131f] p-4 af-rise space-y-4">
          <FindFriends />
          <div className="pt-3 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72] mb-2">Or share your bond link</p>
            <div className="flex flex-wrap items-center gap-3">
              <BondInvite />
              <span className="text-[11px] text-[#5b5e72]">
                or chart someone from their birth data on <Link href="/instant" className="text-[#b6abec] underline decoration-dotted">Instant</Link>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Saved constellations — horizontal scroll on mobile */}
      {savedMaps.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72] mb-2">Your saved constellations</div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap no-scrollbar">
            {savedMaps.map((m) => (
              <Link key={m.id} href={`/map/${m.id}`} className="group flex items-center gap-2 rounded-full border border-[#242a3b] bg-[#11131f] px-3 py-2 hover:border-[#9a8fe0]/50 transition shrink-0">
                <span className="text-[#e3c07a] text-xs">❖</span>
                <span className="text-sm text-[#ece9e0] whitespace-nowrap">{m.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#5b5e72] group-hover:text-[#9698a8] whitespace-nowrap">{m.context} · {m.member_count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Mode switch — big, unmissable segmented control ── */}
      <div className="flex p-1 rounded-2xl bg-[#11131f] border border-[#242a3b] mb-3">
        {(['explore', 'combine'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition active:scale-[0.98] ${
              mode === m ? 'bg-[#e3c07a] text-[#0a0b12] shadow' : 'text-[#9698a8]'
            }`}
          >
            {m === 'explore' ? '✶ Explore' : '✦ Combine'}
            {m === 'combine' && selected.length > 0 && (
              <span className={`ml-2 inline-grid place-items-center min-w-5 h-5 px-1 rounded-full text-[11px] ${mode === m ? 'bg-[#0a0b12]/20 text-[#0a0b12]' : 'bg-[#9a8fe0]/30 text-[#cfc8e8]'}`}>{selected.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Relationship lens — horizontal scroll on mobile */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72] shrink-0">Lens</span>
        {REL_CONTEXTS.map((c) => (
          <button
            key={c}
            onClick={() => setContext(c)}
            className={`text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-full border shrink-0 transition active:scale-95 ${
              context === c ? 'bg-[#9a8fe0]/20 border-[#9a8fe0]/50 text-[#cfc8e8]' : 'border-[#242a3b] text-[#9698a8]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="sm:grid sm:grid-cols-2 sm:gap-6">
        {/* The constellation */}
        <div>
          {profiles.length === 0 ? (
            <div className="aspect-square rounded-2xl border border-dashed border-[#242a3b] flex flex-col items-center justify-center text-center p-8">
              <p className="text-[#9698a8] mb-4">No charts you can see yet.</p>
              <Link href="/profile/new" className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-xl px-5 py-3 active:scale-95 transition">+ Add your profile</Link>
            </div>
          ) : (
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[560px] mx-auto block select-none" style={{ touchAction: 'manipulation' }}>
              {/* edges (combine mode) */}
              {edges.map((e, i) => (
                <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={harmonyColor(e.score)} strokeWidth={1.5 + Math.abs(e.score - 50) / 18} strokeOpacity={0.75} />
              ))}
              <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(154,143,224,0.10)" />
              {avgScore !== null && (
                <text x={C} y={C} textAnchor="middle" dominantBaseline="middle" className="fill-[#ece9e0]" style={{ fontSize: 38, fontFamily: 'var(--font-display), serif' }}>{avgScore}</text>
              )}
              {avgScore !== null && (
                <text x={C} y={C + 28} textAnchor="middle" className="fill-[#5b5e72]" style={{ fontSize: 12, letterSpacing: 2 }}>{context.toUpperCase()} FLOW</text>
              )}
              {/* ghost avatars — charted connections awaiting FBID activation */}
              {ghostNodes.map((g) => {
                const on = activeGhost === g.id;
                return (
                  <g key={g.id} onClick={() => { setActive(null); setActiveGhost((x) => (x === g.id ? null : g.id)); }} style={{ cursor: 'pointer' }}>
                    {/* big invisible hit target */}
                    <circle cx={g.x} cy={g.y} r={GHOST_HIT} fill="transparent" />
                    <circle cx={g.x} cy={g.y} r={on ? 13 : 9} fill={g.avatar_color} opacity={on ? 0.4 : 0.18} stroke={g.avatar_color} strokeWidth={1.2} strokeDasharray="2 2" strokeOpacity={0.7} />
                    <text x={g.x} y={g.y > C ? g.y + 22 : g.y - 14} textAnchor="middle" className="fill-[#8fb8e0]" style={{ fontSize: 11 }}>{g.display_name} ✦</text>
                  </g>
                );
              })}
              {nodes.map((n) => {
                const isSel = selected.includes(n.fbid);
                const isActive = active === n.fbid;
                const isFriend = friendSet.has(n.fbid);
                const isMe = n.fbid === myFbid;
                const r = isSel || isActive ? 15 : 11;
                return (
                  <g key={n.fbid} onClick={() => { setActiveGhost(null); onNodeClick(n.fbid); }} style={{ cursor: 'pointer' }}>
                    {/* big invisible hit target — reliable tapping on mobile */}
                    <circle cx={n.x} cy={n.y} r={HIT} fill="transparent" />
                    <circle cx={n.x} cy={n.y} r={r + 7} fill={n.avatarColor} opacity={isSel || isActive ? 0.3 : 0.13} />
                    {(isFriend || isMe) && !isSel && (
                      <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="#e3c07a" strokeWidth={1.6} strokeOpacity={0.85} />
                    )}
                    <circle cx={n.x} cy={n.y} r={r} fill={n.avatarColor} stroke={isSel ? '#e3c07a' : 'transparent'} strokeWidth={3} />
                    <text x={n.x} y={n.y > C ? n.y + 26 : n.y - 17} textAnchor="middle" className="fill-[#cfc8e8]" style={{ fontSize: 13 }}>{n.displayName}</text>
                  </g>
                );
              })}
            </svg>
          )}
          <p className="text-[11px] text-[#5b5e72] text-center mt-2">
            {mode === 'explore' ? 'Tap a star to read their chart.' : 'Tap stars to weave them — lines show how each connection flows under this lens.'}
          </p>
        </div>

        {/* Panel: desktop right column / mobile bottom sheet */}
        <aside
          className={
            'z-40 transition-transform duration-300 ease-out ' +
            // mobile sheet
            'fixed inset-x-0 bottom-0 max-h-[74vh] overflow-y-auto rounded-t-3xl border-t border-[#242a3b] bg-[#0c0e1a]/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ' +
            (sheetOpen ? 'translate-y-0' : 'translate-y-full') + ' ' +
            // desktop column
            'sm:static sm:max-h-none sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:backdrop-blur-0 sm:shadow-none sm:translate-y-0'
          }
          style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        >
          {/* grab handle + close (mobile only) */}
          <div className="sm:hidden sticky top-0 z-10 flex items-center justify-between px-4 pt-2.5 pb-1.5 bg-[#0c0e1a]/95 backdrop-blur-md">
            <span className="mx-auto h-1.5 w-10 rounded-full bg-[#3a4158]" />
            <button onClick={closeSheet} aria-label="Close" className="absolute right-3 top-2 w-8 h-8 grid place-items-center rounded-full text-[#9698a8] active:scale-90">✕</button>
          </div>
          {panel}
        </aside>
      </div>

      <Tour open={tour} onClose={() => setTour(false)} />
    </div>
  );
}
