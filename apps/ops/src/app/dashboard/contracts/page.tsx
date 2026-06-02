import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import type { OpsContract } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const sb = createServiceClient()

  const { data } = await sb
    .from('ops_contracts')
    .select(`
      *,
      ops_projects(id, name, slug, icon),
      ops_people(id, name)
    `)
    .order('created_at', { ascending: false })

  const contracts = (data ?? []) as Array<OpsContract & {
    ops_projects: { id: string; name: string; slug: string; icon: string } | null
    ops_people: { id: string; name: string } | null
  }>

  const active = contracts.filter(c => c.status === 'active')
  const other = contracts.filter(c => c.status !== 'active')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-ops-dim mt-1">{contracts.length} total · {active.length} active</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ops-dim">No contracts yet.</p>
          <p className="text-xs text-ops-muted mt-1">Contracts will appear here once added via Supabase or the API.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Active</h2>
              <ContractRows contracts={active} />
            </div>
          )}
          {other.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-2">Other</h2>
              <ContractRows contracts={other} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContractRows({ contracts }: {
  contracts: Array<OpsContract & {
    ops_projects: { id: string; name: string; slug: string; icon: string } | null
    ops_people: { id: string; name: string } | null
  }>
}) {
  return (
    <div className="space-y-2">
      {contracts.map(c => (
        <div key={c.id} className="card flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-ops-text">{c.title}</h3>
              <StatusBadge value={c.status} type="contract" />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {c.ops_projects && (
                <Link href={`/dashboard/projects/${c.ops_projects.slug}`}
                  className="text-xs text-ops-dim hover:text-ops-accent flex items-center gap-1">
                  <span>{c.ops_projects.icon}</span> {c.ops_projects.name}
                </Link>
              )}
              {c.ops_people && (
                <span className="text-xs text-ops-dim">{c.ops_people.name}</span>
              )}
              {c.start_date && (
                <span className="text-xs text-ops-muted">{c.start_date} → {c.end_date ?? '∞'}</span>
              )}
            </div>
            {c.notes && <p className="text-xs text-ops-muted mt-2">{c.notes}</p>}
          </div>
          {c.value_usd != null && (
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-ops-text">
                ${c.value_usd.toLocaleString()} <span className="text-xs font-normal text-ops-dim">{c.currency}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
