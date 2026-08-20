'use client';
// WorldMap — the Atlas: the one place that answers "where am I, what is left,
// and what am I actually being asked to do?"
//
// It used to be a grid of seven cards with an x/total counter, which told you
// a world had 18 missions but never what any of them were. The 92 missions are
// the whole game, so the Atlas now opens each world and lists them: what is
// done, what you are on right now, what is still ahead, and what each one asks
// of you. Laid out as a master/detail on a laptop and as two stacked screens
// on a phone, both inside the safe area.
import { useEffect, useState } from 'react';
import { WORLDS, TOTAL_MISSIONS, type KaiWorld, type MissionTipo } from '@/lib/kai/worlds';

/** What the verb asks of you, in one word — the same vocabulary the HUD uses. */
const TIPO: Record<MissionTipo, { es: string; en: string; icon: string }> = {
  recoger: { es: 'Recoger', en: 'Collect', icon: '✨' },
  tocar: { es: 'Tocar', en: 'Touch', icon: '👆' },
  limpiar: { es: 'Limpiar', en: 'Clear', icon: '🧹' },
  llevar: { es: 'Escalar', en: 'Climb', icon: '🗼' },
  circulo: { es: 'Quedarte', en: 'Stand', icon: '⭕' },
  quiz: { es: 'Responder', en: 'Answer', icon: '❓' },
  encontrar: { es: 'Encontrar', en: 'Find', icon: '🔎' },
  anillos: { es: 'Atravesar', en: 'Fly through', icon: '⭕' },
  construir: { es: 'Crear', en: 'Build', icon: '🔨' },
};

function Ring({ done, total, color, size = 44 }: { done: number; total: number; color: string; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#E9EEEB" fontWeight="600">
        {done}
      </text>
    </svg>
  );
}

export function WorldMap({
  progress,
  activeId,
  lang,
  xp,
  onSelect,
  onClose,
}: {
  /** completed mission count per world id. */
  progress: Record<string, number>;
  activeId: string;
  lang: 'es' | 'en';
  /** total XP earned, shown in the Atlas header. */
  xp?: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string>(activeId);
  const [detailOnPhone, setDetailOnPhone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalDone = WORLDS.reduce((s, w) => s + Math.min(progress[w.id] ?? 0, w.missions.length), 0);
  const worldsDone = WORLDS.filter((w) => (progress[w.id] ?? 0) >= w.missions.length).length;

  const isUnlocked = (i: number) => {
    if (i === 0) return true;
    const prev = WORLDS[i - 1];
    return (progress[prev.id] ?? 0) >= prev.missions.length;
  };

  const open = WORLDS.find((w) => w.id === openId) ?? WORLDS[0];
  const openIdx = WORLDS.findIndex((w) => w.id === open.id);
  const openUnlocked = isUnlocked(openIdx);
  const openDone = Math.min(progress[open.id] ?? 0, open.missions.length);

  const t =
    lang === 'es'
      ? { title: 'Atlas de los Mundos', lead: 'Siete mundos, una misión a la vez.', missions: 'misiones', worlds: 'mundos', close: 'Cerrar', travel: 'Viajar aquí', here: 'Estás aquí', locked: 'Completa el mundo anterior para abrirlo', now: 'Ahora', doneL: 'Hecho', next: 'Después', back: 'Mundos', guide: 'Guía', all: 'en total' }
      : { title: 'Atlas of Worlds', lead: 'Seven worlds, one mission at a time.', missions: 'missions', worlds: 'worlds', close: 'Close', travel: 'Travel here', here: "You're here", locked: 'Finish the previous world to open it', now: 'Now', doneL: 'Done', next: 'Later', back: 'Worlds', guide: 'Guide', all: 'in total' };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[65] flex flex-col bg-[#05070a]/92 backdrop-blur-xl"
      style={{ paddingTop: 'var(--sa-t)', paddingBottom: 'var(--sa-b)', paddingLeft: 'var(--sa-l)', paddingRight: 'var(--sa-r)' }}
    >
      {/* ---- header (sticky; the counters are the point of the screen) ---- */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        {/* On a phone the detail is its own screen, so it needs a way back. */}
        {detailOnPhone ? (
          <button onClick={() => setDetailOnPhone(false)} className="hud-icon hud-tap md:hidden" aria-label={t.back}>
            ←
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-semibold text-kai-text sm:text-2xl">{t.title}</h2>
          <p className="truncate text-[12px] text-kai-muted">
            <span className="text-kai-gold">
              {totalDone}/{TOTAL_MISSIONS}
            </span>{' '}
            {t.missions} · <span className="text-kai-jade">{worldsDone}/7</span> {t.worlds}
            {xp !== undefined ? <> · <span className="text-kai-gold">✦ {xp}</span></> : null}
          </p>
        </div>
        <button onClick={onClose} className="hud-pill hud-tap shrink-0">
          {t.close} ✕
        </button>
      </div>

      {/* ---- body: list | detail ---- */}
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(18rem,26rem)_1fr]">
        {/* world list */}
        <div className={`min-h-0 overflow-y-auto px-3 py-3 md:border-r md:border-white/[0.07] ${detailOnPhone ? 'hidden md:block' : ''}`}>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            {WORLDS.map((w, i) => {
              const done = Math.min(progress[w.id] ?? 0, w.missions.length);
              const total = w.missions.length;
              const complete = done >= total;
              const unlocked = isUnlocked(i);
              const here = w.id === activeId;
              const sel = w.id === open.id;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    setOpenId(w.id);
                    setDetailOnPhone(true);
                  }}
                  className={[
                    'group relative w-full overflow-hidden rounded-2xl border p-3 text-left transition-colors',
                    sel ? 'border-kai-gold/50 bg-kai-gold/[0.07]' : 'border-white/10 bg-white/[0.025]',
                    unlocked ? '' : 'opacity-55',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl"
                      style={{ background: `${w.color}22`, border: `1px solid ${w.color}55` }}
                    >
                      {unlocked ? w.emoji : '🔒'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-kai-text">{w.name[lang]}</span>
                        {complete && <span className="text-xs text-kai-jade">✓</span>}
                        {here && (
                          <span className="shrink-0 rounded-full bg-kai-gold/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-kai-gold">
                            {t.here}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-kai-muted">
                        {unlocked ? `${w.guideEmoji} ${w.guide[lang]}` : t.locked}
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%`, background: w.color }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[13px] font-semibold" style={{ color: w.color }}>
                        {done}/{total}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-kai-faint">{t.missions}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* mission list for the open world */}
        <div className={`min-h-0 overflow-y-auto px-3 py-3 sm:px-4 ${detailOnPhone ? '' : 'hidden md:block'}`}>
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
              <Ring done={openDone} total={open.missions.length} color={open.color} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-kai-text">
                    {open.emoji} {open.name[lang]}
                  </h3>
                  <span className="text-[11px] text-kai-faint">
                    {openDone}/{open.missions.length} {t.missions}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-kai-muted">{open.intro[lang]}</p>
                <p className="mt-1 text-[11px] text-kai-faint">
                  {t.guide}: {open.guideEmoji} {open.guide[lang]}
                </p>
              </div>
            </div>

            {openUnlocked ? (
              <button
                onClick={() => onSelect(open.id)}
                disabled={open.id === activeId}
                className="mt-3 w-full rounded-full border border-kai-gold/40 bg-kai-gold/15 px-5 py-3 text-sm font-semibold text-kai-gold transition-transform active:scale-[0.99] disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-kai-faint"
              >
                {open.id === activeId ? `✓ ${t.here}` : `🌀 ${t.travel}`}
              </button>
            ) : (
              <div className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-sm text-kai-faint">
                🔒 {t.locked}
              </div>
            )}

            <ol className="mt-3 space-y-1.5 pb-6">
              {open.missions.map((m, i) => {
                const state = i < openDone ? 'done' : i === openDone ? 'now' : 'next';
                const tipo = TIPO[m.tipo];
                return (
                  <li
                    key={i}
                    className={[
                      'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
                      state === 'now'
                        ? 'border-kai-gold/40 bg-kai-gold/[0.08]'
                        : state === 'done'
                          ? 'border-white/[0.07] bg-white/[0.02]'
                          : 'border-white/[0.06] bg-transparent',
                    ].join(' ')}
                  >
                    <span
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                      style={
                        state === 'done'
                          ? { background: 'rgba(111,207,151,0.18)', color: '#6FCF97' }
                          : state === 'now'
                            ? { background: 'rgba(244,194,90,0.2)', color: '#F4C25A' }
                            : { background: 'rgba(255,255,255,0.05)', color: '#586762' }
                      }
                    >
                      {state === 'done' ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="shrink-0">{m.emoji}</span>
                        <span className={`text-[13px] font-medium ${state === 'next' ? 'text-kai-muted' : 'text-kai-text'}`}>{m.title[lang]}</span>
                        {state === 'now' && (
                          <span className="shrink-0 rounded-full bg-kai-gold/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-kai-gold">
                            {t.now}
                          </span>
                        )}
                      </div>
                      {/* Upcoming missions stay a one-liner: the Atlas is a map,
                          not a walkthrough that spoils every world in advance. */}
                      {state !== 'next' && <div className="mt-0.5 text-[11.5px] leading-snug text-kai-muted">{m.desc[lang]}</div>}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-kai-faint">
                        <span>
                          {tipo.icon} {tipo[lang]}
                          {m.tipo !== 'quiz' && m.tipo !== 'encontrar' ? ` ×${m.n}` : ''}
                        </span>
                        <span>· ✦ {m.xp}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
