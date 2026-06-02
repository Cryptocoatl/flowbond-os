'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '◈', accent: false },
  { href: '/dashboard/projects', label: 'Projects', icon: '◉', accent: false },
  { href: '/dashboard/tasks', label: 'Tasks', icon: '◻', accent: false },
  { href: '/dashboard/brain', label: 'AI Brain', icon: '◬', accent: true },
  { href: '/dashboard/activity', label: 'Activity', icon: '◑', accent: false },
  { href: '/dashboard/people', label: 'People', icon: '◯', accent: false },
  { href: '/dashboard/contracts', label: 'Contracts', icon: '◪', accent: false },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-ops-border bg-ops-surface min-h-screen">
      <div className="px-5 py-5 border-b border-ops-border">
        <div className="flex items-center gap-2">
          <span className="text-ops-accent font-bold text-lg">⚡</span>
          <div>
            <p className="text-xs font-bold text-ops-text tracking-widest uppercase">FlowBond</p>
            <p className="text-[10px] text-ops-dim tracking-widest uppercase">OPS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? item.accent
                    ? 'bg-violet-500/20 text-violet-300 font-medium'
                    : 'bg-ops-accent/15 text-ops-accent-light font-medium'
                  : item.accent
                    ? 'text-violet-400 hover:bg-violet-500/10 hover:text-violet-300'
                    : 'text-ops-dim hover:bg-ops-border hover:text-ops-text'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-ops-border space-y-2">
        <a
          href="https://github.com/cryptocoatl"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-5 h-5 rounded-full bg-ops-muted flex items-center justify-center text-[9px] font-bold text-ops-text shrink-0">C</div>
          <div>
            <p className="text-[10px] text-ops-dim font-mono leading-none">cryptocoatl</p>
            <p className="text-[9px] text-ops-muted leading-none mt-0.5">github.com/cryptocoatl</p>
          </div>
        </a>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-[10px] text-ops-muted hover:text-red-400 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
