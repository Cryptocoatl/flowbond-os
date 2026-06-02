import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import DeployBadge from '@/components/DeployBadge'
import type { OpsProject, OpsDeployStatus, DeployState } from '@/lib/types'

export const dynamic = 'force-dynamic'

const categoryColors: Record<string, string> = {
  platform:  'bg-violet-500/15 text-violet-400',
  product:   'bg-blue-500/15 text-blue-400',
  client:    'bg-emerald-500/15 text-emerald-400',
  mission:   'bg-amber-500/15 text-amber-400',
  community: 'bg-orange-500/15 text-orange-400',
  personal:  'bg-pink-500/15 text-pink-400',
}

export default async function ProjectsPage() {
  const sb = createServiceClient()
  const [{ data }, { data: deploys }] = await Promise.all([
    sb.from('ops_projects').select('*').order('sort_order'),
    sb.from('ops_deploys').select('*'),
  ])

  const projects = (data ?? []) as OpsProject[]
  const deployMap = Object.fromEntries(
    ((deploys ?? []) as OpsDeployStatus[]).map(d => [d.project_id, d])
  )

  const categories = ['all', 'platform', 'product', 'client', 'mission', 'community', 'personal']
  const grouped: Record<string, OpsProject[]> = { all: projects }
  categories.slice(1).forEach(cat => {
    grouped[cat] = projects.filter(p => p.category === cat)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-ops-dim mt-1">{projects.length} total</p>
        </div>
      </div>

      {/* Category groups */}
      {categories.slice(1).map(cat => {
        const ps = grouped[cat]
        if (ps.length === 0) return null
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${categoryColors[cat] ?? 'bg-zinc-500/15 text-zinc-400'}`}>{cat}</span>
              <span className="text-xs text-ops-muted">{ps.length}</span>
            </div>
            <div className="space-y-2">
              {ps.map(p => {
                const deploy = deployMap[p.id]
                return (
                  <div key={p.id} className="card hover:border-ops-muted transition-colors flex items-start gap-4">
                    <Link href={`/dashboard/projects/${p.slug}`} className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 mt-0.5"
                        style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}44` }}
                      >
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-ops-text">{p.name}</span>
                          <StatusBadge value={p.status} type="project" />
                          {p.phase && <span className="text-[10px] text-ops-muted">{p.phase}</span>}
                        </div>
                        <p className="text-xs text-ops-dim mt-0.5 line-clamp-1">{p.description}</p>
                        {p.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.tech_stack.slice(0, 5).map(t => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ops-border text-ops-muted font-mono">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                      <DeployBadge state={deploy?.state as DeployState | null} url={deploy?.url} />
                      {p.url_live && (
                        <a href={p.url_live} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-ops-dim hover:text-emerald-400">↗ live</a>
                      )}
                      {p.github_repo && (
                        <a href={`https://github.com/${p.github_org ?? 'Cryptocoatl'}/${p.github_repo}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-ops-dim hover:text-ops-text">GitHub</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
