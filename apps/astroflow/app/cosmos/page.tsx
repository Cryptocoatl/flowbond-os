import type { Metadata } from 'next';
import { getT } from '../../lib/i18n/server';
import { PLANETS, SIGNS, HOUSES, ASPECTS, ELEMENTS, TRADITIONS, type Entry } from '../../lib/astro/university';

export const metadata: Metadata = {
  title: 'Cosmos — the Astral University · AstralFlow',
  description: 'Every current of the sky with its glyph, meaning and teaching — the living knowledge behind every FlowMe reading.',
};

// The living astral university: FlowMe's generic knowledge written into the
// product itself. Static and instant — learning here costs zero tokens; the
// same framework sits prompt-cached behind every channeled reading.
export default async function CosmosPage() {
  const t = await getT();
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-[#ece9e0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">{t('The Astral University')}</p>
      <h1
        className="text-5xl font-serif mb-3"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 15%, #e3c07a 50%, #b6abec 85%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Cosmos
      </h1>
      <p className="text-[#9698a8] leading-relaxed mb-2">
        {t('Every current of the sky, with its glyph and its teaching — the same living knowledge FlowMe holds when it reads your chart. Study the symbols, then watch them move through your people.')}
      </p>
      <nav className="flex flex-wrap gap-2 mt-5 mb-2 text-[10px] uppercase tracking-[0.14em]">
        {[
          ['#elements', t('Elements')], ['#planets', t('Planets')], ['#signs', t('Signs')],
          ['#houses', t('Houses')], ['#aspects', t('Aspects')], ['#traditions', t('Traditions')],
        ].map(([href, label]) => (
          <a key={href} href={href} className="px-3 py-1 rounded-full border border-[#242a3b] text-[#9698a8] hover:text-[#e3c07a] hover:border-[#e3c07a]/40 transition">
            {label}
          </a>
        ))}
      </nav>

      <Chapter id="elements" title={t('The four elements')} sub={t('the primal currents every chart is made of')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {ELEMENTS.map((e) => <Card key={e.name} e={e} big />)}
        </div>
      </Chapter>

      <Chapter id="planets" title={t('The planets')} sub={t('the cast of characters — each a living function in you')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {PLANETS.map((e) => <Card key={e.name} e={e} />)}
        </div>
      </Chapter>

      <Chapter id="signs" title={t('The twelve signs')} sub={t('the styles the planets wear')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {SIGNS.map((e) => <Card key={e.name} e={e} />)}
        </div>
      </Chapter>

      <Chapter id="houses" title={t('The twelve houses')} sub={t('the arenas of life where the sky lands')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {HOUSES.map((e) => <Card key={e.name} e={e} />)}
        </div>
      </Chapter>

      <Chapter id="aspects" title={t('The aspects')} sub={t('how two currents speak to each other')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {ASPECTS.map((e) => <Card key={e.name} e={e} />)}
        </div>
      </Chapter>

      <Chapter id="traditions" title={t('The deeper lenses')} sub={t('three traditions FlowMe can read you through')}>
        <div className="space-y-3">
          {TRADITIONS.map((e) => <Card key={e.name} e={e} big />)}
        </div>
      </Chapter>

      <p className="text-[10px] text-[#3f4358] mt-12 leading-relaxed border-t border-white/5 pt-4">
        {t('This knowledge is part of AstralFlow’s collective memory — served instantly from the flow itself, no tokens spent. The same framework sits cached behind every FlowMe transmission, so each reading only ever pays for your chart’s tiny symbolic facts. Tools for universal coordination, one constellation at a time. ✦')}
      </p>
    </div>
  );
}

function Chapter({ id, title, sub, children }: { id: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-16">
      <h2 className="text-2xl font-serif text-[#ece9e0]">{title}</h2>
      <p className="text-xs text-[#5b5e72] mb-4 mt-0.5">{sub}</p>
      {children}
    </section>
  );
}

function Card({ e, big }: { e: Entry; big?: boolean }) {
  const accent = e.color ?? '#9a8fe0';
  return (
    <div
      className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-4 hover:border-opacity-60 transition"
      style={{ boxShadow: `0 0 24px -16px ${accent}` }}
    >
      <div className="flex items-baseline gap-2.5">
        <span
          className={big ? 'text-3xl' : 'text-2xl'}
          style={{ color: accent, textShadow: `0 0 12px ${accent}66` }}
        >
          {e.glyph}
        </span>
        <span className="font-serif text-lg">{e.name}</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.14em] mt-1 mb-2" style={{ color: accent }}>
        {e.key}
      </div>
      <p className="text-sm text-[#b6b3cf] leading-relaxed">{e.body}</p>
    </div>
  );
}
