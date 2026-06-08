'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { hubRedirect } from '@flowbond/auth';
import { Logo } from '../../components/Wordmark';

// FlowStudio doesn't host its own auth UI. Login is unified at the FBID hub
// (fbid.flowbond.life); we bounce there and receive the session back at
// /auth/callback.
function Redirector() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/studio';

  useEffect(() => {
    const origin = window.location.origin;
    window.location.assign(hubRedirect('flow3', `${origin}/auth/callback`, next));
  }, [next]);

  return <p className="text-ink-muted text-sm">Opening the FlowBond gateway…</p>;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-base grid place-items-center px-6">
      <div className="panel-raise rounded-2xl p-10 max-w-sm w-full text-center">
        <div className="mx-auto mb-6 w-14 h-14 grid place-items-center"><Logo size={56} /></div>
        <h1 className="display text-3xl mb-2">
          Enter Flow<span className="text-teal-bright">Studio</span>
        </h1>
        <p className="text-ink-muted text-sm mb-7">One FlowBond identity, every tool.</p>
        <Suspense fallback={null}>
          <Redirector />
        </Suspense>
      </div>
    </div>
  );
}
