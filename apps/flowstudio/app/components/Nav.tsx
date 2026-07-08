'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Wordmark } from './Wordmark';

export default function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 transition-all" style={{ padding: solid ? '0.5rem 0' : '0.85rem 0' }}>
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all"
        style={{
          border: `1px solid ${solid ? 'var(--border)' : 'transparent'}`,
          background: solid ? 'rgba(10,8,18,0.72)' : 'transparent',
          backdropFilter: solid ? 'blur(16px)' : 'none',
          marginLeft: '0.75rem',
          marginRight: '0.75rem',
        }}
      >
        <Link href="/" className="group">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link href="/me" className="hidden rounded-lg px-3 py-1.5 text-white/70 transition-colors hover:text-white sm:block">Studio</Link>
          <Link href="/events" className="hidden rounded-lg px-3 py-1.5 text-white/70 transition-colors hover:text-white sm:block">Events</Link>
          <Link href="/auth/login?next=/me" className="btn-primary !px-4 !py-2 text-sm">Enter</Link>
        </div>
      </nav>
    </header>
  );
}
