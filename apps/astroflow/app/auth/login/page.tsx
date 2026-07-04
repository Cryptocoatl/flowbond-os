'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { hubRedirect } from '@flowbond/auth';

// AstroFlow no longer hosts its own auth UI. Login is unified at the FBID hub
// (fbid.flowbond.life); we just bounce there and receive the session back at
// /auth/callback. AstroFlow stays its own app at astro.flowbond.life.
function Redirector() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  useEffect(() => {
    const origin = window.location.origin;
    window.location.assign(hubRedirect('astroflow', `${origin}/auth/callback`, next));
  }, [next]);

  return <p className="text-[#9698a8] text-sm">Redirecting to FlowBond sign-in…</p>;
}

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto p-6 mt-16 text-[#ece9e0]">
      <h1 className="text-3xl font-serif mb-1">Enter AstroFlow</h1>
      <p className="text-[#9698a8] text-sm mb-6">One FlowBond identity, every app.</p>
      <Suspense fallback={null}>
        <Redirector />
      </Suspense>
    </div>
  );
}
