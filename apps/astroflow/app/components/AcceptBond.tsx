'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// FBID-first acceptance: login → create chart (prefname next= chain) → bond.
export default function AcceptBond({
  code,
  signedIn,
  hasProfile,
}: {
  code: string;
  signedIn: boolean;
  hasProfile: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [requested, setRequested] = useState<string | null>(null);
  const next = `/bond/${code}`;

  if (!signedIn)
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
      >
        {t('Log in to bond your skies')}
      </a>
    );

  if (!hasProfile)
    return (
      <div>
        <p className="text-sm text-[#9698a8] mb-3">{t('First, create your chart — then the bond weaves both ways.')}</p>
        <a
          href={`/profile/new?next=${encodeURIComponent(next)}`}
          className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
        >
          {t('Create my chart, then bond')}
        </a>
      </div>
    );

  function accept() {
    setErr('');
    start(async () => {
      const { data, error } = await browserClient().rpc('accept_bond', { code });
      if (error) { setErr(error.message); return; }
      // This pair erased a bond before — reconnection is by consent, not by
      // reopening a link. accept_bond quietly filed a request for them to approve.
      if (data?.status === 'request_sent') {
        setRequested(data?.display_name || data?.handle || t('them'));
        return;
      }
      router.push(`/chart/${data?.handle ?? ''}`);
    });
  }

  if (requested)
    return (
      <div className="max-w-sm">
        <p className="text-sm text-[#ece9e0]">
          {t("You and {name} had erased your bond, so it doesn't just snap back. ✦", { name: requested })}
        </p>
        <p className="text-sm text-[#9698a8] mt-2">
          {t('We sent a gentle request to reconnect — once they say yes, your skies bond again. No pressure, only consent.')}
        </p>
      </div>
    );

  return (
    <div>
      <button
        onClick={accept}
        disabled={pending}
        className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-7 py-3 disabled:opacity-50"
      >
        {pending ? t('Weaving the bond…') : t('✦ Bond our skies')}
      </button>
      {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}
    </div>
  );
}
