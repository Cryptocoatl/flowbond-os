import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '../../lib/i18n/server';
import { WHY, BASIS, SCORE_STEPS, SCORE_BANDS, SCORE_TRUTH, EXPLORE, WEAVE, SOURCES, ORCHESTRATION } from '../../lib/astro/guide';

export const metadata: Metadata = {
  title: 'Guide — start here · AstralFlow',
  description: 'Why AstralFlow, why bonds, what every tradition is based on, and exactly how the resonance number is computed — in plain words, for anyone.',
};

// The Guide — "start here" for any person on the planet. Everything served
// instantly from lib/astro/guide.ts: zero tokens, zero waiting, same answers
// for everyone. Deep but simple: the why, the sources, the math, the map.
export default async function GuidePage() {
  const t = await getT();
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-[#ece9e0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">{t('Start here')}</p>
      <h1
        className="text-5xl font-serif mb-3"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 15%, #e3c07a 50%, #b6abec 85%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {t('The Guide')}
      </h1>
      <p className="text-[#9698a8] leading-relaxed">
        {t('Why this app exists, what it is based on, how the numbers are made, and where to explore. Deep but simple — written for any person on the planet.')}
      </p>

      <nav className="flex flex-wrap gap-2 mt-5 text-[10px] uppercase tracking-[0.14em]">
        {[
          ['#why', t('Why')], ['#chart', t('Your chart')], ['#depth', t('The depth')],
          ['#traditions', t('The traditions')], ['#number', t('The number')],
          ['#truth', t('What it is')], ['#explore', t('Explore')],
        ].map(([href, label]) => (
          <a key={href} href={href} className="px-3 py-1 rounded-full border border-[#242a3b] text-[#9698a8] hover:text-[#e3c07a] hover:border-[#e3c07a]/40 transition">
            {label}
          </a>
        ))}
      </nav>

      {/* ── Why ── */}
      <section id="why" className="mt-12 scroll-mt-16 space-y-3">
        {WHY.map((w) => (
          <div key={w.q} className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-5">
            <h2 className="font-serif text-xl flex items-center gap-2.5">
              <span className="text-[#e3c07a]">{w.glyph}</span>{t(w.q)}
            </h2>
            <p className="text-sm text-[#b6b3cf] leading-relaxed mt-2">{t(w.a)}</p>
          </div>
        ))}
      </section>

      {/* ── What a chart is, in one breath ── */}
      <section id="chart" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t('Your chart, in one breath')}</h2>
        <p className="text-sm text-[#9698a8] leading-relaxed mt-2 mb-4">
          {t('A birth chart is the sky frozen at your first breath, seen from the place you were born. Reading it takes four words:')}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { glyph: '☉', name: t('Planets'), key: t('the characters'), body: t('Each planet is a living function in you — the Sun is your core, the Moon your feelings, Mercury your mind, Venus your love, Mars your drive.') },
            { glyph: '♌', name: t('Signs'), key: t('the styles'), body: t('The sign a planet stands in is HOW it acts — a Moon in Aries feels boldly and fast; a Moon in Cancer feels deeply and protectively.') },
            { glyph: 'Ⅹ', name: t('Houses'), key: t('the arenas'), body: t('The twelve houses are WHERE life happens — money, home, work, partnership. A planet’s house says which arena its energy plays in.') },
            { glyph: '△', name: t('Aspects'), key: t('the conversations'), body: t('Aspects are the angles between planets — some flow (120°), some rub (90°). They are the conversations happening inside you, and between you and others.') },
          ].map((e) => (
            <div key={e.name} className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl text-[#b6abec]" style={{ textShadow: '0 0 12px rgba(154,143,224,0.4)' }}>{e.glyph}</span>
                <span className="font-serif text-lg">{e.name}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] mt-1 mb-2 text-[#e3c07a]">{e.key}</div>
              <p className="text-sm text-[#b6b3cf] leading-relaxed">{e.body}</p>
            </div>
          ))}
        </div>
        <Link href="/cosmos" className="af-btn af-btn-ghost mt-4 inline-flex">{t('📖 Study every symbol in Cosmos')}</Link>
      </section>

      {/* ── The depth — everything you can weave ── */}
      <section id="depth" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t('What you can weave')}</h2>
        <p className="text-sm text-[#9698a8] leading-relaxed mt-2 mb-4">
          {t('Your own chart is only the first layer. AstralFlow can bond and read the whole flow — people, groups, places and time — each with the same honest, plain-language depth.')}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {WEAVE.map((w) => (
            <Link key={w.name} href={w.where}
              className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-4 hover:border-[#e3c07a]/40 transition block">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl text-[#b6abec]" style={{ textShadow: '0 0 12px rgba(154,143,224,0.4)' }}>{w.glyph}</span>
                <span className="font-serif text-lg">{t(w.name)}</span>
              </div>
              <p className="text-sm text-[#b6b3cf] leading-relaxed mt-2">{t(w.what)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── The traditions & their sources ── */}
      <section id="traditions" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t('Four traditions, honestly sourced')}</h2>
        <p className="text-sm text-[#9698a8] leading-relaxed mt-2 mb-4">
          {t('AstralFlow reads the same sky through four lenses. Each card says exactly what the lens is based on — no mystery about the sources.')}
        </p>
        <div className="space-y-3">
          {BASIS.map((b) => (
            <div key={b.key} className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-5" style={{ boxShadow: `0 0 24px -18px ${b.color}` }}>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl" style={{ color: b.color, textShadow: `0 0 12px ${b.color}66` }}>{b.glyph}</span>
                <span className="font-serif text-lg">{t(b.name)}</span>
              </div>
              <p className="text-sm text-[#b6b3cf] leading-relaxed mt-2">
                <span className="text-[10px] uppercase tracking-[0.14em] block mb-1" style={{ color: b.color }}>{t('based on')}</span>
                {t(b.basedOn)}
              </p>
              <p className="text-sm text-[#b6b3cf] leading-relaxed mt-3">
                <span className="text-[10px] uppercase tracking-[0.14em] block mb-1" style={{ color: b.color }}>{t('what we compute for you')}</span>
                {t(b.how)}
              </p>
              <p className="text-xs text-[#5b5e72] mt-3">{t('Explore it:')} {t(b.explore)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The number ── */}
      <section id="number" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t('The resonance number')}</h2>
        <p className="text-sm text-[#9698a8] leading-relaxed mt-2 mb-4">
          {t('When you combine stars, one number from 0 to 100 appears. It is computed by a deterministic engine — same charts, same number, every time. No AI decides it. Here is the whole recipe:')}
        </p>
        <ol className="space-y-3 mb-6">
          {SCORE_STEPS.map((s) => (
            <li key={s.n} className="flex gap-3 rounded-xl border border-[#242a3b] bg-[#11131f]/85 p-4">
              <span className="shrink-0 w-7 h-7 rounded-full border border-[#e3c07a]/40 grid place-items-center text-sm text-[#e3c07a] font-serif">{s.n}</span>
              <p className="text-sm text-[#b6b3cf] leading-relaxed">{t(s.text)}</p>
            </li>
          ))}
        </ol>
        <div className="grid sm:grid-cols-2 gap-3">
          {SCORE_BANDS.map((b) => (
            <div key={b.label} className="rounded-xl border border-[#242a3b] bg-[#11131f]/85 p-4">
              <p className="text-sm font-serif" style={{ color: b.color }}>
                {b.min > 0 ? `${b.min}+` : `< 45`} · {t(b.label)}
              </p>
              <p className="text-xs text-[#9698a8] leading-relaxed mt-1">{t(b.meaning)}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#cfc8e8] leading-relaxed mt-5 border-l-2 border-[#e3c07a]/50 pl-4 italic">
          {t(SCORE_TRUTH)}
        </p>
      </section>

      {/* ── What this really is — the honest claim + the hope ── */}
      <section id="truth" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t(ORCHESTRATION.title)}</h2>
        <p className="text-[15px] text-[#cfc8e8] leading-relaxed mt-3">{t(ORCHESTRATION.lead)}</p>
        {ORCHESTRATION.body.map((p, i) => (
          <p key={i} className="text-sm text-[#b6b3cf] leading-relaxed mt-3">{t(p)}</p>
        ))}

        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec] mt-6 mb-3">{t('The sources it orchestrates')}</p>
        <div className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 divide-y divide-white/5">
          {SOURCES.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5">
              <span className="text-[#e3c07a] text-sm mt-0.5">✦</span>
              <span className="text-sm text-[#b6b3cf] leading-relaxed">{t(s)}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, rgba(154,143,224,0.5), rgba(227,192,122,0.3), rgba(123,208,198,0.4))' }}>
          <div className="rounded-2xl bg-[#0e1020]/95 p-5">
            <p className="text-[15px] font-serif text-[#ece9e0] leading-relaxed">{t(ORCHESTRATION.hope)}</p>
          </div>
        </div>
      </section>

      {/* ── Where to explore ── */}
      <section id="explore" className="mt-12 scroll-mt-16">
        <h2 className="text-2xl font-serif">{t('Where to explore')}</h2>
        <p className="text-sm text-[#9698a8] leading-relaxed mt-2 mb-4">{t('The whole universe, one door at a time.')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {EXPLORE.map((e) => (
            <Link key={e.path} href={e.path === '/chart' ? '/dashboard' : e.path}
              className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-4 hover:border-[#e3c07a]/40 transition block">
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl">{e.icon}</span>
                <span className="font-serif text-lg">{t(e.name)}</span>
              </div>
              <p className="text-sm text-[#b6b3cf] leading-relaxed mt-2">{t(e.what)}</p>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-[10px] text-[#3f4358] mt-12 leading-relaxed border-t border-white/5 pt-4">
        {t('Everything on this page is served instantly from AstralFlow’s own memory — no tokens, no waiting, the same honest answers for everyone. Patterns and tendencies, never fixed destiny. ✦')}
      </p>
    </div>
  );
}
