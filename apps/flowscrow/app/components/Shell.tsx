import Link from 'next/link';
import type { Deal, PartyRole } from '@/lib/types';
import { DEAL_STATUS_LABEL, ROLE_LABEL } from '@/lib/ui';
import { SignOut } from './SignOut';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sign', label: 'Sign' },
  { href: '/counsel', label: 'Counsel', roles: ['counsel'] as PartyRole[] },
  { href: '/release', label: 'Release' },
  { href: '/record', label: 'Record' },
];

export function Shell({
  deal,
  myRoles,
  active,
  children,
}: {
  deal: Deal;
  myRoles: PartyRole[];
  active: string;
  children: React.ReactNode;
}) {
  const nav = NAV.filter((n) => !n.roles || n.roles.some((r) => myRoles.includes(r)));
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 20px 64px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span className="gold" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            FlowScrow
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '2px 0 4px', lineHeight: 1.15 }}>
            {deal.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pill" style={{ color: '#C9A961' }}>
              {DEAL_STATUS_LABEL[deal.status]}
            </span>
            <span style={{ fontSize: 12, color: '#8a978c' }}>
              You are: {myRoles.map((r) => ROLE_LABEL[r]).join(', ')}
            </span>
          </div>
        </div>
        <SignOut />
      </header>

      <nav style={{ display: 'flex', gap: 6, margin: '14px 0 18px', flexWrap: 'wrap' }}>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="pill"
            style={{
              textDecoration: 'none',
              color: active === n.href ? '#14241a' : '#cfe0d2',
              background: active === n.href ? 'var(--flow-gold)' : 'transparent',
              borderColor: active === n.href ? 'var(--flow-gold)' : 'rgba(201,169,97,0.35)',
            }}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </main>
  );
}
