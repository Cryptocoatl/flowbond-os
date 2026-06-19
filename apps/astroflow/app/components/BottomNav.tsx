'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// Native-style bottom tab bar (mobile only). The always-there way to move
// around AstralFlow — your sky, the map, the currents, the cosmos, and you.
// Desktop keeps the top nav (this is sm:hidden).

const TABS = [
  { href: '/', label: 'Sky', icon: 'sky' },
  { href: '/atlas', label: 'Atlas', icon: 'atlas' },
  { href: '/systems', label: 'Currents', icon: 'currents' },
  { href: '/cosmos', label: 'Cosmos', icon: 'cosmos' },
  { href: '/dashboard', label: 'You', icon: 'you' },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const c = active ? '#e3c07a' : '#6b6e86';
  const common = { width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'sky': // the four-point star — your constellation
      return <svg {...common}><path d="M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 12 3 Z" fill={active ? 'rgba(227,192,122,0.18)' : 'none'} /></svg>;
    case 'atlas': // globe
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>;
    case 'currents': // flowing waves
      return <svg {...common}><path d="M3 8.5c3-3 5 3 8 0s5-3 9 0" /><path d="M3 13c3-3 5 3 8 0s5-3 9 0" /><path d="M3 17.5c3-3 5 3 8 0s5-3 9 0" /></svg>;
    case 'cosmos': // sparkle
      return <svg {...common}><path d="M12 3l1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6z" fill={active ? 'rgba(227,192,122,0.18)' : 'none'} /></svg>;
    case 'you': // person
      return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8" /></svg>;
    default:
      return null;
  }
}

export default function BottomNav() {
  const tr = useT();
  const path = usePathname() || '/';
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  // Pending bond requests → a badge on the "You" tab so it's never missed.
  const [bondReqs, setBondReqs] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await browserClient().rpc('my_incoming_bond_requests');
      if (alive) setBondReqs(Array.isArray(data) ? data.length : 0);
    })();
    return () => { alive = false; };
  }, [path]);

  // Hidden on the auth screens so it doesn't crowd the login flow.
  if (path.startsWith('/auth') || path.startsWith('/bond') || path.startsWith('/claim') || path.startsWith('/join')) return null;

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-[#0b0a1a]/90 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 active:scale-90 transition"
            >
              <span className="relative">
                <Icon name={t.icon} active={active} />
                {t.icon === 'you' && bondReqs > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-[#e3c07a] text-[#0a0b12] text-[10px] font-bold leading-none">
                    {bondReqs > 9 ? '9+' : bondReqs}
                  </span>
                )}
              </span>
              <span className={`text-[10px] tracking-wide ${active ? 'text-[#e3c07a] font-medium' : 'text-[#6b6e86]'}`}>
                {tr(t.label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
