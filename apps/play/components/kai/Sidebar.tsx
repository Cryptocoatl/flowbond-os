'use client';
// Sidebar — desktop rail. Collapsible-ready; active state from the current path.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/kai/nav';
import { brand } from '@/lib/brand';
import { Icon } from './Icon';
import { KaiMark } from './KaiMark';

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden shrink-0 lg:flex lg:w-[232px] lg:flex-col">
      <div className="glass sticky top-4 flex h-[calc(100vh-2rem)] flex-col p-4">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-1">
          <KaiMark size={26} />
          <span className="font-display text-[17px] font-semibold tracking-tight text-kai-text">
            KAI <span className="font-normal text-kai-muted">World</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.key === 'explore' ? path === '/' : path.startsWith(item.href.split('#')[0]) && item.href !== '/';
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-kai-gold/10 text-kai-text shadow-[inset_0_0_0_1px_rgba(244,194,90,0.25)]'
                    : 'text-kai-muted hover:bg-white/[0.04] hover:text-kai-text'
                }`}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-kai-gold' : 'text-kai-faint group-hover:text-kai-muted'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl2 border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="eyebrow mb-1">The promise</div>
          <p className="text-[12px] leading-snug text-kai-muted">{brand.promise}</p>
        </div>
      </div>
    </aside>
  );
}
