import { getUser } from '@/lib/auth';
import RequestAccess from './RequestAccess';

export const dynamic = 'force-dynamic';

export default async function RequestAccessPage() {
  const user = await getUser();
  return (
    <main className="cl-scene cl-motes" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <span className="cl-rays" aria-hidden />
      <span className="cl-sun" aria-hidden />
      <div className="cl-stagger" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div className="cl-logo-halo" style={{ marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cl-logo-img" src="/claudia-logo.png" alt="ClaudIA" width={110} height={110} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 28, margin: '6px 0 6px' }}>
          You&apos;re at the threshold
        </h1>
        <p style={{ color: 'var(--gf-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
          ClaudIA is open to FlowBond members and people Steph invites. You&apos;re signed in as{' '}
          <strong style={{ color: 'var(--cl-gold)' }}>{user?.email ?? 'unknown'}</strong> — ask for access and she&apos;ll let you in.
        </p>
        <div className="gf-card">
          <RequestAccess email={user?.email ?? null} />
        </div>
      </div>
    </main>
  );
}
