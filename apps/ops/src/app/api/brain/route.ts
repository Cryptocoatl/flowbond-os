import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { question } = await req.json().catch(() => ({ question: null }))
  const sb = createServiceClient()

  const [{ data: projects }, { data: tasks }, { data: deploys }, { data: recentLogs }] =
    await Promise.all([
      sb.from('ops_projects').select('*').order('sort_order'),
      sb.from('ops_tasks').select('*').neq('status', 'done').order('priority', { ascending: false }),
      sb.from('ops_deploys').select('*'),
      sb.from('ops_activity_logs').select('*, ops_projects(name,slug)').order('happened_at', { ascending: false }).limit(20),
    ])

  const deployMap: Record<string, { state: string | null; synced_at: string }> = {}
  ;(deploys ?? []).forEach((d: { project_id: string; state: string | null; synced_at: string }) => {
    deployMap[d.project_id] = { state: d.state, synced_at: d.synced_at }
  })

  const projectSummaries = (projects ?? []).map((p: Record<string, unknown>) => {
    const projectTasks = (tasks ?? []).filter((t: Record<string, unknown>) => t.project_id === p.id)
    const deploy = deployMap[p.id as string]
    return {
      name: p.name,
      slug: p.slug,
      status: p.status,
      phase: p.phase,
      category: p.category,
      openTasks: projectTasks.length,
      criticalTasks: projectTasks.filter((t: Record<string, unknown>) => t.priority === 'critical').length,
      blockedTasks: projectTasks.filter((t: Record<string, unknown>) => t.status === 'blocked').length,
      topTask: (projectTasks[0] as Record<string, unknown> | undefined)?.title ?? null,
      deployState: deploy?.state ?? 'unknown',
      lastDeploy: deploy?.synced_at ?? null,
      notes: p.notes,
    }
  })

  const recentActivity = (recentLogs ?? []).slice(0, 10).map((l: Record<string, unknown>) => ({
    project: (l.ops_projects as { name: string } | null)?.name ?? 'Unknown',
    type: l.type,
    title: l.title,
    when: l.happened_at,
  }))

  const contextBlock = `
TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
OPERATOR: Steph Ferrera (@cryptocoatl) — multi-project builder in Tulum

PORTFOLIO (${projectSummaries.length} projects):
${projectSummaries.map((p: typeof projectSummaries[0]) =>
    `• ${p.name} [${p.status}/${p.phase}] cat:${p.category} tasks:${p.openTasks}(${p.criticalTasks} critical, ${p.blockedTasks} blocked) deploy:${p.deployState}${p.topTask ? ` → next: "${p.topTask}"` : ''}`
  ).join('\n')}

RECENT ACTIVITY (last 10):
${recentActivity.map((a: typeof recentActivity[0]) => `• [${a.type}] ${a.project}: ${a.title}`).join('\n')}

OPEN TASKS SUMMARY:
Total open: ${(tasks ?? []).length}
Blocked: ${(tasks ?? []).filter((t: Record<string, unknown>) => t.status === 'blocked').length}
Critical: ${(tasks ?? []).filter((t: Record<string, unknown>) => t.priority === 'critical').length}
In progress: ${(tasks ?? []).filter((t: Record<string, unknown>) => t.status === 'in_progress').length}
`

  const systemPrompt = `You are the Strategic Brain for Steph Ferrera's portfolio — a genius-level CTO/advisor with perfect context of all projects. You think in systems, identify leverage points, and cut through noise to what matters most.

Your analysis must be:
- Brutally honest about what's stalling
- Specific (name exact projects, tasks, blockers)
- Prioritized by real impact, not just urgency
- Cross-project aware (dependencies, conflicts, shared resources)
- Action-oriented (what to do TODAY, not what to think about)

Format your response with clear sections using markdown. Be concise. No filler.`

  const userMessage = question
    ? `Context:\n${contextBlock}\n\nQuestion: ${question}`
    : `Context:\n${contextBlock}\n\nGenerate a full strategic analysis with these sections:
1. **TODAY'S FOCUS** — Top 3 actions for maximum impact right now (be specific, link to exact tasks)
2. **CRITICAL BLOCKERS** — What's actively blocking progress and exactly how to unblock it
3. **MOMENTUM CHECK** — Which projects are stalling and why (no activity, no deploys, no tasks moving)
4. **CROSS-PROJECT LEVERAGE** — Dependencies, conflicts, or shared wins across projects
5. **PATTERN INSIGHT** — One big strategic observation about the portfolio as a whole`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const analysis = (message.content[0] as { type: string; text: string }).text

  return NextResponse.json({ analysis, contextBlock, model: message.model })
}
