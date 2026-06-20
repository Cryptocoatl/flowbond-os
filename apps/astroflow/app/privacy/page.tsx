import Link from 'next/link';
import { getT } from '../../lib/i18n/server';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/astro/access';
import DataSovereignty from '../components/DataSovereignty';

// Identity & Data Sovereignty — the clear, accessible home for governing your
// own data: who you're weaved with, who can see you, who reads you, the
// constellations you're in, your default visibility, and erasing your account.
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const t = await getT();
  const fbid = await myFbid();

  if (!fbid) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
        <h1 className="text-2xl font-serif mb-3">{t('Your data & sovereignty')}</h1>
        <p className="text-[#9698a8] mb-5">{t('Sign in to see and govern your data.')}</p>
        <Link href="/auth/login?next=/privacy" className="af-btn af-btn-gold">{t('Log in')}</Link>
      </div>
    );
  }

  const sb = await serverClient();
  const [me, friends, allowances, audience, maps] = await Promise.all([
    sb.from('profiles').select('handle, display_name, visibility').eq('fbid', fbid).maybeSingle(),
    sb.rpc('my_friends'),
    sb.rpc('my_allowances'),
    sb.rpc('my_audience'),
    sb.rpc('my_flow_maps'),
  ]);

  const mapRows = ((maps.data ?? []) as any[]).map((m) => ({
    id: m.id,
    name: m.name,
    context: m.context,
    is_owner: !!m.is_owner,
    member_count: Array.isArray(m.members) ? m.members.length : 0,
  }));

  return (
    <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">
      <Link href="/dashboard" className="text-xs text-[#5b5e72]">← {t('dashboard')}</Link>
      <h1 className="text-3xl font-serif mt-3 mb-1">{t('Your data & sovereignty')}</h1>
      <p className="text-sm text-[#9698a8] mb-6">
        {t('See and govern everything AstroFlow holds about you — who you’re weaved with, who can see you, and how to erase any of it.')}
      </p>

      {me.data ? (
        <DataSovereignty
          me={me.data as any}
          friends={(friends.data ?? []) as any}
          allowances={(allowances.data ?? []) as any}
          audience={(audience.data ?? []) as any}
          maps={mapRows}
        />
      ) : (
        <p className="text-[#9698a8]">{t('You don’t have a chart yet.')} <Link href="/profile/new" className="text-[#b6abec] underline">{t('+ Add your chart')}</Link></p>
      )}
    </div>
  );
}
