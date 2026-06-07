'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { hubRedirect } from '@flowbond/auth';

// FLOW3 doesn't host its own auth UI. Login is unified at the FBID hub
// (fbid.flowbond.life); we bounce there and receive the session back at
// /auth/callback.
function Redirector() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/studio';

  useEffect(() => {
    const origin = window.location.origin;
    window.location.assign(hubRedirect('flow3', `${origin}/auth/callback`, next));
  }, [next]);

  return <p className="text-white/40 text-sm">Opening the FlowBond gateway…</p>;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="max-w-sm mx-auto p-8 text-center">
        <h1 className="font-display text-4xl text-white mb-2">Enter FLOW3</h1>
        <p className="text-white/50 text-sm mb-8">One FlowBond identity, every world.</p>
        <Suspense fallback={null}>
          <Redirector />
        </Suspense>
      </div>
    </div>
  );
}
