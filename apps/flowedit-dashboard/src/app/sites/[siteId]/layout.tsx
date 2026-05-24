import Link          from 'next/link'
import { getSite }   from '@/lib/api'
import { notFound }  from 'next/navigation'

interface Props {
  children:  React.ReactNode
  params:    Promise<{ siteId: string }>
}

const navItems = [
  { href: 'changes', label: 'Changes' },
  { href: 'content', label: 'All Content' },
]

export default async function SiteLayout({ children, params }: Props) {
  const { siteId } = await params
  const site       = await getSite(siteId)
    ?? await getSite(siteId) // try by id then by slug
  if (!site) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
        <Link href="/sites" className="hover:text-zinc-700">Sites</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{site.name}</span>
      </div>

      {/* Site header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold">
          {site.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold">{site.name}</h1>
          {site.domain && <p className="text-zinc-400 text-xs">{site.domain}</p>}
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={`/sites/${siteId}/${item.href}`}
            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent hover:border-zinc-400 -mb-px transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
