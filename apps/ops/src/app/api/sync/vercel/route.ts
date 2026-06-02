import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID!

async function fetchLatestDeploy(projectId: string) {
  const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${VERCEL_TEAM_ID}&limit=1&target=production`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.deployments?.[0] ?? null
}

export async function POST() {
  const sb = createServiceClient()
  const { data: projects } = await sb
    .from('ops_projects')
    .select('id, slug, vercel_project_id')
    .not('vercel_project_id', 'is', null)

  if (!projects?.length) return NextResponse.json({ synced: 0 })

  let synced = 0
  const results: { slug: string; state: string | null }[] = []

  await Promise.all(
    projects.map(async (p: { id: string; slug: string; vercel_project_id: string | null }) => {
      try {
        const deploy = await fetchLatestDeploy(p.vercel_project_id!)
        if (!deploy) return

        await sb.from('ops_deploys').upsert({
          project_id: p.id,
          vercel_project_id: p.vercel_project_id,
          state: deploy.state ?? null,
          url: deploy.url ? `https://${deploy.url}` : null,
          created_at_vercel: deploy.createdAt ? new Date(deploy.createdAt).toISOString() : null,
          commit_message: deploy.meta?.githubCommitMessage ?? deploy.name ?? null,
          branch: deploy.meta?.githubCommitRef ?? null,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'project_id' })

        // Log READY deploys as activity
        if (deploy.state === 'READY') {
          const alreadyLogged = await sb
            .from('ops_activity_logs')
            .select('id')
            .eq('project_id', p.id)
            .eq('type', 'vercel_deploy')
            .eq('url', `https://${deploy.url}`)
            .maybeSingle()

          if (!alreadyLogged.data) {
            await sb.from('ops_activity_logs').insert({
              project_id: p.id,
              type: 'vercel_deploy',
              title: `Deploy: ${deploy.meta?.githubCommitMessage ?? deploy.name ?? 'production'}`,
              body: deploy.meta?.githubCommitRef ? `Branch: ${deploy.meta.githubCommitRef}` : null,
              url: `https://${deploy.url}`,
              happened_at: deploy.createdAt ? new Date(deploy.createdAt).toISOString() : new Date().toISOString(),
            })
          }
        }

        synced++
        results.push({ slug: p.slug, state: deploy.state })
      } catch { /* skip individual failures */ }
    })
  )

  return NextResponse.json({ synced, results })
}

export async function GET() {
  return POST()
}
