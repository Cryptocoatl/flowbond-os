'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AstroProfile, Chart, RelContext } from '../../lib/astro/types';
import { INTENTIONS, intentionOf, rankMatches, resonanceAcross, type Match } from '../../lib/astro/matchmaking';
import { browserClient } from '../../lib/supabase';
import ScoreExplainer from './ScoreExplainer';
import ReadingPanel from './ReadingPanel';
import { useT } from '../../lib/i18n/provider';

type Mode = 'circle' | 'discover';
interface OpenRow { handle: string; display_name: string; avatar_color: string; i_sparked: boolean; they_sparked: boolean; is_friend: boolean }
interface SparkIn { handle: string; display_name: string; avatar_color: string; intention: string }

// ── resonance ring — a small, honest dial (score 0–100) ──────────────────────
function Ring({ score, color, size = 56 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`resonance ${score}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#242a3b" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="#ece9e0"
        style={{ fontFamily: 'var(--font-display), serif', fontSize: size * 0.3 }}>{score}</text>
    </svg>
  );
}

export default function Matchmaker({
  myChart, myHandle, circle, openTo: openToInit,
}: { myChart: Chart; myHandle: string; circle: AstroProfile[]; openTo: string[] }) {
  const t = useT();
  const [ctx, setCtx] = useState<RelContext>('romance');
  const [mode, setMode] = useState<Mode>('circle');
  const [open, setOpen] = useState<Set<string>>(new Set(openToInit));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [how, setHow] = useState(false);

  // discover state
  const [rows, setRows] = useState<OpenRow[]>([]);
  const [sparksIn, setSparksIn] = useState<SparkIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState('');

  const it = intentionOf(ctx);
  const matches = useMemo(() => rankMatches(myChart, circle, ctx), [myChart, circle, ctx]);

  // load discovery whenever we enter discover mode or change intention
  async function loadDiscover() {
    setLoading(true);
    const sb = browserClient();
    const [o, s] = await Promise.all([
      sb.rpc('open_matches', { intention: ctx }),
      sb.rpc('my_incoming_sparks'),
    ]);
    setRows((o.data as OpenRow[]) ?? []);
    setSparksIn((s.data as SparkIn[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { if (mode === 'discover') loadDiscover(); /* eslint-disable-next-line */ }, [mode, ctx]);

  async function toggleOpen(c: RelContext) {
    const next = new Set(open);
    next.has(c) ? next.delete(c) : next.add(c);
    setOpen(next);
    await browserClient().rpc('set_open_to', { intentions: Array.from(next) });
    if (mode === 'discover') loadDiscover();
  }

  async function spark(handle: string, intention: RelContext) {
    setFlash('');
    const { data, error } = await browserClient().rpc('send_spark', { target_handle: handle, intention });
    if (error) { setFlash(error.message); return; }
    const res = data as { status: string };
    if (res.status === 'matched') {
      setFlash(t('✨ It’s a match with @{h}! Your charts just opened — read your resonance below.', { h: handle }));
    } else {
      setFlash(t('Spark sent to @{h} ✦ — if they spark back, you bond and the deep read unlocks.', { h: handle }));
    }
    loadDiscover();
  }
  async function unspark(handle: string, intention: RelContext) {
    await browserClient().rpc('withdraw_spark', { target_handle: handle, intention });
    loadDiscover();
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 text-[#ece9e0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">{t('Find your people by resonance')}</p>
      <h1 className="text-4xl font-serif mb-2"
        style={{ background: 'linear-gradient(100deg,#ece9e0 15%,#e0708f 45%,#8f7cff 85%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {t('Matchmaker')}
      </h1>

      {/* how to play */}
      <button onClick={() => setHow(!how)} className="text-xs text-[#b6abec] underline decoration-dotted underline-offset-2">
        {how ? t('Hide how it works ▴') : t('How does this work? ▾')}
      </button>
      {how && (
        <div className="mt-3 rounded-xl border border-[#242a3b] bg-[#11131f]/80 p-4 text-sm text-[#b6b3cf] leading-relaxed space-y-2" style={{ animation: 'af-rise 0.25s ease-out' }}>
          <p><b className="text-[#ece9e0]">1.</b> {t('Choose what you’re looking for — romance, friendship, a home, or a project. Each lens weighs different planets.')}</p>
          <p><b className="text-[#ece9e0]">2.</b> {t('“Your circle” ranks the people you’re already bonded with by how your charts resonate for that intention — live math, tap any card to see exactly why.')}</p>
          <p><b className="text-[#ece9e0]">3.</b> {t('“Discover” shows people open to the same thing. Send a spark; if they spark back you bond, your charts open, and the full compatibility read unlocks. Nothing about your chart is shared until then.')}</p>
          <p className="text-[11px] text-[#5b5e72]">{t('The resonance number is real, deterministic math — never a verdict.')} <Link href="/guide#number" className="text-[#b6abec] underline decoration-dotted">{t('See how it’s computed ✦')}</Link></p>
        </div>
      )}

      {/* intention picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
        {INTENTIONS.map((i) => {
          const on = i.ctx === ctx;
          return (
            <button key={i.ctx} onClick={() => { setCtx(i.ctx); setExpanded(null); }}
              className="rounded-2xl border p-3 text-left transition active:scale-95"
              style={{ borderColor: on ? i.color : '#242a3b', background: on ? `${i.color}18` : '#11131f', boxShadow: on ? `0 0 24px -14px ${i.color}` : undefined }}>
              <div className="text-2xl">{i.glyph}</div>
              <div className="text-sm font-serif mt-1" style={{ color: on ? i.color : '#ece9e0' }}>{t(i.label)}</div>
              <div className="text-[10px] text-[#8a8ea3] leading-snug mt-0.5">{t(i.blurb)}</div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#5b5e72] mt-2">{t('This lens listens most to')} <span style={{ color: it.color }}>{t(it.weighs)}</span>.</p>

      {/* mode toggle */}
      <div className="mt-5 grid grid-cols-2 rounded-full border border-[#242a3b] p-1 text-sm">
        {(['circle', 'discover'] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setExpanded(null); }}
            className={`py-2 rounded-full transition ${mode === m ? 'bg-[#e3c07a] text-[#0a0b12] font-semibold' : 'text-[#9698a8]'}`}>
            {m === 'circle' ? t('Your circle') : t('Discover')}
          </button>
        ))}
      </div>

      {flash && <p className="mt-4 text-sm rounded-lg bg-[#8f7cff]/12 border border-[#8f7cff]/30 text-[#cfc8e8] px-3 py-2">{flash}</p>}

      {/* ── CIRCLE ── */}
      {mode === 'circle' && (
        <div className="mt-5 space-y-3">
          {matches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#242a3b] p-8 text-center text-[#9698a8]">
              <p>{t('No one in your circle yet to weigh.')}</p>
              <p className="text-sm mt-2">{t('Bond with people (or try Discover) and they’ll appear here, ranked by resonance.')}</p>
              <button onClick={() => setMode('discover')} className="af-btn af-btn-primary mt-4">{t('✦ Discover people')}</button>
            </div>
          )}
          {matches.map((m, i) => (
            <MatchCard key={m.profile.fbid} m={m} rank={i + 1} ctx={ctx} myChart={myChart} myHandle={myHandle}
              open={expanded === m.profile.fbid} onToggle={() => setExpanded(expanded === m.profile.fbid ? null : m.profile.fbid)} t={t} />
          ))}
        </div>
      )}

      {/* ── DISCOVER ── */}
      {mode === 'discover' && (
        <div className="mt-5 space-y-5">
          {/* your openness */}
          <div className="rounded-2xl border border-[#242a3b] bg-[#11131f]/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec] mb-2">{t('You’re open to')}</p>
            <div className="flex flex-wrap gap-2">
              {INTENTIONS.map((i) => {
                const on = open.has(i.ctx);
                return (
                  <button key={i.ctx} onClick={() => toggleOpen(i.ctx)}
                    className="text-xs px-3 py-1.5 rounded-full border transition active:scale-95"
                    style={{ borderColor: on ? i.color : '#2c3350', background: on ? `${i.color}1f` : 'transparent', color: on ? i.color : '#9698a8' }}>
                    {i.glyph} {t(i.label)} {on ? '✓' : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[#5b5e72] mt-2">{t('This is the only thing others see about your intentions. Your chart stays private until you match.')}</p>
          </div>

          {/* incoming sparks */}
          {sparksIn.length > 0 && (
            <div className="rounded-2xl border border-[#e0708f]/40 bg-[#e0708f]/8 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#e0708f] mb-2">✨ {t('Sparked you')}</p>
              <div className="space-y-2">
                {sparksIn.map((s) => (
                  <div key={s.handle + s.intention} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full shrink-0" style={{ background: s.avatar_color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#ece9e0] truncate">{s.display_name}</p>
                      <p className="text-[11px] text-[#9698a8]">@{s.handle} · {intentionOf(s.intention as RelContext).glyph} {t(intentionOf(s.intention as RelContext).label)}</p>
                    </div>
                    <button onClick={() => spark(s.handle, s.intention as RelContext)} className="af-btn af-btn-gold text-sm px-3 py-1.5 shrink-0">{t('Spark back → match')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* open pool for the current intention */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b5e72] mb-2">{it.glyph} {t('Open to')} {t(it.label).toLowerCase()}</p>
            {loading ? (
              <p className="text-sm text-[#9698a8] animate-pulse">{t('Reading the field…')}</p>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#242a3b] p-6 text-center text-[#9698a8] text-sm">
                {open.has(ctx)
                  ? t('No one else is open to this yet. You’re on the map — check back soon.')
                  : t('Toggle yourself open above to join this pool and see who else is here.')}
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.handle} className="flex items-center gap-3 rounded-xl border border-[#242a3b] bg-[#11131f]/80 p-3">
                    <span className="w-9 h-9 rounded-full shrink-0" style={{ background: r.avatar_color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#ece9e0] truncate">{r.display_name}</p>
                      <p className="text-[11px] text-[#9698a8]">@{r.handle}{r.is_friend ? ` · ${t('bonded')}` : ''}</p>
                    </div>
                    {r.is_friend ? (
                      <Link href="/match" onClick={() => setMode('circle')} className="text-[11px] text-[#7bd0c6]">{t('in your circle ✓')}</Link>
                    ) : r.i_sparked ? (
                      <button onClick={() => unspark(r.handle, ctx)} className="af-btn af-btn-ghost text-sm px-3 py-1.5 shrink-0">{t('Sparked ✓')}</button>
                    ) : (
                      <button onClick={() => spark(r.handle, ctx)}
                        className="af-btn text-sm px-3 py-1.5 shrink-0"
                        style={{ background: r.they_sparked ? '#e0708f' : `${it.color}22`, color: r.they_sparked ? '#0a0b12' : it.color, borderColor: it.color }}>
                        {r.they_sparked ? t('✨ Spark back') : `${it.glyph} ${t('Spark')}`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#5b5e72] mt-3">{t('Discovery shows only names & avatars — never charts. A mutual spark bonds you and opens the deep read, both ways.')}</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#3f4358] mt-10 leading-relaxed border-t border-white/5 pt-4">
        {t('Resonance is analyzed live from your real charts by the same deterministic engine behind every reading — patterns and tendencies, never fixed destiny. You always choose who you open to. ✦')}
      </p>
    </div>
  );
}

// ── one ranked match (circle) — tap to open the full resonance ───────────────
function MatchCard({ m, rank, ctx, myChart, myHandle, open, onToggle, t }: {
  m: Match; rank: number; ctx: RelContext; myChart: Chart; myHandle: string; open: boolean; onToggle: () => void; t: (s: string, v?: any) => string;
}) {
  const across = useMemo(() => resonanceAcross(myChart, m.profile.chart!), [myChart, m.profile]);
  const bigThree = `${m.profile.chart!.bodies.Sun.sign} ${t('Sun')} · ${m.profile.chart!.bodies.Moon.sign} ${t('Moon')}${m.profile.chart!.asc ? ` · ${m.profile.chart!.asc.sign} ${t('Rising')}` : ''}`;
  return (
    <div className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3 active:bg-white/2">
        <span className="text-xs text-[#5b5e72] w-4 shrink-0">{rank}</span>
        <span className="w-9 h-9 rounded-full shrink-0" style={{ background: m.profile.avatarColor }} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-serif text-[#ece9e0] truncate">{m.profile.displayName}</p>
          <p className="text-[11px] text-[#9698a8] truncate">{bigThree}</p>
        </div>
        <Ring score={m.score} color={m.band.color} />
      </button>
      <div className="px-4 pb-3 -mt-1 flex flex-col gap-1">
        <p className="text-xs" style={{ color: m.band.color }}>{t(m.band.label)}</p>
        {m.topFlow && <p className="text-xs text-[#b6b3cf]"><span className="text-[#7bd0c6]">↗</span> {m.topFlow}</p>}
        {m.topTend && <p className="text-xs text-[#b6b3cf]"><span className="text-[#e8956a]">↘</span> {m.topTend}</p>}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3" style={{ animation: 'af-rise 0.25s ease-out' }}>
          {/* strongest-as, across lenses */}
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#5b5e72] mb-1.5">{t('Across every lens')}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {across.map((a) => (
              <span key={a.intention.ctx} className="text-[11px] px-2 py-1 rounded-full border"
                style={{ borderColor: a.intention.ctx === ctx ? a.intention.color : '#242a3b', color: a.intention.color }}>
                {a.intention.glyph} {a.score}
              </span>
            ))}
          </div>
          <p className="text-sm text-[#cfc8e8] leading-relaxed">{m.panorama.headline}</p>
          <ScoreExplainer
            people={[{ name: t('You'), chart: myChart }, { name: m.profile.displayName, chart: m.profile.chart! }]}
            context={ctx} score={m.score} />
          <div className="mt-1">
            <ReadingPanel handles={[myHandle, m.profile.handle]} pair />
          </div>
          <Link href={`/chart/${m.profile.handle}`} className="af-btn af-btn-ghost w-full mt-3">{t('✦ Open their full resume')}</Link>
        </div>
      )}
    </div>
  );
}
