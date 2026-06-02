import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('project_id')
  const sb = createServiceClient()

  let query = sb
    .from('ops_activity_logs')
    .select('*, ops_projects(id,name,slug,icon), ops_people(id,name)')
    .order('happened_at', { ascending: false })
    .limit(50)

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sb = createServiceClient()

  const { data: log, error } = await sb
    .from('ops_activity_logs')
    .insert({
      project_id: body.project_id ?? null,
      person_id: body.person_id ?? null,
      type: body.type ?? 'note',
      title: body.title,
      body: body.body ?? null,
      url: body.url ?? null,
      metadata: body.metadata ?? {},
      happened_at: body.happened_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const sb = createServiceClient()
  const { error } = await sb.from('ops_activity_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
