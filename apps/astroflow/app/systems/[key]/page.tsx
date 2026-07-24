import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT, tFor, getLocale } from '../../../lib/i18n/server';
import type { Locale } from '../../../lib/i18n/config';
import { serverClient } from '../../../lib/supabase-server';
import { myFbid } from '../../../lib/astro/access';
import { personLines } from '../../../lib/astro/interpret';
import { natalAspects } from '../../../lib/astro/aspects';
import { dreamspell, tzolkin, cholqij, DREAMSPELL_SEALS, DREAMSPELL_TONES } from '../../../lib/astro/mayan';
import { NAWALES, KICHE_NUMBERS } from '../../../lib/astro/cholqij';
import { geneKeys, GENE_KEYS } from '../../../lib/astro/genekeys';
import { chineseSummary, CN_ANIMALS, CN_ELEMENTS } from '../../../lib/astro/chinese';
import { vedicChart, vedicSummary, vimshottariDasha, currentDasha } from '../../../lib/astro/vedic';
import { loreByName, DASHA_LORD_THEME, GANA_MEANING, PURUSHARTHA_MEANING } from '../../../lib/astro/nakshatras';
import {
  systemByKey, SEAL_KEY, TONE_KEY, COLOR_FAMILY, ORACLE_ROLE,
} from '../../../lib/astro/systems-ref';
import ReadingPanel from '../../components/ReadingPanel';
import type { Chart } from '../../../lib/astro/types';

export default async function SystemPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const t = await getT();
  const locale = await getLocale();
  const meta = systemByKey(key);
  if (!meta) notFound();

  const me = await myFbid();
  if (!me) return <Gate cta={t('Sign in')} href={`/auth/login?next=/systems/${key}`} line={t('Sign in to see yourself in this current.')} title={t('This current')} />;

  const sb = await serverClient();
  const { data: prof } = await sb.from('profiles').select('handle, birth_date, chart').eq('fbid', me).maybeSingle();
  if (!prof?.chart) return <Gate cta={t('Create your chart')} href="/profile/new" line={t('Create your chart to open this current.')} title={t('This current')} />;

  const chart = prof.chart as Chart;
  const date = prof.birth_date as string;
  const handle = prof.handle as string;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-[#ece9e0]">
      <Link href="/systems" className="text-xs text-[#5b5e72]">← {t('your currents')}</Link>
      <div className="flex items-baseline gap-3 mt-3">
        <span className="text-3xl" style={{ color: meta.color, textShadow: `0 0 14px ${meta.color}66` }}>{meta.glyph}</span>
        <h1 className="text-4xl font-serif">{meta.title}</h1>
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] mt-1.5 mb-2" style={{ color: meta.color }}>{meta.tagline}</div>
      <p className="text-[#9698a8] leading-relaxed mb-6">{meta.about}</p>

      {key === 'western' && <Western chart={chart} color={meta.color} locale={locale} />}
      {key === 'mayan' && <Mayan date={date} jd={chart.jd} color={meta.color} locale={locale} />}
      {key === 'vedic' && <Vedic chart={chart} color={meta.color} locale={locale} />}
      {key === 'genekeys' && <GeneKeysView chart={chart} color={meta.color} locale={locale} />}
      {key === 'chinese' && <ChineseView jd={chart.jd} color={meta.color} locale={locale} />}

      <div className="mt-9 pt-5 border-t border-white/5">
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">{t('Read mine with FlowMe')}</div>
        <ReadingPanel handles={[handle]} traditions={key !== 'western'} />
      </div>
    </div>
  );
}

// ── Western ──────────────────────────────────────────────────────────────────
function Western({ chart, color, locale }: { chart: Chart; color: string; locale: Locale }) {
  const t = tFor(locale);
  const lines = personLines(chart);
  const aspects = natalAspects(chart).filter((a) => a.type !== 'quincunx').slice(0, 9);
  const els = Object.entries(chart.elements);
  return (
    <>
      <Hero color={color} big={`${chart.bodies.Sun.sign} ${t('Sun')} · ${chart.bodies.Moon.sign} ${t('Moon')}${chart.asc ? ` · ${chart.asc.sign} ${t('Rising')}` : ''}`}
        small={chart.asc ? t('your big three — identity, inner world, and the mask you meet life through') : t('no birth time on file — rising & houses hidden')} />
      <Section title={t('Your placements')}>
        {lines.map((l) => <Row key={l.planet}>{l.line}</Row>)}
      </Section>
      <Section title={t('Your aspects — how your energies talk')}>
        {aspects.map((a, i) => (
          <Row key={i}>
            <span style={{ color: a.harmony > 0 ? '#7bd0c6' : '#e8956a' }}>{a.glyph}</span> {a.p1} {a.type} {a.p2}{' '}
            <span className="text-[#5b5e72] font-mono text-xs">{a.orb}°</span>
          </Row>
        ))}
      </Section>
      <Section title={t('Your elemental balance')}>
        <div className="flex gap-4 flex-wrap">
          {els.map(([el, n]) => <span key={el} className="text-sm text-[#cfc8e8]">{el} <b style={{ color }}>{n}</b></span>)}
        </div>
      </Section>
      <Reference>{t('Every planet, sign, house and aspect explained in')} <Link href="/cosmos" className="underline text-[#b6abec]">Cosmos ✦</Link>.</Reference>
    </>
  );
}

// ── Mayan · 13 Moons ─────────────────────────────────────────────────────────
function Mayan({ date, jd, color, locale }: { date: string; jd: number; color: string; locale: Locale }) {
  const t = tFor(locale);
  const ds = dreamspell(date);
  const tz = tzolkin(jd);
  const ch = cholqij(jd);
  const fam = COLOR_FAMILY[ds.color];
  const oracle: Array<[string, number]> = [
    ['guide', ds.oracle.guide], ['analog', ds.oracle.analog], ['antipode', ds.oracle.antipode], ['occult', ds.oracle.occult],
  ];
  return (
    <>
      {/* The living Guatemalan count leads — your nawal is your face and guide. */}
      <Hero color={color} big={`${ch.number} ${ch.nawal.kiche}`}
        small={`${t('Your nawal — the living Cholq’ij count of the K’iche’ daykeepers of Guatemala')}`} />

      <Section title={t('Your nawal — your face and your guide')}>
        <div className="rounded-xl border p-3.5" style={{ borderColor: `${color}55`, background: `${color}0f` }}>
          <div className="text-base font-semibold" style={{ color: '#f0e2c8' }}>{ch.nawal.kiche}</div>
          <div className="text-[13px] text-[#e8b98a] mt-0.5">{ch.nawal.symbol}</div>
          <p className="text-[13px] text-[#cfc8b8] mt-2 leading-relaxed">{ch.nawal.meaning}</p>
          <div className="mt-2.5 space-y-1 text-[13px]">
            <Row><span className="text-[#8a8ea3]">{t('Domain')}:</span> {ch.nawal.domain}</Row>
            <Row><span className="text-[#8a8ea3]">{t('Number')} {ch.number} ({ch.numberName}):</span> {ch.numberEnergy}</Row>
            <Row className="text-[#5b5e72]">{t('Archaeological Tzolk’in equivalent:')} {ch.nawal.yucatec}</Row>
          </div>
        </div>
      </Section>

      <Section title={t('The 20 nawales')}>
        <Grid items={NAWALES.map((n, i) => ({ label: n.kiche, sub: n.domain, on: n.kiche === ch.nawal.kiche }))} color={color} />
      </Section>

      <Section title={t('The 13 numbers (K’iche’)')}>
        <Grid items={KICHE_NUMBERS.map((n, i) => ({ label: `${i + 1} ${n}`, sub: '', on: i + 1 === ch.number }))} color={color} />
      </Section>

      <Reference>{t('The Cholq’ij is the same unbroken 260-day count the K’iche’ and Kaqchikel ajq’ijab’ (daykeepers) still keep in the highlands of Guatemala. Below, two other lenses on the same day.')}</Reference>

      <Section title={t('Dreamspell overlay (Argüelles) — a modern lens')}>
        <Row><b style={{ color: fam.hex }}>{ds.sealName}</b> — {SEAL_KEY[ds.seal - 1]} <span className="text-[#5b5e72]">({t('seal')} {ds.seal})</span></Row>
        <Row><b style={{ color }}>{t('Tone')} {ds.tone} · {ds.toneName}</b> — {TONE_KEY[ds.tone - 1]}</Row>
        <Row className="text-[#9698a8]">{t('Archaeological Tzolk’in / Haab count:')} {tz.number} {tz.dayName} — {tz.meaning}</Row>
      </Section>
      <Section title={t('Your oracle — the four energies around you')}>
        <div className="grid sm:grid-cols-2 gap-2">
          {oracle.map(([role, seal]) => (
            <div key={role} className="rounded-xl border border-[#242a3b] bg-[#11131f]/80 p-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color }}>{ORACLE_ROLE[role]}</div>
              <div className="font-serif text-[#ece9e0] mt-0.5">{DREAMSPELL_SEALS[seal - 1]}</div>
              <div className="text-xs text-[#8a8ea3] mt-0.5">{SEAL_KEY[seal - 1]}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t('The four color families')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(COLOR_FAMILY).map(([c, f]) => (
            <div key={c} className={`rounded-xl border p-2.5 ${c === ds.color ? '' : 'opacity-50'}`}
                 style={{ borderColor: c === ds.color ? f.hex : '#242a3b' }}>
              <div className="font-serif" style={{ color: f.hex }}>{c}</div>
              <div className="text-[10px] text-[#8a8ea3] mt-0.5">{f.role}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t('The 20 solar seals')}>
        <Grid items={DREAMSPELL_SEALS.map((n, i) => ({ label: n, sub: SEAL_KEY[i], on: i + 1 === ds.seal }))} color={fam.hex} />
      </Section>
      <Section title={t('The 13 galactic tones')}>
        <Grid items={DREAMSPELL_TONES.map((n, i) => ({ label: `${i + 1} ${n}`, sub: TONE_KEY[i], on: i + 1 === ds.tone }))} color={color} />
      </Section>
    </>
  );
}

// ── Vedic ────────────────────────────────────────────────────────────────────
function Vedic({ chart, color, locale }: { chart: Chart; color: string; locale: Locale }) {
  const t = tFor(locale);
  const v = vedicChart(chart);
  const dasha = vimshottariDasha(chart);
  const now = currentDasha(chart);
  const summary = vedicSummary(v);
  const moonNak = v.bodies.Moon?.nakshatra;
  const moonLore = moonNak ? loreByName(moonNak) : undefined;
  return (
    <>
      <Hero color={color} big={`${v.asc ? `${v.asc.rashi} Lagna` : t('no birth time')}${v.bodies.Moon ? ` · ${t('Moon')} ${t('in')} ${v.bodies.Moon.nakshatra}` : ''}`}
        small={t('your sidereal ground — the karmic layer beneath the personality')} />

      {moonLore && (
        <Section title={t('Your Moon nakshatra — the heart of a Vedic chart')}>
          <div className="rounded-xl border p-3.5" style={{ borderColor: `${color}55`, background: `${color}0f` }}>
            <div className="text-base font-semibold" style={{ color: '#cfc8e8' }}>{moonNak}</div>
            <div className="text-sm text-[#b6abec] italic mt-0.5">{moonLore.essence}</div>
            <div className="mt-2.5 space-y-1 text-[13px]">
              <Row><span className="text-[#8a8ea3]">{t('Deity')}:</span> {moonLore.deity}</Row>
              <Row><span className="text-[#8a8ea3]">{t('Shakti (power)')}:</span> {moonLore.shakti}</Row>
              <Row><span className="text-[#8a8ea3]">{t('Held between')}:</span> {moonLore.basisAbove} → {moonLore.basisBelow}</Row>
              <Row><span className="text-[#8a8ea3]">{t('Symbol')}:</span> {moonLore.symbol}</Row>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-[11px] px-2 py-1 rounded-full border" style={{ borderColor: '#2c3350', color: '#8a8ea3' }}>{GANA_MEANING[moonLore.gana]}</span>
              <span className="text-[11px] px-2 py-1 rounded-full border" style={{ borderColor: '#2c3350', color: '#8a8ea3' }}>{PURUSHARTHA_MEANING[moonLore.purushartha]}</span>
            </div>
          </div>
        </Section>
      )}

      <Section title={t('Your sidereal chart')}>
        {summary.map((l, i) => <Row key={i}>{l}</Row>)}
      </Section>

      <Section title={t('The chapter you are living now — Vimshottari dasha')}>
        <div className="rounded-xl border p-3.5 mb-2.5" style={{ borderColor: `${color}55`, background: `${color}0f` }}>
          <div className="text-sm" style={{ color: '#cfc8e8' }}>{DASHA_LORD_THEME[now.lord] ?? now.lord}</div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#2c3350' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.round(now.progress * 100)}%`, background: color }} />
          </div>
          <div className="text-[11px] text-[#8a8ea3] mt-1.5">{t('~{years} years remaining in this chapter', { years: now.remainingYears.toFixed(1) })}</div>
        </div>
        <Row className="text-[#8a8ea3] text-xs">{t('The full 120-year cycle from your birth lord {lord}:', { lord: dasha.lord })}</Row>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {dasha.sequence.map((d, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-full border"
              style={{ borderColor: d.lord === now.lord ? color : '#2c3350', color: d.lord === now.lord ? '#cfc8e8' : '#8a8ea3', background: d.lord === now.lord ? `${color}1a` : 'transparent' }}>
              {d.lord} · {d.years}y
            </span>
          ))}
        </div>
      </Section>
      <Reference>{t('Sidereal and tropical are two lenses, never a contradiction — see both in your')} <Link href="/systems/western" className="underline text-[#b6abec]">{t('Western chart')}</Link>.</Reference>
    </>
  );
}

// ── Gene Keys / Human Design ─────────────────────────────────────────────────
function GeneKeysView({ chart, color, locale }: { chart: Chart; color: string; locale: Locale }) {
  const t = tFor(locale);
  const gk = geneKeys(chart);
  const spheres: Array<[string, { gate: number; line: number }]> = [
    [t("Life's Work"), gk.spheres.lifesWork], [t('Evolution'), gk.spheres.evolution],
    [t('Radiance'), gk.spheres.radiance], [t('Purpose'), gk.spheres.purpose],
  ];
  return (
    <>
      <Hero color={color} big={`${t('Profile')} ${gk.profile}`} small={t('Incarnation Cross of gates {gates} — your four prime gifts', { gates: gk.incarnationCross.join(' · ') })} />
      <Section title={t('Your Activation Sequence — shadow → gift → siddhi')}>
        <div className="space-y-2.5">
          {spheres.map(([name, g]) => {
            const k = GENE_KEYS[g.gate];
            return (
              <div key={name} className="rounded-xl border border-[#242a3b] bg-[#11131f]/80 p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{name}</span>
                  <span className="font-mono text-xs text-[#5b5e72]">{t('Gate')} {g.gate}.{g.line}</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-[#e8956a]">{k.shadow}</span>
                  <span className="text-[#5b5e72]"> → </span>
                  <span className="text-[#7bd0c6]">{k.gift}</span>
                  <span className="text-[#5b5e72]"> → </span>
                  <span style={{ color: '#e3c07a' }}>{k.siddhi}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      <Reference>{t('Each gate carries an arc: the shadow is the contracted pattern, the gift its unlocked expression, the siddhi the far star. Your profile')} <b className="text-[#cfc8e8]">{gk.profile}</b> {t('describes how you walk it.')}</Reference>
    </>
  );
}

// ── Chinese · year animal ─────────────────────────────────────────────────────
function ChineseView({ jd, color, locale }: { jd: number; color: string; locale: Locale }) {
  const t = tFor(locale);
  const cn = chineseSummary(jd);
  return (
    <>
      <Hero color={color}
        big={`${cn.element.glyph} ${t(cn.element.name)} ${t(cn.animal.name)} ${cn.animal.glyph}`}
        small={`${cn.year} · ${cn.yang ? t('yang (active, outward)') : t('yin (receptive, inward)')} — ${t('your birth year animal, from the real Chinese New Year')}`} />

      <Section title={t('Your animal — your face in the year cycle')}>
        <div className="rounded-xl border p-3.5" style={{ borderColor: `${color}55`, background: `${color}0f` }}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl">{cn.animal.glyph}</span>
            <span className="text-base font-semibold" style={{ color: '#f0d2c8' }}>{t(cn.animal.name)}</span>
            <span className="text-xs text-[#8a8ea3]">· {t(cn.animal.key)}</span>
          </div>
          <p className="text-[13px] text-[#cfc8b8] mt-2 leading-relaxed">{t(cn.animal.body)}</p>
        </div>
      </Section>

      <Section title={t('Your element — the flavour of your animal')}>
        <div className="rounded-xl border border-[#242a3b] bg-[#11131f]/80 p-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl" style={{ color }}>{cn.element.glyph}</span>
            <span className="text-sm font-semibold text-[#cfc8e8]">{t(cn.element.name)}</span>
            <span className="text-xs text-[#8a8ea3]">· {t(cn.element.key)}</span>
          </div>
          <p className="text-[13px] text-[#cfc8b8] mt-2 leading-relaxed">{t(cn.element.body)}</p>
          <p className="text-[11px] text-[#5b5e72] mt-2">{t('Each element colours two years — yours is the {pol} expression.', { pol: cn.yang ? t('yang') : t('yin') })}</p>
        </div>
      </Section>

      <Section title={t('Your relationships in the cycle')}>
        <div className="space-y-2 text-sm">
          <Row><span className="text-[#7bd0c6]">◈ {t('Natural allies')}:</span> {cn.allies.map((a) => `${a.glyph} ${t(a.name)}`).join(' · ')} <span className="text-[#5b5e72]">— {t('your trine; you move at the same pace')}</span></Row>
          <Row><span className="text-[#b6abec]">✦ {t('Secret friend')}:</span> {cn.secretFriend.glyph} {t(cn.secretFriend.name)} <span className="text-[#5b5e72]">— {t('a quiet, unconditional support')}</span></Row>
          <Row><span className="text-[#e8956a]">⚡ {t('Clash / growth mirror')}:</span> {cn.clash.glyph} {t(cn.clash.name)} <span className="text-[#5b5e72]">— {t('opposite energy; friction that teaches')}</span></Row>
        </div>
      </Section>

      <Section title={t('The twelve animals')}>
        <Grid color={color} items={CN_ANIMALS.map((a) => ({ label: `${a.glyph} ${t(a.name)}`, sub: t(a.key), on: a.name === cn.animal.name }))} />
      </Section>

      <Reference>
        {t('The Chinese year turns at Chinese New Year — the second new moon after the winter solstice — not on January 1. AstralFlow computes that exact boundary from the same astronomy behind your chart, so a January or early-February birth gets its true animal.')} {' '}
        {t('The five elements')}: {CN_ELEMENTS.map((e) => `${e.glyph} ${t(e.name)}`).join(' · ')}.
      </Reference>
    </>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
function Hero({ big, small, color }: { big: string; small: string; color: string }) {
  return (
    <div className="rounded-2xl border p-4 mb-2" style={{ borderColor: `${color}55`, boxShadow: `0 0 30px -18px ${color}` }}>
      <div className="font-serif text-2xl" style={{ color }}>{big}</div>
      <div className="text-xs text-[#9698a8] mt-1">{small}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-2.5">{title}</div>
      {children}
    </div>
  );
}
function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm text-[#cfc8e8] py-0.5 ${className}`}>{children}</div>;
}
function Reference({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-[#5b5e72] mt-5 leading-relaxed">{children}</p>;
}
function Grid({ items, color }: { items: { label: string; sub: string; on: boolean }[]; color: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {items.map((it) => (
        <div key={it.label} className={`rounded-lg border p-2 ${it.on ? '' : 'opacity-55'}`}
             style={{ borderColor: it.on ? color : '#242a3b', background: it.on ? `${color}14` : 'transparent' }}>
          <div className="text-xs font-serif" style={{ color: it.on ? color : '#cfc8e8' }}>{it.label}</div>
          <div className="text-[10px] text-[#8a8ea3] leading-snug mt-0.5">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function Gate({ line, cta, href, title }: { line: string; cta: string; href: string; title: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">
      <h1 className="text-2xl font-serif mb-2">{title}</h1>
      <p className="text-[#9698a8] mb-5">{line}</p>
      <Link href={href} className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5">{cta}</Link>
    </div>
  );
}
