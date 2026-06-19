import Link from 'next/link';
import { serverClient } from '../../../lib/supabase-server';
import { myFbid } from '../../../lib/astro/access';
import JoinCrew from '../../components/JoinCrew';
import { getT } from '../../../lib/i18n/server';

// Invite landing: anyone with the link can preview the crew, then sign in,
// create their chart, and join — which mutually shares charts across the crew.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getT();
  const sb = await serverClient();
  const [{ data: preview }, fbid] = await Promise.all([
    sb.rpc('crew_preview', { code }),
    myFbid(),
  ]);
  const crew = Array.isArray(preview) ? preview[0] : null;

  let hasProfile = false;
  if (fbid) {
    const { data } = await sb.from('profiles').select('fbid').eq('fbid', fbid).maybeSingle();
    hasProfile = !!data;
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
      {!crew ? (
        <>
          <h1 className="text-2xl font-serif mb-2">{t('Invite not found')}</h1>
          <p className="text-[#9698a8] mb-5">{t('This invite link is invalid or expired.')}</p>
          <Link href="/" className="text-[#b6abec] underline">{t('Go to AstralFlow')}</Link>
        </>
      ) : (
        <>
          <div className="text-4xl text-[#e3c07a] mb-3" style={{ fontFamily: 'var(--font-display), serif' }}>❖</div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">{t('You’re invited to a crew')}</p>
          <h1 className="text-3xl font-serif mb-1">{crew.name}</h1>
          <p className="text-[#9698a8] mb-6">
            {crew.member_count} {crew.member_count === 1 ? t('member') : t('members')}
            {crew.owner_handle ? t(' · hosted by @{owner}', { owner: crew.owner_handle }) : ''}
          </p>
          <p className="text-sm text-[#b6b3cf] mb-6 leading-relaxed">
            {t('Joining shares your chart with the crew and lets them weave you into collective charts — so you can read each other’s paths and find the best configurations together.')}
          </p>
          <JoinCrew code={code} signedIn={!!fbid} hasProfile={hasProfile} />
        </>
      )}
    </div>
  );
}
