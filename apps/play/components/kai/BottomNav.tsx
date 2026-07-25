'use client';
// BottomNav — mobile-first bottom bar (hidden on lg+). Focused subset of NAV.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, MOBILE_NAV_KEYS } from '@/lib/kai/nav';
import { Icon } from './Icon';

export function BottomNav() {
  const path = usePathname();
  const items = NAV.filter((n) => MOBILE_NAV_KEYS.includes(n.key));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-black/60 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.key === 'explore' ? path === '/' : path.startsWith(item.href.split('#')[0]) && item.href !== '/';
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${active ? 'text-kai-gold' : 'text-kai-faint'}`}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
