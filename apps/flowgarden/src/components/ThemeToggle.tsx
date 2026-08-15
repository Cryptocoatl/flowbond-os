'use client'

import { useEffect, useState, type MouseEvent } from 'react'

export function ThemeToggle({
  className = '',
  /** `sidebar` = always-dark chrome, `surface` = normal page/panel background.
      It used to hardcode the sidebar colour, so on the light mobile "More"
      sheet the icon was cream-on-cream and effectively invisible. */
  tone = 'sidebar',
  showLabel = false,
}: {
  className?: string
  tone?: 'sidebar' | 'surface'
  showLabel?: boolean
}) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('fg-theme', next ? 'dark' : 'light') } catch { /* private mode */ }
    // Keep the browser/PWA status bar in step with the choice.
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
      m.setAttribute('content', next ? '#0A1A0C' : '#F2EDE3')
      m.removeAttribute('media')
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`min-w-[2.25rem] h-9 px-2 rounded-lg inline-flex items-center justify-center gap-2 text-xs font-medium transition-all ${className}`}
      style={{ color: tone === 'sidebar' ? 'var(--fg-sidebar-text)' : 'var(--fg-text-secondary)' }}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor =
        tone === 'sidebar' ? 'rgba(239,232,216,0.07)' : 'var(--fg-border)')}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
      {showLabel && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
