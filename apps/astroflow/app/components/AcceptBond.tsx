'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

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
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const next = `/bond/${code}`;

  if (!signedIn)
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
      >
        Log in to bond your skies
      </a>
    );

  if (!hasProfile)
    return (
      <div>
        <p className="text-sm text-[#9698a8] mb-3">First, create your chart — then the bond weaves both ways.</p>
        <a
          href={`/profile/new?next=${encodeURIComponent(next)}`}
          className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
        >
          Create my chart, then bond
        </a>
      </div>
    );

  function accept() {
    setErr('');
    start(async () => {
      const { data, error } = await browserClient().rpc('accept_bond', { code });
      if (error) setErr(error.message);
      else router.push(`/chart/${data?.handle ?? ''}`);
    });
  }

  return (
    <div>
      <button
        onClick={accept}
        disabled={pending}
        className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-7 py-3 disabled:opacity-50"
      >
        {pending ? 'Weaving the bond…' : '✦ Bond our skies'}
      </button>
      {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}
    </div>
  );
}
