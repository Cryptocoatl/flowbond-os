'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Mark, Wordmark } from './components/Wordmark';

export default function Landing() {
  const progRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // reveal-on-scroll
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // scroll progress + light parallax (rAF-throttled)
    const pars = Array.from(document.querySelectorAll<HTMLElement>('[data-speed]'));
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement;
        const p = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100;
        if (progRef.current) progRef.current.style.setProperty('--p', `${p}%`);
        for (const el of pars) {
          const s = parseFloat(el.dataset.speed || '0');
          el.style.transform = `translate3d(0, ${h.scrollTop * s}px, 0)`;
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="grain vignette relative">
      <div ref={progRef} className="progress" />

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="aurora" />
        {/* floating film frames */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <div data-speed="0.06" className="absolute left-[8%] top-[22%] hidden sm:block">
            <Frame className="floaty h-28 w-20" style={{ ['--r' as string]: '-8deg' }} hue="245" />
          </div>
          <div data-speed="0.1" className="absolute right-[10%] top-[26%] hidden sm:block">
            <Frame className="floaty h-32 w-24" style={{ ['--r' as string]: '7deg', animationDelay: '1.2s' }} hue="350" />
          </div>
          <div data-speed="0.08" className="absolute left-[16%] bottom-[16%] hidden md:block">
            <Frame className="floaty h-24 w-16" style={{ ['--r' as string]: '5deg', animationDelay: '.6s' }} hue="190" />
          </div>
          <div data-speed="0.12" className="absolute right-[16%] bottom-[14%] hidden md:block">
            <Frame className="floaty h-28 w-20" style={{ ['--r' as string]: '-6deg', animationDelay: '1.8s' }} hue="42" />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="chip mx-auto reveal in"><span className="pulse">●</span> Provenance-native film studio</span>
          <h1 className="reveal in mt-6 display text-[clamp(2.6rem,8vw,5.6rem)] font-bold leading-[0.98] tracking-tight">
            Real footage.<br />Real people.<br /><span className="text-grad">Provably theirs.</span>
          </h1>
          <p className="reveal reveal-1 in mx-auto mt-6 max-w-xl text-[clamp(1rem,2.4vw,1.2rem)] leading-relaxed text-white/65">
            Drop the footage from your event. Let great editors cut magic. Everyone in the chain is credited,
            verified human, and paid — authorship tracked, identity private.
          </p>
          <div className="reveal reveal-2 in mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/login?next=/me" className="btn-primary">Enter with FBID →</Link>
            <a href="#how" className="btn-ghost">See how it flows</a>
          </div>
        </div>

        <a href="#how" className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-white/40" aria-label="Scroll">
          <span className="block h-9 w-5 rounded-full border border-white/25">
            <span className="mx-auto mt-1.5 block h-1.5 w-1 animate-bounce rounded-full bg-white/60" />
          </span>
        </a>
      </section>

      {/* marquee */}
      <div className="relative z-10 overflow-hidden border-y border-white/5 py-4">
        <div className="marquee whitespace-nowrap text-sm uppercase tracking-[0.25em] text-white/35">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex gap-12">
              <span>Authorship tracked</span><span className="text-grad">✦</span>
              <span>Verified human</span><span className="text-grad">✦</span>
              <span>Full privacy</span><span className="text-grad">✦</span>
              <span>Circular economy</span><span className="text-grad">✦</span>
              <span>FlowPoints</span><span className="text-grad">✦</span>
              <span>Cash out</span><span className="text-grad">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ───────────────────────── DROP ───────────────────────── */}
      <Section id="how" eyebrow="01 · Collect" title={<>Everyone&apos;s footage,<br /><span className="text-grad">one living pool.</span></>}
        body="Open a drop link for your event. Every attendee signs in with FBID and drops their photos and videos straight into a shared pool — each clip signed to its shooter the instant it lands.">
        <div className="relative mx-auto mt-2 grid h-64 max-w-md place-items-center">
          {[
            { x: '-38%', y: '-30%', r: '-10deg', h: '42', d: '0s' },
            { x: '36%', y: '-26%', r: '9deg', h: '350', d: '.5s' },
            { x: '-30%', y: '26%', r: '7deg', h: '190', d: '1s' },
            { x: '34%', y: '30%', r: '-8deg', h: '245', d: '1.5s' },
          ].map((t, i) => (
            <div key={i} className="floaty absolute" style={{ transform: `translate(${t.x},${t.y})`, animationDelay: t.d }}>
              <Frame className="h-20 w-14" style={{ ['--r' as string]: t.r }} hue={t.h} />
            </div>
          ))}
          <div className="glass grid h-24 w-24 place-items-center rounded-full text-center">
            <Mark className="h-9 w-9" />
          </div>
        </div>
      </Section>

      {/* ───────────────────────── EDIT ───────────────────────── */}
      <Section eyebrow="02 · Create" reverse title={<>Invite editors.<br /><span className="text-grad">They cut magic.</span></>}
        body="Grant editor access to your collective. They pull from the pool and craft the piece. Every download is watermark-tagged to an FBID, so provenance travels with the file — even after it leaves the studio.">
        <div className="glass w-full max-w-md p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/40">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> timeline · beat-locked
          </div>
          <div className="space-y-2.5">
            {[['#f5c451', 78], ['#f43f5e', 54], ['#7c5cff', 92], ['#25d4e8', 40]].map(([c, w], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-7 w-7 shrink-0 rounded-md" style={{ background: c as string, opacity: .85 }} />
                <span className="h-2.5 rounded-full reveal in" style={{ width: `${w}%`, background: `${c}55`, transitionDelay: `${i * 90}ms` }} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[12px] text-white/45">
            <span>tagged: <span className="text-grad">@editor</span></span>
            <span>watermark · FBID</span>
          </div>
        </div>
      </Section>

      {/* ─────────────────────── AUTHORSHIP ─────────────────────── */}
      <Section eyebrow="03 · Authorship" title={<>Every frame remembers<br /><span className="text-grad">who made it.</span></>}
        body="On publish, the master is fingerprinted and registered on Origo with the full chain of owners — shooters and editor. Verified human, full privacy: no raw identity ever leaves the vault, only the proof.">
        <ChainGraphic />
      </Section>

      {/* ──────────────────── CIRCULAR ECONOMY ──────────────────── */}
      <Section eyebrow="04 · Circular economy" reverse title={<>A studio that<br /><span className="text-grad">pays the chain.</span></>}
        body="When a piece monetizes, FlowPoints flow to everyone who made it — shooters and editor alike. Reuse them across the ecosystem for credits, climb the ranks, and cash out once you're a Verified Human Editor. Smart-contract logic, circular by design.">
        <CircleGraphic />
      </Section>

      {/* ───────────────────────── LEVELS ───────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="reveal in text-center">
          <span className="chip mx-auto">The ladder</span>
          <h2 className="mt-4 display text-[clamp(1.8rem,5vw,3rem)] font-bold">From a single clip to <span className="text-grad">cashing out</span></h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { t: 'Contributor', d: 'Drop footage at any event. Earn FlowPoints every time your clip lands in a published piece.', n: '01' },
            { t: 'Editor', d: 'Get invited to collectives. Cut the pool into films and earn the editor share — provenance tagged to you.', n: '02' },
            { t: 'Verified Human Editor', d: 'Hit top quality + human verification and unlock real cash-out. Your authorship becomes your income.', n: '03', hot: true },
          ].map((s, i) => (
            <div key={i} className={`reveal reveal-${i + 1} in glass p-6 ${s.hot ? 'ring-1 ring-rose-400/30' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="display text-3xl font-bold text-white/15">{s.n}</span>
                {s.hot && <span className="chip" style={{ color: 'var(--gold)' }}>cash out</span>}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── FINAL CTA ─────────────────────── */}
      <section className="relative z-10 overflow-hidden px-6 py-28 text-center">
        <div className="aurora" style={{ opacity: 0.5 }} />
        <div className="reveal in relative z-10 mx-auto max-w-2xl">
          <h2 className="display text-[clamp(2rem,6vw,4rem)] font-bold leading-tight">
            Your next premiere starts<br />with a <span className="text-grad">drop.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-white/60">
            The next-generation AI aggregator for human-made film — tracking authorship and identity with full privacy,
            on a circular economy that pays the people who actually create.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/login?next=/me" className="btn-primary">Enter with FBID →</Link>
            <Link href="/events/new" className="btn-ghost">Open an event drop</Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Wordmark />
          <p className="text-[13px] text-white/35">Human-made film · authorship on Origo · powered by FlowBond</p>
        </div>
      </footer>
    </div>
  );
}

/* ── reusable section with reveal + media ─────────────────────────────────── */
function Section({
  id, eyebrow, title, body, children, reverse,
}: {
  id?: string; eyebrow: string; title: React.ReactNode; body: string; children: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section id={id} className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:gap-16 md:py-28">
      <div className={`reveal in ${reverse ? 'md:order-2' : ''}`}>
        <span className="chip">{eyebrow}</span>
        <h2 className="mt-4 display text-[clamp(2rem,5.5vw,3.6rem)] font-bold leading-[1.02]">{title}</h2>
        <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-white/60">{body}</p>
      </div>
      <div className={`reveal reveal-1 in grid place-items-center ${reverse ? 'md:order-1' : ''}`}>{children}</div>
    </section>
  );
}

/* ── a little film frame card ─────────────────────────────────────────────── */
function Frame({ className = '', style, hue }: { className?: string; style?: React.CSSProperties; hue: string }) {
  return (
    <div className={`rounded-lg border border-white/10 ${className}`}
      style={{ ...style, background: `linear-gradient(150deg, hsl(${hue} 80% 60% / .35), hsl(${hue} 80% 50% / .08))`, boxShadow: '0 20px 50px -20px rgba(0,0,0,.7)' }}>
      <div className="flex h-full flex-col justify-between p-1.5">
        <div className="flex justify-between"><Sprocket /><Sprocket /></div>
        <div className="flex justify-between"><Sprocket /><Sprocket /></div>
      </div>
    </div>
  );
}
function Sprocket() { return <span className="block h-1.5 w-1.5 rounded-[2px] bg-black/30" />; }

/* ── provenance chain (draws in on reveal) ────────────────────────────────── */
function ChainGraphic() {
  const nodes = [
    { x: 30, label: '@shooter', c: '#f5c451' },
    { x: 130, label: '@shooter', c: '#25d4e8' },
    { x: 230, label: '@editor', c: '#7c5cff' },
    { x: 330, label: 'published', c: '#f43f5e' },
  ];
  return (
    <div className="reveal in glass w-full max-w-md p-6">
      <svg viewBox="0 0 360 140" className="w-full">
        <path className="draw" d="M30 70 H330" stroke="url(#fsg2)" strokeWidth="2.5" fill="none" />
        <defs>
          <linearGradient id="fsg2" x1="0" y1="0" x2="360" y2="0">
            <stop offset="0" stopColor="#f5c451" /><stop offset=".5" stopColor="#7c5cff" /><stop offset="1" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={70} r={i === 3 ? 13 : 10} fill={n.c} className="pulse" style={{ animationDelay: `${i * 0.4}s` }} />
            <text x={n.x} y={106} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.6)">{n.label}</text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-center text-[12px] text-white/45">owners = [shooters… , editor] · verified on Origo</p>
    </div>
  );
}

/* ── circular economy diagram (slow spin) ─────────────────────────────────── */
function CircleGraphic() {
  const steps = ['Footage', 'Edit', 'Publish', 'Monetize', 'FlowPoints', 'Credits'];
  return (
    <div className="reveal in relative grid h-72 w-72 place-items-center">
      <svg viewBox="0 0 240 240" className="spin-slow absolute inset-0">
        <circle cx="120" cy="120" r="96" fill="none" stroke="url(#fsg3)" strokeWidth="1.5" strokeDasharray="4 8" />
        <defs>
          <linearGradient id="fsg3" x1="0" y1="0" x2="240" y2="240">
            <stop offset="0" stopColor="#f5c451" /><stop offset=".5" stopColor="#f43f5e" /><stop offset="1" stopColor="#25d4e8" />
          </linearGradient>
        </defs>
      </svg>
      {steps.map((s, i) => {
        const a = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + 42 * Math.cos(a);
        const y = 50 + 42 * Math.sin(a);
        return (
          <span key={s} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur"
            style={{ left: `${x}%`, top: `${y}%` }}>{s}</span>
        );
      })}
      <div className="glass grid h-20 w-20 place-items-center rounded-full text-center text-[11px] font-semibold leading-tight text-grad">cash<br />out</div>
    </div>
  );
}
