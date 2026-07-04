'use client'

import { type MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GardenSwitcher } from '@/components/garden/GardenSwitcher'
import { startTour } from '@/components/garden/TourGuide'

interface GardenOption { id: string; name: string; role: string }

const NAV = [
  {
    href: '/flowgarden',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 10a3.001 3.001 0 01-2 2.83V15a1 1 0 11-2 0v-2.17A3 3 0 017 10a3 3 0 014.132-2.765A1 1 0 0010 7z" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/map',
    label: 'Garden Map',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/world',
    label: 'Garden World',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/plants',
    label: 'Plants',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M14 2a4 4 0 014 4c0 2.5-2 5-4 6.5C12 11 10 8.5 10 6a4 4 0 014-4zM6 9a4 4 0 014 4c0 2.5-2 5-4 6.5C4 18 2 15.5 2 13a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/journal',
    label: 'Journal',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/tasks',
    label: 'Missions',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/flowgarden/devices',
    label: 'Devices',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ),
  },
]

export function Sidebar({
  gardens,
  activeId,
  activeName,
}: {
  gardens: GardenOption[]
  activeId: string
  activeName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside
      className="hidden md:flex w-60 flex-col shrink-0"
      style={{ backgroundColor: 'var(--fg-sidebar-bg)', borderRight: '1px solid var(--fg-sidebar-border)' }}
    >
      {/* Logo lockup */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--fg-sidebar-border)' }}>
        <Link href="/flowgarden" className="flex items-center gap-3 group">
          <div className="relative shrink-0" style={{ width: 32, height: 32 }}>
            <Image
              src="/logos/mark/flowgarden-mark-gold-1024.png"
              alt="FlowGarden"
              fill
              className="object-contain transition-opacity group-hover:opacity-90"
            />
          </div>
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--fg-sidebar-text-active)', letterSpacing: '0.14em' }}
            >
              FlowGarden
            </p>
            <p
              className="text-[9px] tracking-widest uppercase"
              style={{ color: '#C9A961', opacity: 0.65, letterSpacing: '0.12em' }}
            >
              Grow · Flow · Thrive
            </p>
          </div>
        </Link>
      </div>

      {/* Garden switcher */}
      <div className="px-3 pt-3">
        <GardenSwitcher gardens={gardens} activeId={activeId} activeName={activeName} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const isActive = item.href === '/flowgarden'
            ? pathname === '/flowgarden'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={`nav-${item.href.split('/').pop() || 'dashboard'}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
              style={{
                backgroundColor: isActive ? 'var(--fg-sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--fg-sidebar-active-text)' : 'var(--fg-sidebar-text)',
              }}
              onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)'
                  e.currentTarget.style.color = 'var(--fg-sidebar-text-active)'
                }
              }}
              onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--fg-sidebar-text)'
                }
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <span
                  className="w-1 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--fg-sidebar-active-text)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-1" style={{ borderTop: '1px solid var(--fg-sidebar-border)' }}>
        <button
          type="button"
          onClick={() => startTour()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: 'var(--fg-sidebar-text)' }}
          onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)'
            e.currentTarget.style.color = 'var(--fg-sidebar-active-text)'
          }}
          onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--fg-sidebar-text)'
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a1.5 1.5 0 112.12 2.12c-.27.27-.58.46-.82.68-.27.25-.49.55-.49 1.01a.75.75 0 001.5 0c0-.02.01-.06.1-.15.07-.07.18-.15.36-.27.2-.14.46-.32.7-.56a3 3 0 10-4.24-4.24.75.75 0 001.06 1.06l.02-.02zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Take a tour
        </button>
        <Link
          href="/flowgarden/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: 'var(--fg-sidebar-text)' }}
          onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)'
            e.currentTarget.style.color = 'var(--fg-sidebar-text-active)'
          }}
          onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--fg-sidebar-text)'
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Settings
        </Link>

        <div className="flex items-center justify-between px-3 py-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs transition-colors"
            style={{ color: 'var(--fg-sidebar-text)' }}
            onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'var(--fg-sidebar-text)')}
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
