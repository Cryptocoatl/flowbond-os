import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const { id } = await params
  const body = await request.json()
  const { name, description, zone_type, sun_exposure, soil_notes } = body

  const update: Record<string, unknown> = {}
  if (name !== undefined) update.name = name?.trim() || null
  if (description !== undefined) update.description = description?.trim() || null
  if (zone_type !== undefined) update.zone_type = zone_type || null
  if (sun_exposure !== undefined) update.sun_exposure = sun_exposure || null
  if (soil_notes !== undefined) update.soil_notes = soil_notes?.trim() || null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_zones')
    .update(update)
    .eq('id', id)
    .eq('garden_id', ctx.garden.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('flowgarden_zones')
    .delete()
    .eq('id', id)
    .eq('garden_id', ctx.garden.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
