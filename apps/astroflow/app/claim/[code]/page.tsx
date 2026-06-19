import Link from 'next/link';
import { serverClient } from '../../../lib/supabase-server';
import { myFbid } from '../../../lib/astro/access';
import ClaimGuest from '../../components/ClaimGuest';
import type { Chart } from '../../../lib/astro/types';
import { getT } from '../../../lib/i18n/server';

const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'] as const;
const EL_COLOR: Record<string, string> = {
  Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6',
};

// Personalized summons: this person is ALREADY shining in a live collective
// chart — their planets are in the weave. Claiming gives them the seat for
// real: an AstralFlow chart of their own (prefilled from this birth data),
// membership in every weave that holds them, and their crew revealed.
export default async function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getT();
  const sb = await serverClient();
  const [{ data: invite }, fbid] = await Promise.all([
    sb.rpc('guest_invite', { code }),
    myFbid(),
  ]);

  let hasProfile = false;
  if (fbid) {
    const { data } = await sb.from('profiles').select('fbid').eq('fbid', fbid).maybeSingle();
    hasProfile = !!data;
  }

  if (!invite)
    return (
      <Center>
        <h1 className="text-2xl font-serif mb-2">{t('Invite not found')}</h1>
        <p className="text-[#9698a8] mb-5">{t('This invite link is invalid or expired.')}</p>
        <Link href="/" className="text-[#b6abec] underline">{t('Go to AstralFlow')}</Link>
      </Center>
    );

  const chart = invite.chart as Chart;
  const maps = (invite.maps ?? []) as { id: string; name: string; context: string; member_count: number }[];

  if (invite.claimed)
    return (
      <Center>
        <h1 className="text-2xl font-serif mb-2">{t('Already claimed')}</h1>
        <p className="text-[#9698a8] mb-5">{t('This seat has been taken — the chart is live in the collective.')}</p>
        <Link href="/dashboard" className="text-[#b6abec] underline">{t('Open your dashboard')}</Link>
      </Center>
    );

  const maxEl = Math.max(1, ...ELEMENTS.map((el) => chart.elements?.[el] ?? 0));

  return (
    <Center>
      {/* aurora halo behind the summons */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(560px 360px at 50% 0%, rgba(154,143,224,0.20), transparent 65%), radial-gradient(420px 300px at 50% 110%, rgba(227,192,122,0.10), transparent 65%)',
          animation: 'af-aurora 10s ease-in-out infinite',
        }}
      />
      <div
        className="text-5xl text-[#e3c07a] mb-4"
        style={{ fontFamily: 'var(--font-display), serif', textShadow: '0 0 24px rgba(227,192,122,0.55)', animation: 'af-twinkle 4s ease-in-out infinite' }}
      >
        ❖
      </div>
      <p className="text-[11px] uppercase tracking-[0.32em] text-[#b6abec] mb-3">
        {invite.invited_by ? t('@{by} summoned you to the weave', { by: invite.invited_by }) : t('The weave is calling you')}
      </p>
      <h1
        className="text-4xl font-serif mb-2"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 25%, #e3c07a 60%, #b6abec 95%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {invite.display_name}
      </h1>
      <p className="font-serif text-lg text-[#cfc8e8] mb-4" style={{ animation: 'af-rise 0.8s ease-out' }}>
        {chart.bodies.Sun.sign} {t('Sun')} · {chart.bodies.Moon.sign} {t('Moon')}{chart.asc ? ` · ${chart.asc.sign} ${t('Rising')}` : ''}
      </p>

      {/* their cosmic powers, already computed and shining */}
      <div className="max-w-[260px] mx-auto mb-6 space-y-1.5" style={{ animation: 'af-rise 1s ease-out' }}>
        {ELEMENTS.map((el) => {
          const v = chart.elements?.[el] ?? 0;
          return (
            <div key={el} className="flex items-center gap-2">
              <span className="w-9 text-[10px] uppercase tracking-wider text-left" style={{ color: EL_COLOR[el] }}>{el}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#0a0b14] overflow-hidden border border-white/5">
                <div className="h-full rounded-full" style={{ width: `${(v / maxEl) * 100}%`, background: EL_COLOR[el], boxShadow: `0 0 8px ${EL_COLOR[el]}66` }} />
              </div>
            </div>
          );
        })}
      </div>

      {maps.length > 0 && (
        <div className="mb-6 space-y-2">
          {maps.map((m) => (
            <div
              key={m.id}
              className="rounded-xl px-4 py-3 bg-[#11131f]/90 text-left border border-[#2c3147]"
              style={{ boxShadow: '0 0 20px -12px #9a8fe0' }}
            >
              <div className="font-serif">{m.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                {m.context} · {t('{count} in the weave — your stars are already shining in it', { count: m.member_count })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-[#b6b3cf] mb-7 leading-relaxed">
        {t('Your planets are already part of {charts}, updating in real time. Claim your seat to hold your own chart, meet the crew you’re woven with, and let FlowMe read your path — everything stays inside FlowBond’s privacy layer, shared only as deep as you choose.', { charts: maps.length === 1 ? t('this living collective chart') : t('these living collective charts') })}
      </p>
      <ClaimGuest code={code} signedIn={!!fbid} hasProfile={hasProfile} />
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="max-w-md mx-auto p-6 mt-14 text-center text-[#ece9e0]">{children}</div>;
}
