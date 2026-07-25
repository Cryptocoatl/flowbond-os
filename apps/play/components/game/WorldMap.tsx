'use client';
// WorldMap — the Portal de los Mundos. Lists the seven worlds with per-world
// progress and lock state (a world unlocks when the previous one is finished),
// and switches the active world on select. The heart of "travel between worlds".
import { WORLDS, TOTAL_MISSIONS, type KaiWorld } from '@/lib/kai/worlds';

export function WorldMap({
  progress,
  activeId,
  lang,
  onSelect,
  onClose,
}: {
  /** completed mission count per world id. */
  progress: Record<string, number>;
  activeId: string;
  lang: 'es' | 'en';
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const totalDone = WORLDS.reduce((s, w) => s + Math.min(progress[w.id] ?? 0, w.missions.length), 0);

  const isUnlocked = (w: KaiWorld, i: number) => {
    if (i === 0) return true;
    const prev = WORLDS[i - 1];
    return (progress[prev.id] ?? 0) >= prev.missions.length;
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[65] overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
      <div className="mx-auto max-w-3xl animate-fade-up py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-kai-text">
              {lang === 'es' ? 'Mapa de los Mundos' : 'Map of Worlds'}
            </h2>
            <p className="text-[13px] text-kai-muted">
              {lang === 'es' ? 'Sana cada mundo, misión por misión.' : 'Heal each world, mission by mission.'}{' '}
              <span className="text-kai-gold">
                {totalDone}/{TOTAL_MISSIONS}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-kai-text">
            {lang === 'es' ? 'Cerrar ✕' : 'Close ✕'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {WORLDS.map((w, i) => {
            const done = Math.min(progress[w.id] ?? 0, w.missions.length);
            const total = w.missions.length;
            const complete = done >= total;
            const unlocked = isUnlocked(w, i);
            const active = w.id === activeId;
            return (
              <button
                key={w.id}
                disabled={!unlocked}
                onClick={() => unlocked && onSelect(w.id)}
                className={[
                  'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all',
                  unlocked ? 'hover:scale-[1.01]' : 'cursor-not-allowed opacity-45',
                  active ? 'border-kai-gold/60 bg-kai-gold/[0.07]' : 'border-white/10 bg-white/[0.03]',
                ].join(' ')}
                style={{ boxShadow: active ? `0 0 30px -8px ${w.color}` : undefined }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                    style={{ background: `${w.color}22`, border: `1px solid ${w.color}55` }}
                  >
                    {unlocked ? w.emoji : '🔒'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-kai-text">{w.name[lang]}</div>
                      {complete && <span className="text-xs text-kai-jade">✓</span>}
                      {active && (
                        <span className="rounded-full bg-kai-gold/20 px-2 py-0.5 text-[10px] font-medium text-kai-gold">
                          {lang === 'es' ? 'aquí' : 'here'}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-kai-muted">
                      {unlocked ? w.guide[lang] : lang === 'es' ? 'Completa el mundo anterior' : 'Finish the previous world'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold" style={{ color: w.color }}>
                      {done}/{total}
                    </div>
                    <div className="text-[10px] text-kai-faint">{lang === 'es' ? 'misiones' : 'missions'}</div>
                  </div>
                </div>
                {/* progress bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${total ? (done / total) * 100 : 0}%`, background: w.color }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
