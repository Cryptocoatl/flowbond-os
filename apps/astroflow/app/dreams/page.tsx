import Link from 'next/link';
import { getT } from '../../lib/i18n/server';
import { myFbid } from '../../lib/astro/access';
import Dreams from '../components/Dreams';

// Dreams — the community roadmap. Anyone can post what they wish AstralFlow
// could do, vote on the wall, or ask FlowMe to dream up ideas. The most-loved
// dreams become what we build next.
export const dynamic = 'force-dynamic';

export default async function DreamsPage() {
  const t = await getT();
  const fbid = await myFbid();

  if (!fbid) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
        <h1 className="text-2xl font-serif mb-3">{t('Dreams')}</h1>
        <p className="text-[#9698a8] mb-5">{t('Sign in to dream AstralFlow forward and vote on what gets built.')}</p>
        <Link href="/auth/login?next=/dreams" className="af-btn af-btn-gold">{t('Log in')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-24">
      <header className="mb-5">
        <h1 className="text-2xl font-serif text-[#ece9e0]">{t('Dreams')}</h1>
        <p className="text-[#9698a8] text-[14px] mt-1">
          {t('Tell AstralFlow what to become. Post a dream, vote what you love, or ask the stars what would be cool to build next.')}
        </p>
      </header>
      <Dreams />
    </div>
  );
}
