import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SurveyPlant, SurveyMission, SurveyZone } from '@/lib/survey'

export const dynamic = 'force-dynamic'

interface Body {
  gardenId?: string
  photos?: string[]
  summary?: string
  /** Only the items the gardener ticked. Zones may carry an `existing_id` when
   *  the gardener mapped a proposed zone onto one that already exists. */
  zones?: (SurveyZone & { existing_id?: string | null })[]
  plants?: SurveyPlant[]
  missions?: SurveyMission[]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as Body | null
  const gardenId = body?.gardenId
  if (!gardenId) return NextResponse.json({ error: 'gardenId required' }, { status: 400 })

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('garden_id')
    .eq('garden_id', gardenId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not your garden' }, { status: 403 })

  const zones = body?.zones ?? []
  const plants = body?.plants ?? []
  const missions = body?.missions ?? []
  const photos = body?.photos ?? []

  // survey key → real database id, so plants and missions can be attached to
  // the zones created in this same request.
  const zoneIds = new Map<string, string>()
  const created = { zones: 0, plants: 0, missions: 0 }
  const failures: string[] = []

  for (const z of zones) {
    if (z.existing_id) { zoneIds.set(z.key, z.existing_id); continue }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).from('flowgarden_zones').insert({
      garden_id: gardenId,
      user_id: user.id,
      name: z.name,
      description: z.description ?? null,
      zone_type: z.zone_type ?? null,
      sun_exposure: z.sun_exposure ?? null,
      soil_notes: z.soil_notes ?? null,
    }).select('id').single()
    if (error) { failures.push(`zone "${z.name}": ${error.message}`); continue }
    if (data?.id) { zoneIds.set(z.key, data.id); created.zones++ }
  }

  const plantIds = new Map<string, string>()
  for (const p of plants) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).from('flowgarden_plant_groups').insert({
      garden_id: gardenId,
      user_id: user.id,
      zone_id: p.zone_key ? zoneIds.get(p.zone_key) ?? null : null,
      name: p.name,
      species: p.species ?? null,
      variety: p.variety ?? null,
      quantity: p.quantity > 0 ? p.quantity : 1,
      status: p.status,
      health_status: p.health_status,
      notes: p.notes ?? null,
    }).select('id').single()
    if (error) { failures.push(`plant "${p.name}": ${error.message}`); continue }
    if (data?.id) { plantIds.set(p.key, data.id); created.plants++ }
  }

  for (const m of missions) {
    const dueAt = typeof m.due_in_days === 'number'
      ? new Date(Date.now() + m.due_in_days * 86_400_000).toISOString()
      : null
    // The reason the model gave is kept with the mission — a gardener seeing
    // "why" is the difference between advice and a chore list.
    const description = [m.description, m.reason ? `Why: ${m.reason}` : null]
      .filter(Boolean).join('\n\n') || null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('flowgarden_tasks').insert({
      garden_id: gardenId,
      user_id: user.id,
      zone_id: m.zone_key ? zoneIds.get(m.zone_key) ?? null : null,
      title: m.title,
      description,
      urgency: m.urgency,
      status: 'pending',
      is_mission: true,
      xp_reward: m.xp_reward > 0 ? m.xp_reward : 5,
      due_at: dueAt,
    })
    if (error) { failures.push(`mission "${m.title}": ${error.message}`); continue }
    created.missions++
  }

  // One journal entry so the survey is part of the garden's story, with the
  // photos attached where the journal already expects them.
  if (created.zones || created.plants || created.missions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('flowgarden_events').insert({
      user_id: user.id,
      garden_id: gardenId,
      event_type: 'system_summary',
      title: `Garden survey — ${created.plants} plants, ${created.zones} zones, ${created.missions} missions`,
      structured_summary: body?.summary ?? null,
      urgency: 'none',
      media_urls: photos,
      occurred_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ created, failures })
}
