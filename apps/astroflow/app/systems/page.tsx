import Link from 'next/link';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/astro/access';
import { dreamspell } from '../../lib/astro/mayan';
import { geneKeys } from '../../lib/astro/genekeys';
import { vedicChart } from '../../lib/astro/vedic';
import { SYSTEMS } from '../../lib/astro/systems-ref';
import type { Chart } from '../../lib/astro/types';

// "Your currents" — the personalized encyclopedia hub. Each card is YOU in that
// system at a glance; tap to open the full, readable page for that tradition.
export default async function SystemsHub() {
  const me = await myFbid();
  if (!me) return <Gate cta="Sign in" href="/auth/login?next=/systems" line="Sign in to see yourself across every tradition." />;

  const sb = await serverClient();
  const { data: prof } = await sb.from('profiles').select('birth_date, chart').eq('fbid', me).maybeSingle();
  if (!prof?.chart) return <Gate cta="Create your chart" href="/profile/new" line="Create your chart and every current opens for you." />;

  const chart = prof.chart as Chart;
  const date = prof.birth_date as string;

  // one-line "you" headline per system (cheap, deterministic)
  const ds = dreamspell(date);
  const gk = geneKeys(chart);
  const v = vedicChart(chart);
  const headline: Record<string, string> = {
    western: `${chart.bodies.Sun.sign} Sun · ${chart.bodies.Moon.sign} Moon${chart.asc ? ` · ${chart.asc.sign} Rising` : ''}`,
    mayan: `Kin ${ds.kin} · ${ds.color} ${ds.toneName} ${ds.sealName.split(' ').slice(1).join(' ')}`,
    vedic: `${v.asc ? `${v.asc.rashi} Lagna · ` : ''}Moon in ${v.bodies.Moon?.nakshatra ?? '—'}`,
    genekeys: `Profile ${gk.profile} · Life's Work Gate ${gk.spheres.lifesWork.gate}`,
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-[#ece9e0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">Your currents</p>
      <h1 className="text-4xl font-serif mb-3"
        style={{ background: 'linear-gradient(100deg,#ece9e0 15%,#e3c07a 50%,#b6abec 85%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        You, across every tradition
      </h1>
      <p className="text-[#9698a8] leading-relaxed mb-6">
        The same birth moment, read through four living systems. Each page shows who you are in that current,
        with every symbol explained — so you can recognise yourself fast, in the language you already know or
        the one you want to learn.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {SYSTEMS.map((s) => (
          <Link key={s.key} href={`/systems/${s.key}`}
            className="rounded-2xl border border-[#242a3b] bg-[#11131f]/85 p-4 hover:-translate-y-0.5 transition block"
            style={{ boxShadow: `0 0 24px -16px ${s.color}` }}>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl" style={{ color: s.color, textShadow: `0 0 12px ${s.color}66` }}>{s.glyph}</span>
              <span className="font-serif text-lg">{s.title}</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: s.color }}>{s.tagline}</div>
            <p className="text-sm text-[#cfc8e8] mt-2 font-serif">{headline[s.key]}</p>
            <p className="text-xs text-[#8a8ea3] mt-1.5 leading-relaxed">{s.about}</p>
          </Link>
        ))}
      </div>

      <p className="text-[11px] text-[#5b5e72] mt-6">
        Want the symbol library itself? Visit <Link href="/cosmos" className="text-[#b6abec] underline">Cosmos ✦</Link> — every planet, sign, house and aspect explained.
      </p>
    </div>
  );
}

function Gate({ line, cta, href }: { line: string; cta: string; href: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">
      <h1 className="text-2xl font-serif mb-2">Your currents</h1>
      <p className="text-[#9698a8] mb-5">{line}</p>
      <Link href={href} className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5">{cta}</Link>
    </div>
  );
}
