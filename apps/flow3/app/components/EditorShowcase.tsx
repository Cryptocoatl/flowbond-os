// A non-interactive replica of the FlowStudio editor — the landing hero.
// "The editor chrome itself is the hero." Mirrors the real /studio layout.
import FilmFrame from './FilmFrame';

const CLIPS = [
  { track: 0, start: 0, len: 26, seed: 5, label: 'establishing' },
  { track: 0, start: 27, len: 18, seed: 2, label: 'push-in' },
  { track: 0, start: 46, len: 22, seed: 7, label: 'reveal' },
  { track: 1, start: 12, len: 20, seed: 0, label: 'b-roll' },
  { track: 1, start: 50, len: 14, seed: 3, label: 'overlay' },
];

export default function EditorShowcase() {
  return (
    <div className="panel-raise rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
      {/* title bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b hairline bg-panel">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-ink-muted tnum">
            untitled_reel.flow · <span className="text-teal">2160p</span> · 24fps
          </span>
        </div>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
          FlowStudio
        </span>
      </div>

      <div className="grid grid-cols-[44px_1fr_180px]">
        {/* tool rail */}
        <div className="border-r hairline py-3 flex flex-col items-center gap-3 bg-panel">
          {['◳', '✶', '⛶', '◐', '♪', '⌗'].map((g, i) => (
            <div
              key={i}
              className={`w-8 h-8 grid place-items-center rounded-lg text-sm ${
                i === 1 ? 'bg-teal/15 text-teal-bright ring-1 ring-teal/40' : 'text-ink-faint'
              }`}
            >
              {g}
            </div>
          ))}
        </div>

        {/* preview monitor */}
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10">
            <FilmFrame seed={5} className="aspect-video" />
            {/* HUD */}
            <div className="absolute top-3 left-3 flex items-center gap-2 text-[0.65rem] tnum z-10">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 backdrop-blur text-amber-bright">
                <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-rec" /> REC
              </span>
              <span className="px-2 py-0.5 rounded bg-black/50 backdrop-blur text-ink-muted">
                16:9 · CINEMA
              </span>
            </div>
            <div className="absolute bottom-3 right-3 text-[0.65rem] tnum px-2 py-0.5 rounded bg-black/50 backdrop-blur text-ink z-10">
              00:08:14 / 00:11:00
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center justify-center gap-1 mt-3">
            <span className="transport-btn">⏮</span>
            <span className="transport-btn">◀</span>
            <span className="w-10 h-10 grid place-items-center rounded-full bg-white text-base">▶</span>
            <span className="transport-btn">▶</span>
            <span className="transport-btn">⏭</span>
          </div>
        </div>

        {/* inspector */}
        <div className="border-l hairline p-3 bg-panel">
          <p className="text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint mb-2">
            Generate
          </p>
          <div className="rounded-lg bg-base/60 border hairline p-2.5 text-[0.7rem] text-ink-muted leading-relaxed mb-3 h-20">
            a lone figure walks a neon-rain Tokyo alley, anamorphic flares,
            slow dolly…
          </div>
          {[
            ['Model', 'Gen-4 · Cinematic'],
            ['Ratio', '16:9'],
            ['Length', '11s'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[0.68rem] py-1.5 border-b hairline">
              <span className="text-ink-faint">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
          <div className="mt-3 btn-render text-center text-[0.72rem] py-2 rounded-lg">
            Render · 440 ⚡
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="border-t hairline bg-panel px-3 pt-2 pb-3">
        {/* ruler */}
        <div className="relative h-5 mb-1 ml-9">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-1 text-[0.55rem] tnum text-ink-faint"
              style={{ left: `${(i / 8) * 100}%` }}
            >
              {String(i * 2).padStart(2, '0')}s
            </span>
          ))}
          {/* playhead */}
          <span className="absolute -top-1 bottom-0 w-px bg-amber" style={{ left: '38%' }}>
            <span className="absolute -top-1 -left-[3px] w-[7px] h-[7px] rotate-45 bg-amber" />
          </span>
        </div>
        {/* tracks */}
        {[0, 1, 2].map((track) => (
          <div key={track} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span className="w-7 text-[0.55rem] text-ink-faint tnum text-right">
              {track === 2 ? 'A1' : `V${track + 1}`}
            </span>
            <div className="relative flex-1 h-9 rounded bg-base/50">
              {track === 2
                ? (
                  <div className="absolute inset-y-1.5 left-[4%] right-[18%] rounded bg-gradient-to-r from-teal-deep/40 to-teal/20 border border-teal/30 flex items-center px-2 gap-[2px]">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-[2px] bg-teal/50"
                        style={{ height: `${20 + Math.abs(Math.sin(i * 1.3)) * 60}%` }}
                      />
                    ))}
                  </div>
                )
                : CLIPS.filter((c) => c.track === track).map((c, i) => (
                  <div
                    key={i}
                    className="tl-clip absolute inset-y-1"
                    style={{ left: `${(c.start / 68) * 100}%`, width: `${(c.len / 68) * 100}%` }}
                  >
                    <FilmFrame seed={c.seed} className="absolute inset-0" />
                    <span className="absolute bottom-0.5 left-1.5 text-[0.5rem] text-white/80 z-10">
                      {c.label}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
