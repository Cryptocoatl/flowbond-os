import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!

async function ghFetch(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST() {
  const sb = createServiceClient()
  const { data: projects } = await sb
    .from('ops_projects')
    .select('id, slug, github_org, github_repo')
    .not('github_repo', 'is', null)

  if (!projects?.length) return NextResponse.json({ synced: 0 })

  let synced = 0

  await Promise.all(
    projects.map(async (p: { id: string; slug: string; github_org: string | null; github_repo: string | null }) => {
      const org = p.github_org ?? 'Cryptocoatl'
      const repoPath = `/repos/${org}/${p.github_repo}`

      try {
        const commits = await ghFetch(`${repoPath}/commits?per_page=3`)
        if (!commits || !Array.isArray(commits)) return

        for (const commit of commits.slice(0, 1)) {
          const sha = commit.sha as string
          const message = (commit.commit?.message as string ?? '').split('\n')[0]
          const authorName = commit.commit?.author?.name as string ?? org
          const date = commit.commit?.author?.date as string ?? new Date().toISOString()
          const commitUrl = commit.html_url as string

          const existing = await sb
            .from('ops_activity_logs')
            .select('id')
            .eq('project_id', p.id)
            .eq('type', 'github_commit')
            .eq('url', commitUrl)
            .maybeSingle()

          if (!existing.data) {
            await sb.from('ops_activity_logs').insert({
              project_id: p.id,
              type: 'github_commit',
              title: message.slice(0, 120),
              body: `by ${authorName}`,
              url: commitUrl,
              metadata: { sha: sha.slice(0, 7), author: authorName },
              happened_at: date,
            })
          }
        }

        synced++
      } catch { /* skip */ }
    })
  )

  return NextResponse.json({ synced })
}

export async function GET() {
  return POST()
}
