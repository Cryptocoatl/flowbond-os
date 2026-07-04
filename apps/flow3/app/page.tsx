import Link from 'next/link';
import FilmFrame from './components/FilmFrame';
import EditorShowcase from './components/EditorShowcase';
import { Wordmark } from './components/Wordmark';

const SHOWCASE = [
  { seed: 5, prompt: 'Neon-rain Tokyo alley, anamorphic flares, slow dolly', len: '11s', model: 'Gen-4' },
  { seed: 0, prompt: 'Aerial over bioluminescent coastline at blue hour', len: '8s', model: 'Gen-4' },
  { seed: 6, prompt: 'Nebula bloom collapsing into a newborn star', len: '12s', model: 'Cinematic' },
  { seed: 2, prompt: 'Dust-lit cathedral, godrays, a figure turns to camera', len: '6s', model: 'Gen-4' },
  { seed: 4, prompt: 'Macro: dew on a fern uncurling, morning forest', len: '9s', model: 'Turbo' },
  { seed: 7, prompt: 'Crimson desert storm wall rolling over dunes', len: '10s', model: 'Cinematic' },
];

const CAPS = [
  { g: '⤓', t: 'Drop your footage', d: 'Bring your own videos and photos. FlowStudio reads the material and builds the cut around it.' },
  { g: '✶', t: 'Editor in the seat', d: 'Describe the vibe in plain words. The AI editor translates it into real cuts, grade and pacing.' },
  { g: '◳', t: 'Unify light & color', d: 'Mismatched clips, one look. Auto-match exposure and color, then push a cinematic grade across all of it.' },
  { g: '⛶', t: 'Reframe any size', d: 'One timeline, every aspect — wide 16:9, vertical 9:16, square, scope 2.39. Reframed, not cropped ugly.' },
  { g: '◐', t: 'Transitions & finish', d: 'Crossfades, dips, vignette, film grain, letterbox — the finishing touches that read as cinema.' },
  { g: '⬡', t: 'Export real files', d: 'Render the graded cut to a real video, ready to post. Higher-res generative finish coming next.' },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen bg-base">
      {/* ambient grade wash */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-teal/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-amber/10 blur-[130px]" />
      </div>

      <div className="relative z-10">
        {/* nav */}
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Wordmark />
          <div className="hidden md:flex items-center gap-8 text-sm text-ink-muted">
            <a href="#showcase" className="hover:text-ink transition">Showcase</a>
            <a href="#caps" className="hover:text-ink transition">Capabilities</a>
            <a href="#credits" className="hover:text-ink transition">FlowCredits</a>
          </div>
          <Link href="/studio" className="btn-render px-5 py-2 rounded-lg text-sm">
            Open Studio
          </Link>
        </nav>

        {/* hero */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border hairline text-xs text-ink-muted mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-rec" />
            The AI film studio · powered by FlowBond
          </div>
          <h1 className="display text-5xl sm:text-7xl lg:text-[5.5rem] leading-[0.95] mb-6">
            Cinema, <span className="text-grade">on command.</span>
          </h1>
          <p className="text-ink-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Drop your own footage. Tell the editor the vibe. FlowStudio cuts,
            grades, reframes and finishes it to cinematic quality — directed by words.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/studio" className="btn-render px-8 py-3.5 rounded-xl text-base">
              Start creating
            </Link>
            <a href="#showcase" className="btn-ghost px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2">
              ▶ Watch the reel
            </a>
          </div>

          {/* editor hero */}
          <div className="text-left">
            <EditorShowcase />
          </div>
        </section>

        {/* showcase */}
        <section id="showcase" className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-teal text-xs uppercase tracking-[0.2em] mb-2">Generated in FlowStudio</p>
              <h2 className="display text-3xl sm:text-4xl">The reel writes itself.</h2>
            </div>
            <Link href="/studio" className="hidden sm:block text-sm text-ink-muted hover:text-ink transition">
              Make your own →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOWCASE.map((s, i) => (
              <div key={i} className="group relative rounded-xl overflow-hidden ring-1 ring-white/8 hover:ring-teal/40 transition">
                <FilmFrame seed={s.seed} kb2={i % 2 === 0} className="aspect-video" />
                <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10 text-[0.6rem] tnum">
                  <span className="px-1.5 py-0.5 rounded bg-black/55 backdrop-blur text-ink">{s.model}</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/55 backdrop-blur text-teal-bright">{s.len}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent z-10">
                  <p className="text-xs text-ink/90 leading-snug">{s.prompt}</p>
                </div>
                <div className="absolute inset-0 grid place-items-center z-10 opacity-0 group-hover:opacity-100 transition">
                  <span className="w-12 h-12 rounded-full bg-white/90 text-black grid place-items-center text-lg">▶</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* capabilities */}
        <section id="caps" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="display text-3xl sm:text-4xl text-center mb-3">
            Not a toy. A <span className="text-grade">studio</span>.
          </h2>
          <p className="text-ink-muted text-center mb-12 max-w-xl mx-auto">
            Every stage of the craft — shot, cut, grade, score — in one prompt-driven pipeline.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPS.map((c) => (
              <div key={c.t} className="panel rounded-xl p-6 hover:border-teal/30 transition group">
                <div className="w-11 h-11 rounded-lg bg-panel-3 grid place-items-center text-xl text-teal-bright mb-4 group-hover:bg-teal/15 transition">
                  {c.g}
                </div>
                <h3 className="display text-lg mb-2">{c.t}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* credits strip */}
        <section id="credits" className="max-w-7xl mx-auto px-6 py-20">
          <div className="panel-raise rounded-2xl p-8 sm:p-12 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <p className="text-amber text-xs uppercase tracking-[0.2em] mb-3">One economy, every app</p>
              <h2 className="display text-3xl sm:text-4xl mb-4">
                Earn by living.<br />Spend on creating.
              </h2>
              <p className="text-ink-muted leading-relaxed mb-6">
                FlowStudio runs on <span className="text-teal">FlowCredits</span> — the
                FlowBond ecosystem currency. Grow a FlowGarden, move on a DANZ floor,
                complete missions: every credit you earn pours straight into your next
                film. New creators arrive with <span className="text-amber-bright">500&nbsp;⚡</span> already loaded.
              </p>
              <Link href="/studio" className="btn-render px-7 py-3 rounded-xl text-sm inline-block">
                Claim your credits
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['🌱', 'Garden', 'earn'], ['💃', 'DANZ', 'earn'], ['⚡', 'Studio', 'spend'], ['🎬', 'Films', 'spend'], ['🎮', 'Games', 'spend'], ['◇', 'Membership', 'spend']].map(([icon, label, kind], i) => (
                <div key={i} className="panel rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1.5">{icon}</div>
                  <div className="text-xs text-ink">{label}</div>
                  <div className={`text-[0.6rem] uppercase tracking-wider mt-0.5 ${kind === 'earn' ? 'text-teal' : 'text-amber'}`}>{kind}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* final cta */}
        <section className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="display text-4xl sm:text-5xl mb-5">
            What will you <span className="text-grade">direct</span>?
          </h2>
          <p className="text-ink-muted text-lg mb-9">
            Open the studio. Write a line. Watch it become cinema.
          </p>
          <Link href="/studio" className="btn-render px-10 py-4 rounded-xl text-lg inline-block">
            Open FlowStudio
          </Link>
        </section>

        {/* footer */}
        <footer className="border-t hairline py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-ink-faint text-sm">
            <Wordmark size={22} />
            <span>a FlowBond Layer-0 creation</span>
            <div className="flex gap-6">
              <a href="https://flowbond.life" className="hover:text-ink transition">FlowBond</a>
              <a href="https://flowme.one" className="hover:text-ink transition">FlowMe</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
