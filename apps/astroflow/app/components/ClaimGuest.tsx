'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

// Mirrors JoinCrew, but for a personalized guest invite. Signup is prefilled
// from the guest's birth data (/profile/new?claim=…), and claiming swaps the
// guest entry for their real profile in every collective chart holding them.
export default function ClaimGuest({
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
  const next = `/claim/${code}`;

  if (!signedIn)
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
      >
        Log in to claim your chart
      </a>
    );

  if (!hasProfile)
    return (
      <div>
        <p className="text-sm text-[#9698a8] mb-3">
          Your birth data is already here — one look and your chart is yours.
        </p>
        <a
          href={`/profile/new?claim=${encodeURIComponent(code)}`}
          className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
        >
          Claim my chart
        </a>
      </div>
    );

  function claim() {
    setErr('');
    start(async () => {
      const { error } = await browserClient().rpc('claim_guest', { code });
      if (error) setErr(error.message);
      else router.push('/dashboard');
    });
  }

  return (
    <div>
      <button
        onClick={claim}
        disabled={pending}
        className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-7 py-3 disabled:opacity-50"
      >
        {pending ? 'Taking your seat…' : 'Claim my seat in the weave'}
      </button>
      {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}
    </div>
  );
}
