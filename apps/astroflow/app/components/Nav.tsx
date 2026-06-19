import Link from 'next/link';
import { FlowMeChip } from '@flowbond/ui';
import { serverClient } from '../../lib/supabase-server';
import { Logo } from './brand/Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { getT } from '../../lib/i18n/server';

// Always-there compass: wherever you drift in the flow, one tap returns you
// to your constellation, your dashboard, or the astral university.
export default async function Nav() {
  // Ecosystem back-link: this soul's FlowMe profile. The astroflow client is
  // scoped to the astroflow schema, so hop to public for flowme_profiles.
  let flowMeHandle: string | null = null;
  try {
    const supabase = await serverClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .schema('public')
        .from('flowme_profiles')
        .select('handle')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      flowMeHandle = (data as { handle?: string } | null)?.handle ?? null;
    }
  } catch {
    /* unauthenticated or transient — chip falls back to the claim CTA */
  }

  const t = await getT();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0a1a]/70 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-5 text-[#9698a8]">
        <Link href="/" className="flex items-center gap-2 text-[#ece9e0]">
          <Logo size={24} />
          <span className="font-serif tracking-wide">AstralFlow</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs uppercase tracking-[0.14em]">
            <Link href="/" className="hover:text-[#cfc8e8] transition">{t('Constellation')}</Link>
            <Link href="/dashboard" className="hover:text-[#cfc8e8] transition">{t('Dashboard')}</Link>
            <Link href="/atlas" className="hover:text-[#cfc8e8] transition">{t('Atlas')}</Link>
            <Link href="/systems" className="hover:text-[#cfc8e8] transition">{t('Currents')}</Link>
            <Link href="/instant" className="hover:text-[#cfc8e8] transition hidden sm:inline">{t('Instant')}</Link>
            <Link href="/cosmos" className="hover:text-[#e3c07a] transition">{t('Cosmos ✦')}</Link>
            <FlowMeChip handle={flowMeHandle} className="text-[#9698a8] hover:text-[#cfc8e8] transition normal-case tracking-normal" />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
