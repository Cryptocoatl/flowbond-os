'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

export default function JoinCrew({
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
  const next = `/join/${code}`;

  if (!signedIn)
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
      >
        Log in to join
      </a>
    );

  if (!hasProfile)
    return (
      <div>
        <p className="text-sm text-[#9698a8] mb-3">First, create your chart so the crew can read your path.</p>
        <a
          href={`/profile/new?next=${encodeURIComponent(next)}`}
          className="inline-block bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3"
        >
          Create my chart, then join
        </a>
      </div>
    );

  function join() {
    setErr('');
    start(async () => {
      const { error } = await browserClient().rpc('join_crew', { code });
      if (error) setErr(error.message);
      else router.push('/dashboard');
    });
  }

  return (
    <div>
      <button
        onClick={join}
        disabled={pending}
        className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-7 py-3 disabled:opacity-50"
      >
        {pending ? 'Joining…' : 'Join the crew'}
      </button>
      {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}
    </div>
  );
}
