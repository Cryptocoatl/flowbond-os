import Link from 'next/link';
import type { Metadata } from 'next';
import { getT } from '../../lib/i18n/server';
import { serverClient } from '../../lib/supabase-server';
import { myFbid, visibleProfiles } from '../../lib/astro/access';
import Matchmaker from '../components/Matchmaker';
import type { Chart } from '../../lib/astro/types';

export const metadata: Metadata = {
  title: 'Matchmaker · AstralFlow',
  description: 'Find your people by resonance — romance, friendship, living or building — analyzed live from your charts, with mutual-consent sparks for meeting someone new.',
};

// The Matchmaker — a clear, playful path: pick what you're looking for, and see
// your constellation ranked by real chart resonance. Discover new people who are
// open to the same thing and spark them; a mutual spark opens the deep read.
export default async function MatchPage() {
  const t = await getT();
  const fbid = await myFbid();
  if (!fbid) return <Gate t={t} line={t('Sign in to find your people by resonance.')} href="/auth/login?next=/match" />;

  const sb = await serverClient();
  const [circle, openRes, prof] = await Promise.all([
    visibleProfiles(),
    sb.rpc('my_open_to'),
    sb.from('profiles').select('chart, handle').eq('fbid', fbid).maybeSingle(),
  ]);

  if (!prof.data?.chart) return <Gate t={t} line={t('Create your chart, then the Matchmaker can read who resonates with you.')} href="/profile/new" cta={t('Create your chart')} />;

  const myChart = prof.data.chart as Chart;
  const others = circle.filter((p) => p.fbid !== fbid && p.chart);
  const openTo = (openRes.data as string[] | null) ?? [];

  return (
    <Matchmaker
      myChart={myChart}
      myHandle={prof.data.handle as string}
      circle={others}
      openTo={openTo}
    />
  );
}

function Gate({ t, line, href, cta }: { t: (s: string) => string; line: string; href: string; cta?: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">
      <h1 className="text-3xl font-serif mb-2">{t('Matchmaker')}</h1>
      <p className="text-[#9698a8] mb-5">{line}</p>
      <Link href={href} className="af-btn af-btn-gold inline-flex">{cta ?? t('Sign in')}</Link>
    </div>
  );
}
