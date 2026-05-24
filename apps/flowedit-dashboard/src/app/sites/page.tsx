import Link from 'next/link'
import { getAllSites } from '@/lib/api'

export const dynamic = 'force-dynamic'

const approvalColors: Record<string, string> = {
  auto:       'bg-green-100 text-green-800',
  review:     'bg-yellow-100 text-yellow-800',
  admin_only: 'bg-red-100 text-red-800',
}

export default async function SitesPage() {
  const sites = await getAllSites()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sites</h1>
        <p className="text-zinc-500 text-sm mt-1">All registered FlowBond properties</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <Link
            key={site.id}
            href={`/sites/${site.id}/changes`}
            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">
                {site.name.charAt(0)}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${approvalColors[site.approvalMode] ?? 'bg-zinc-100 text-zinc-600'}`}>
                {site.approvalMode.replace('_', ' ')}
              </span>
            </div>
            <h2 className="font-semibold text-zinc-900 group-hover:text-black">{site.name}</h2>
            {site.domain && (
              <p className="text-zinc-400 text-xs mt-0.5">{site.domain}</p>
            )}
            <p className="text-xs text-zinc-400 mt-3 font-mono">{site.slug}</p>
          </Link>
        ))}

        {sites.length === 0 && (
          <div className="col-span-3 text-center py-16 text-zinc-400">
            No sites registered yet.
          </div>
        )}
      </div>
    </div>
  )
}
