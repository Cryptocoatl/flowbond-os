import Link from 'next/link';
import { getT } from '../../lib/i18n/server';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/astro/access';
import { activeTransits, moonPhase, lifeCycles, describeTransit } from '../../lib/astro/transits';
import { signOf, degInSign, sunLon, moonLon } from '../../lib/astro/ephemeris';
import { jdOfDate } from '../../lib/astro/transits';
import DailyReading from '../components/DailyReading';
import type { Chart } from '../../lib/astro/types';

// Today — the sky right now over your chart: Moon phase, any great life-cycle
// (Saturn/Jupiter/solar return, a Uranus turn), and today's strongest transits,
// plus a fresh FlowMe daily reading. The daily-return heart of AstralFlow.
export const dynamic = 'force-dynamic';

const GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Asc: 'Asc', MC: 'MC',
};

export default async function TodayPage() {
  const t = await getT();
  const me = await myFbid();
  if (!me) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
        <h1 className="text-2xl font-serif mb-3">{t('Your sky today')}</h1>
        <p className="text-[#9698a8] mb-5">{t('Sign in to see the sky moving over your chart.')}</p>
        <Link href="/auth/login?next=/today" className="af-btn af-btn-gold">{t('Log in')}</Link>
      </div>
    );
  }

  const sb = await serverClient();
  const { data: prof } = await sb.from('profiles').select('handle, chart').eq('fbid', me).maybeSingle();
  if (!prof?.chart) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
        <h1 className="text-2xl font-serif mb-3">{t('Your sky today')}</h1>
        <p className="text-[#9698a8] mb-5">{t('Create your chart to see the sky moving over it.')}</p>
        <Link href="/profile/new" className="af-btn af-btn-gold">{t('Create your chart')}</Link>
      </div>
    );
  }

  const chart = prof.chart as Chart;
  const handle = prof.handle as string;
  const jd = jdOfDate();
  const mp = moonPhase(jd);
  const cycles = lifeCycles(chart, jd);
  const top = activeTransits(chart, jd).slice(0, 6);
  const moonSign = signOf(moonLon(jd));
  const sunSign = signOf(sunLon(jd));

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-24 text-[#ece9e0]">
      <header className="mb-5">
        <h1 className="text-2xl font-serif">{t('Your sky today')}</h1>
        <p className="text-[#9698a8] text-[14px] mt-1">
          {t('The planets keep moving. Here is the weather over your chart right now.')}
        </p>
      </header>

      {/* Moon phase / sky now */}
      <div className="af-card p-4 flex items-center gap-4">
        <MoonDisc illum={mp.illum} angle={mp.angle} />
        <div>
          <div className="text-[15px] font-semibold text-[#cfc8e8]">{t(mp.name)}</div>
          <div className="text-[13px] text-[#8a8ea3]">
            {Math.round(mp.illum * 100)}% · {t('Moon in')} {t(moonSign)} · {t('Sun in')} {t(sunSign)} {degInSign(sunLon(jd)).toFixed(0)}°
          </div>
        </div>
      </div>

      {/* Life cycles — the great returns */}
      {cycles.length > 0 && (
        <div className="mt-4 space-y-2">
          {cycles.map((c, i) => (
            <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: '#e3c07a66', background: '#e3c07a12' }}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#e3c07a]">
                {GLYPH[c.body]} {t('Life cycle')} · {c.applying ? t('approaching') : t('separating')}
              </div>
              <p className="text-[14px] text-[#f0e6cf] mt-1 leading-relaxed">{c.note}</p>
              <div className="text-[11px] text-[#8a8ea3] mt-1">{t('orb')} {c.orb}°</div>
            </div>
          ))}
        </div>
      )}

      {/* Strongest transits */}
      <div className="mt-5">
        <div className="text-[13px] text-[#8a8ea3] mb-2">{t('Strongest transits over your chart')}</div>
        <div className="space-y-2">
          {top.map((tr, i) => (
            <div key={i} className="af-card p-3 flex items-start gap-3">
              <div className="text-lg leading-none pt-0.5" style={{ color: tr.isCycle ? '#e3c07a' : '#9a8fe0' }}>{GLYPH[tr.from]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#e8e6f0]">
                  {t('Transiting')} <b>{t(tr.from)}</b> <span className="text-[#9a8fe0]">{t(tr.aspect)}</span> {t('natal')} <b>{GLYPH[tr.to]} {t(tr.to)}</b>
                </div>
                <div className="text-[12px] text-[#8a8ea3] mt-0.5">
                  {t('orb')} {tr.orb}° · {tr.applying ? t('building') : t('easing')}{tr.retro ? ` · ${t('retrograde')}` : ''}
                </div>
              </div>
            </div>
          ))}
          {top.length === 0 && <div className="text-[13px] text-[#8a8ea3]">{t('A quiet sky today — no tight transits.')}</div>}
        </div>
      </div>

      {/* FlowMe daily reading */}
      <div className="mt-7 pt-5 border-t border-white/5">
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-1">{t('Read my sky with FlowMe')}</div>
        <DailyReading handle={handle} />
      </div>
    </div>
  );
}

// A little waxing/waning moon disc drawn from the phase angle.
function MoonDisc({ illum, angle }: { illum: number; angle: number }) {
  const waxing = angle < 180; // lit on the right while waxing
  return (
    <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden"
      style={{ background: '#1a1c2e', boxShadow: '0 0 18px rgba(227,192,122,0.25)' }}>
      <div className="absolute inset-0 rounded-full"
        style={{
          background: '#f0e6cf',
          clipPath: waxing ? 'inset(0 0 0 50%)' : 'inset(0 50% 0 0)',
          opacity: 0.15 + 0.85 * illum,
        }} />
      <div className="absolute inset-0 rounded-full"
        style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.6)' }} />
    </div>
  );
}
