'use client'

import { type MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const BOTTOM_NAV = [
  {
    href: '/flowgarden',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/world',
    label: 'World',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/plants',
    label: 'Plants',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M14 2a4 4 0 014 4c0 2.5-2 5-4 6.5C12 11 10 8.5 10 6a4 4 0 014-4zM6 9a4 4 0 014 4c0 2.5-2 5-4 6.5C4 18 2 15.5 2 13a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/tasks',
    label: 'Missions',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/settings',
    label: 'More',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
]

export function MobileNav({ gardenName }: { gardenName?: string | null }) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <>
      {/* Top header — mobile only */}
      <header
        className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-4 md:hidden"
        style={{
          backgroundColor: 'var(--fg-sidebar-bg)',
          borderBottom: '1px solid var(--fg-sidebar-border)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
            <Image
              src="/logos/mark/flowgarden-mark-gold-1024.png"
              alt="FlowGarden"
              fill
              className="object-contain"
            />
          </div>
          <span
            className="text-xs font-bold tracking-widest uppercase truncate"
            style={{ color: 'var(--fg-sidebar-text-active)', letterSpacing: '0.12em' }}
          >
            {gardenName ?? 'FlowGarden'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="p-2 transition-colors"
            style={{ color: 'var(--fg-sidebar-text)' }}
            onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'var(--fg-sidebar-text)')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 12H9a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 h-16 flex md:hidden safe-area-bottom"
        style={{
          backgroundColor: 'var(--fg-sidebar-bg)',
          borderTop: '1px solid var(--fg-sidebar-border)',
        }}
      >
        {BOTTOM_NAV.map(item => {
          const isActive =
            item.href === '/flowgarden'
              ? pathname === '/flowgarden'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                color: isActive ? 'var(--fg-sidebar-active-text)' : 'var(--fg-sidebar-text)',
              }}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 w-8 h-0.5 rounded-t-full"
                  style={{ backgroundColor: 'var(--fg-sidebar-active-text)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
