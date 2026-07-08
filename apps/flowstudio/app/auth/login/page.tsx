'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { hubRedirect } from '@flowbond/auth';
import { Clapper } from '../../components/icons';

// FlowStudio doesn't host its own auth UI. Login is unified at the FBID hub
// (fbid.flowbond.life); we bounce there and receive the session at /auth/callback.
function Redirector() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  useEffect(() => {
    const origin = window.location.origin;
    window.location.assign(hubRedirect('flowstudio', `${origin}/auth/callback`, next));
  }, [next]);

  return <p className="text-sm text-white/50">Opening the FlowBond gateway…</p>;
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <span className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-xl" style={{ background: 'linear-gradient(135deg,var(--cta),var(--indigo))' }}>
          <Clapper className="h-7 w-7 text-white" />
        </span>
        <h1 className="mb-2 font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Enter Flow<span style={{ color: 'var(--cta)' }}>Studio</span>
        </h1>
        <p className="mb-7 text-sm text-white/55">One FlowBond identity, every tool.</p>
        <Suspense fallback={null}>
          <Redirector />
        </Suspense>
      </div>
    </div>
  );
}
