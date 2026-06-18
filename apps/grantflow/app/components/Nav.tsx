'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Dashboard' },
  { href: '/grants', label: 'Grants' },
  { href: '/projects', label: 'Projects' },
  { href: '/pipeline', label: 'Pipeline' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="gf-nav">
      <div
        className="gf-wrap"
        style={{ display: 'flex', alignItems: 'center', gap: 24, height: 58 }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 20 }}>🌱</span>
          <span
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Grant<span style={{ color: 'var(--gf-emerald)' }}>Flow</span>
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
