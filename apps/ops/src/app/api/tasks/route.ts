import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sb = createServiceClient()
  const { data: task, error } = await sb
    .from('ops_tasks')
    .insert({
      project_id: body.project_id ?? null,
      title: body.title,
      status: body.status ?? 'todo',
      priority: body.priority ?? 'medium',
      notes: body.notes ?? null,
      due_date: body.due_date ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = createServiceClient()
  const { data: task, error } = await sb
    .from('ops_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = createServiceClient()
  const { error } = await sb.from('ops_tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
