'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/claudia', label: 'ClaudIA' },
  { href: '/', label: 'Dashboard' },
  { href: '/grants', label: 'Grants' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/contacts', label: 'CRM' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="gf-nav">
      <div
        className="gf-wrap"
        style={{ display: 'flex', alignItems: 'center', gap: 24, height: 58 }}
      >
        <Link href="/claudia" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/claudia-logo.png" alt="" width={26} height={26} style={{ filter: 'drop-shadow(0 0 8px rgba(231,193,135,0.4))' }} />
          <span
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Claud<span style={{ color: 'var(--cl-gold)' }}>IA</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 20, marginLeft: 'auto' }}>
          {TABS.map((t) => {
            const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="tab"
                style={active ? { color: 'var(--gf-text)' } : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
