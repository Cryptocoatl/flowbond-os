import Link from 'next/link';
import Starfield from './components/Starfield';
import Aurora from './components/Aurora';
import { MODES } from '@/lib/credits';

const EARN_LOOPS = [
  {
    icon: '🌱',
    title: 'Grow in the Garden',
    body: 'Tend your FlowGarden, complete care quests, harvest FlowCredits with every living thing you raise.',
    accent: 'from-emerald-400/20',
  },
  {
    icon: '💃',
    title: 'Move on the Dancefloor',
    body: 'DANZ events, HeartSync connections, real presence at real gatherings — every beat earns.',
    accent: 'from-fuchsia-400/20',
  },
  {
    icon: '⚡',
    title: 'Spend on Creation',
    body: 'Pour everything you earned into films, games and worlds — or your FlowBond membership. One economy, every app.',
    accent: 'from-cyan-400/20',
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-void">
      <Starfield />
      <Aurora />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-flow-violet to-flow-cyan flex items-center justify-center font-display font-bold text-lg animate-pulse-glow">
              F3
            </div>
            <span className="font-display font-semibold tracking-widest text-white/90">
              FLOW3
            </span>
          </div>
          <Link
            href="/studio"
            className="btn-cosmic px-5 py-2.5 rounded-xl font-semibold text-sm"
          >
            Enter the Studio
          </Link>
        </nav>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
          <p className="text-flow-cyan/80 tracking-[0.35em] text-xs font-semibold mb-8 uppercase">
            The FlowBond Creation Engine
          </p>
          <h1 className="font-display font-bold leading-[0.95] text-5xl sm:text-7xl lg:text-8xl mb-8">
            Dream it.
            <br />
            Prompt it.
            <br />
            <span className="text-cosmic">Make it real.</span>
          </h1>
          <p className="text-white/55 text-lg sm:text-xl max-w-2xl mx-auto mb-12">
            AI films. Playable games. Living worlds. FLOW3 turns language into
            reality — fueled by FlowCredits you earn across the whole FlowBond
            ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/studio"
              className="btn-cosmic px-10 py-4 rounded-2xl font-bold text-lg"
            >
              Start Creating
            </Link>
            <a
              href="#economy"
              className="glass glass-hover px-10 py-4 rounded-2xl font-semibold text-lg text-white/80"
            >
              How credits flow
            </a>
          </div>
        </section>

        {/* Modes */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-3">
            Four ways to <span className="text-cosmic">manifest</span>
          </h2>
          <p className="text-white/45 text-center mb-14">
            Pick a mode, write the dream, watch it take form.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(Object.entries(MODES) as [string, (typeof MODES)[keyof typeof MODES]][]).map(
              ([key, mode]) => (
                <Link
                  key={key}
                  href={`/studio?mode=${key}`}
                  className="glass glass-hover rounded-3xl p-7 block group"
                >
                  <div className="text-4xl mb-5 group-hover:animate-float">{mode.icon}</div>
                  <h3 className="font-display text-xl font-bold mb-1">{mode.label}</h3>
                  <p className="text-white/45 text-sm mb-5">{mode.tagline}</p>
                  <span className="text-flow-gold/90 text-sm font-semibold">
                    from {mode.base} ⚡
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* Economy loop */}
        <section id="economy" className="max-w-7xl mx-auto px-6 pb-32">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-3">
            One economy, <span className="text-cosmic">every world</span>
          </h2>
          <p className="text-white/45 text-center mb-14 max-w-xl mx-auto">
            FlowCredits are the lifeblood of FlowBond — earned by living, spent
            on creating.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {EARN_LOOPS.map((loop) => (
              <div
                key={loop.title}
                className={`glass glass-hover rounded-3xl p-8 bg-gradient-to-b ${loop.accent} to-transparent`}
              >
                <div className="text-4xl mb-5">{loop.icon}</div>
                <h3 className="font-display text-xl font-bold mb-3">{loop.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{loop.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-36 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-6">
            500 ⚡ on arrival.
          </h2>
          <p className="text-white/55 mb-10 text-lg">
            Every new steward receives a welcome grant. Your first film is
            already paid for.
          </p>
          <Link
            href="/studio"
            className="btn-cosmic px-12 py-5 rounded-2xl font-bold text-xl inline-block"
          >
            Enter FLOW3
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/35 text-sm">
            <span>FLOW3 · a FlowBond Layer-0 creation</span>
            <div className="flex gap-6">
              <a href="https://flowbond.life" className="hover:text-white/70 transition">
                FlowBond
              </a>
              <a href="https://flowme.one" className="hover:text-white/70 transition">
                FlowMe
              </a>
              <a href="https://flowgarden.life" className="hover:text-white/70 transition">
                FlowGarden
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
