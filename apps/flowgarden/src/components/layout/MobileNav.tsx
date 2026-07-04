'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GardenSwitcher } from '@/components/garden/GardenSwitcher'
import { startTour } from '@/components/garden/TourGuide'

interface GardenOption { id: string; name: string; role: string }

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d={d} clipRule="evenodd" />
    </svg>
  )
}

const ICONS = {
  home: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7 1.414 1.414L4 10.414V17a1 1 0 001 1h3v-4h4v4h3a1 1 0 001-1v-6.586l.293.293 1.414-1.414-7-7z',
  plants: 'M14 2a4 4 0 014 4c0 2.5-2 5-4 6.5C12 11 10 8.5 10 6a4 4 0 014-4zM6 9a4 4 0 014 4c0 2.5-2 5-4 6.5C4 18 2 15.5 2 13a4 4 0 014-4z',
  missions: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z',
  world: 'M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z',
  more: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 2a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h4a1 1 0 100-2H6z',
  map: 'M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z',
  journal: 'M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z',
  devices: 'M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z',
  settings: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z',
  tour: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a1.5 1.5 0 112.12 2.12c-.27.27-.58.46-.82.68-.27.25-.49.55-.49 1.01a.75.75 0 001.5 0c0-.02.01-.06.1-.15.07-.07.18-.15.36-.27.2-.14.46-.32.7-.56a3 3 0 10-4.24-4.24.75.75 0 001.06 1.06l.02-.02zM10 15a1 1 0 100-2 1 1 0 000 2z',
  signout: 'M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 12H9a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z',
}

const PRIMARY = [
  { href: '/flowgarden', label: 'Home', icon: ICONS.home },
  { href: '/flowgarden/plants', label: 'Plants', icon: ICONS.plants },
  { href: '/flowgarden/tasks', label: 'Missions', icon: ICONS.missions },
  { href: '/flowgarden/world', label: 'World', icon: ICONS.world },
]

// Destinations that live in the "More" menu sheet.
const MORE_LINKS = [
  { href: '/flowgarden/map', label: 'Garden Map', icon: ICONS.map },
  { href: '/flowgarden/journal', label: 'Journal', icon: ICONS.journal },
  { href: '/flowgarden/devices', label: 'Devices', icon: ICONS.devices },
  { href: '/flowgarden/settings', label: 'Settings', icon: ICONS.settings },
]

export function MobileNav({
  gardens,
  activeId,
  activeName,
}: {
  gardens: GardenOption[]
  activeId: string
  activeName: string
}) {
  const pathname = usePathname()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [menuOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const moreActive = MORE_LINKS.some(l => pathname.startsWith(l.href))

  return (
    <>
      {/* Top header — mobile only, safe-area aware */}
      <header
        className="fixed top-0 inset-x-0 z-40 flex items-center gap-2 px-3 md:hidden"
        style={{
          backgroundColor: 'var(--fg-sidebar-bg)',
          borderBottom: '1px solid var(--fg-sidebar-border)',
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3.5rem + env(safe-area-inset-top))',
        }}
      >
        <div className="relative shrink-0" style={{ width: 26, height: 26 }}>
          <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <GardenSwitcher gardens={gardens} activeId={activeId} activeName={activeName} />
        </div>
      </header>

      {/* Bottom tab bar — mobile only, safe-area aware */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden"
        style={{
          backgroundColor: 'var(--fg-sidebar-bg)',
          borderTop: '1px solid var(--fg-sidebar-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(4rem + env(safe-area-inset-bottom))',
        }}
      >
        {PRIMARY.map(item => {
          const isActive = item.href === '/flowgarden' ? pathname === '/flowgarden' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: isActive ? 'var(--fg-sidebar-active-text)' : 'var(--fg-sidebar-text)' }}
            >
              {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-b-full" style={{ backgroundColor: 'var(--fg-sidebar-active-text)' }} />}
              <Icon d={item.icon} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ color: moreActive || menuOpen ? 'var(--fg-sidebar-active-text)' : 'var(--fg-sidebar-text)' }}
        >
          {moreActive && <span className="absolute top-0 w-8 h-0.5 rounded-b-full" style={{ backgroundColor: 'var(--fg-sidebar-active-text)' }} />}
          <Icon d={ICONS.more} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>

      {/* More menu sheet */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end md:hidden"
          style={{ background: 'rgba(7,16,9,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full rounded-t-3xl overflow-hidden"
            style={{
              backgroundColor: 'var(--fg-surface)',
              borderTop: '1px solid var(--fg-border-accent)',
              boxShadow: 'var(--fg-shadow-lg)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
              animation: 'fg-fade-up 0.25s ease both',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <span className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--fg-border)' }} />
            </div>
            <p className="text-center text-xs text-fg-muted pb-2">{activeName}</p>

            <div className="px-3 pb-2 grid grid-cols-1 divide-y" style={{ borderColor: 'var(--fg-border)' }}>
              {MORE_LINKS.map(l => {
                const isActive = pathname.startsWith(l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-3 px-2 py-3.5 text-sm font-medium"
                    style={{ color: isActive ? 'var(--fg-gold)' : 'var(--fg-text)' }}
                  >
                    <span style={{ color: isActive ? 'var(--fg-gold)' : 'var(--fg-text-secondary)' }}><Icon d={l.icon} /></span>
                    <span className="flex-1">{l.label}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-fg-dim">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </Link>
                )
              })}
            </div>

            <div className="px-3 pt-2 pb-1 flex items-center gap-2" style={{ borderTop: '1px solid var(--fg-border)' }}>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setTimeout(() => startTour(), 250) }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--fg-panel)', color: 'var(--fg-text-secondary)' }}
              >
                <Icon d={ICONS.tour} /> Take a tour
              </button>
              <div className="flex items-center justify-center px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--fg-panel)' }}>
                <ThemeToggle />
              </div>
            </div>

            <div className="px-3 pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{ color: '#dc6a5b', backgroundColor: 'rgba(220,106,91,0.08)' }}
              >
                <Icon d={ICONS.signout} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
