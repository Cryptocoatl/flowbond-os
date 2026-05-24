import { getOverrides, type ContentOverride } from '@/lib/api'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ siteId: string }> }

const statusColors: Record<string, string> = {
  draft:    'bg-amber-50 text-amber-700',
  pending:  'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  live:     'bg-emerald-50 text-emerald-700',
}

const STATUSES = ['live', 'draft', 'pending', 'rejected'] as const

export default async function ContentPage({ params }: Props) {
  const { siteId } = await params

  const allOverrides = await Promise.all(
    STATUSES.map((s) => getOverrides(siteId, s))
  )
  const overrides = allOverrides.flat().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Group by path for display
  const byPath = overrides.reduce<Record<string, ContentOverride[]>>((acc, o) => {
    acc[o.path] = [...(acc[o.path] ?? []), o]
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-700">All Content</h2>
        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">{overrides.length} overrides</span>
      </div>

      {Object.keys(byPath).length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          No content overrides yet. Activate edit mode on the site to start.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byPath).map(([path, items]) => (
            <div key={path}>
              <p className="text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wide">{path}</p>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                {items.map((o) => (
                  <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono w-14 text-center shrink-0">
                      {o.field}
                    </span>
                    <div className="flex-1 min-w-0">
                      <ContentValue field={o.field} value={o.value} />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[o.status] ?? 'bg-zinc-50 text-zinc-500'}`}>
                      {o.status}
                    </span>
                    <span className="text-xs text-zinc-300 shrink-0 hidden sm:block">
                      v{o.version}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContentValue({ field, value }: { field: string; value: Record<string, unknown> }) {
  if (field === 'text') return <p className="text-sm text-zinc-700 truncate">{String(value.text ?? '')}</p>
  if (field === 'src')  return (
    <div className="flex items-center gap-2">
      <img src={String(value.src ?? '')} alt="" className="h-8 w-8 rounded object-cover border border-zinc-100 shrink-0" />
      <span className="text-xs text-zinc-400 truncate">{String(value.src ?? '')}</span>
    </div>
  )
  if (field === 'href') return <p className="text-sm text-blue-500 truncate">{String(value.href ?? '')}</p>
  return <pre className="text-xs text-zinc-400 truncate">{JSON.stringify(value)}</pre>
}
