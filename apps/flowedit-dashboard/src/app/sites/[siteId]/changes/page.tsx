import { getOverrides, type ContentOverride } from '@/lib/api'
import { ApproveButton, RejectButton }        from './actions'
import { AiPrompt }                           from './AiPrompt'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ siteId: string }> }

const statusColors: Record<string, string> = {
  draft:    'bg-amber-50  text-amber-700  border-amber-200',
  pending:  'bg-blue-50   text-blue-700   border-blue-200',
  approved: 'bg-green-50  text-green-700  border-green-200',
  rejected: 'bg-red-50    text-red-700    border-red-200',
  live:     'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default async function ChangesPage({ params }: Props) {
  const { siteId } = await params
  const drafts     = await getOverrides(siteId, 'draft')
  const pending    = await getOverrides(siteId, 'pending')
  const queue      = [...pending, ...drafts]

  return (
    <div>
      <AiPrompt siteId={siteId} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-700">Change Queue</h2>
        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">{queue.length} pending</span>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          No pending changes
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((override) => (
            <OverrideCard key={override.id} override={override} siteId={siteId} />
          ))}
        </div>
      )}
    </div>
  )
}

function OverrideCard({ override, siteId }: { override: ContentOverride; siteId: string }) {
  const statusClass = statusColors[override.status] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusClass}`}>
            {override.status}
          </span>
          <span className="text-xs text-zinc-400 font-mono">{override.path}</span>
          <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{override.field}</span>
          <span className="text-xs text-zinc-400">· {override.tier}</span>
        </div>

        <ValuePreview field={override.field} value={override.value} />

        {override.changeNote && (
          <p className="text-xs text-zinc-400 mt-1 italic">"{override.changeNote}"</p>
        )}
        <p className="text-xs text-zinc-300 mt-1">{new Date(override.createdAt).toLocaleString()}</p>
      </div>

      <div className="flex gap-2 shrink-0">
        <ApproveButton siteId={siteId} overrideId={override.id} />
        <RejectButton  siteId={siteId} overrideId={override.id} />
      </div>
    </div>
  )
}

function ValuePreview({ field, value }: { field: string; value: Record<string, unknown> }) {
  if (field === 'text')  return <p className="text-sm text-zinc-700 font-medium truncate">{String(value.text ?? '')}</p>
  if (field === 'src')   return <img src={String(value.src ?? '')} alt={String(value.alt ?? '')} className="h-12 rounded object-cover border border-zinc-100 mt-1" />
  if (field === 'href')  return <p className="text-sm text-blue-600 truncate">{String(value.href ?? '')}</p>
  if (field === 'style') return <pre className="text-xs bg-zinc-50 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(value.style, null, 2)}</pre>
  return <pre className="text-xs text-zinc-400 mt-1">{JSON.stringify(value)}</pre>
}
