import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { message, photoPath, gardenId } = body as {
    message?: string
    photoPath?: string
    gardenId: string
  }

  if (!message?.trim() && !photoPath) {
    return NextResponse.json({ error: 'Message or photo required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [gardenRes, zonesRes, plantsRes, tasksRes] = await Promise.all([
    admin.from('flowgarden_gardens').select('id,name,location_label').eq('id', gardenId).single(),
    admin.from('flowgarden_zones').select('id,name').eq('garden_id', gardenId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_plant_groups').select('id,name,species,status,health_status').eq('garden_id', gardenId).limit(15),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tasks').select('id,title,urgency').eq('garden_id', gardenId).neq('status','completed').limit(5),
  ])

  const garden = gardenRes.data
  const zones = (zonesRes.data ?? []) as { id: string; name: string }[]
  const plants = (plantsRes.data ?? []) as { id: string; name: string; species?: string; status: string }[]
  const pending = (tasksRes.data ?? []) as { id: string; title: string }[]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const systemPrompt = `You are the AI Garden Intelligence for "${garden?.name ?? 'the garden'}". You help gardeners track, understand, and improve their garden through natural conversation.

Current garden state:
- Garden: ${garden?.name}${garden?.location_label ? ` (${garden.location_label})` : ''}
- Zones: ${zones.length ? zones.map(z => z.name).join(', ') : 'None set up yet'}
- Plants: ${plants.length ? plants.map(p => `${p.name}${p.species ? ` (${p.species})` : ''} — ${p.status}`).join(', ') : 'None added yet'}
- Pending tasks: ${pending.length ? pending.map(t => t.title).join(', ') : 'None'}
- Today: ${today}

Rules:
1. ALWAYS call log_event first — every message must be recorded.
2. If the user mentions planting something new → also call add_plant.
3. If the user mentions something that needs doing → also call create_task.
4. After using tools, give a warm, knowledgeable response (2–3 sentences). Be specific and practical.
5. If a photo is shared, analyse it and describe what you observe.`

  // Build message content (text + optional image)
  const content: Anthropic.MessageParam['content'] = []

  if (photoPath) {
    const { data: signed } = await admin.storage
      .from('flowgarden-photos')
      .createSignedUrl(photoPath, 3600)

    if (signed?.signedUrl) {
      try {
        const res = await fetch(signed.signedUrl)
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        const mime = (res.headers.get('content-type') ?? 'image/jpeg') as
          'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
      } catch {
        // Photo unavailable — continue without it
      }
    }
  }

  content.push({ type: 'text', text: message?.trim() || '(photo attached — please analyse)' })

  const tools: Anthropic.Tool[] = [
    {
      name: 'log_event',
      description: 'Record a garden observation, activity, or photo analysis in the garden log.',
      input_schema: {
        type: 'object' as const,
        properties: {
          event_type: {
            type: 'string',
            enum: ['text_observation','planting','watering','pest_observed','disease_observed',
                   'pruning','fertilizing','compost_added','harvest','photo_uploaded'],
          },
          title: { type: 'string', description: 'Short title for this event (max 80 chars)' },
          structured_summary: { type: 'string', description: 'Clean 1–3 sentence summary of what happened or was observed' },
          intent: {
            type: 'string',
            enum: ['LOG_OBSERVATION','LOG_WATERING','LOG_PLANTING','LOG_PEST_ALERT',
                   'LOG_DISEASE_ALERT','LOG_PHOTO_ANALYSIS','CREATE_TASK','UNKNOWN_GARDEN_INPUT'],
          },
          urgency: { type: 'string', enum: ['none','low','medium','high','urgent'] },
        },
        required: ['event_type','title','structured_summary','intent','urgency'],
      },
    },
    {
      name: 'create_task',
      description: 'Create an actionable garden task or mission.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Clear, actionable task title (max 100 chars)' },
          description: { type: 'string', description: 'Details: what to do, why, and how' },
          urgency: { type: 'string', enum: ['none','low','medium','high','urgent'] },
          due_at: { type: 'string', description: 'ISO 8601 date-time if a deadline applies' },
        },
        required: ['title','urgency'],
      },
    },
    {
      name: 'add_plant',
      description: 'Register a new plant or plant group being added to the garden.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Common name for this plant or group' },
          species: { type: 'string' },
          variety: { type: 'string' },
          quantity: { type: 'number', default: 1 },
          status: { type: 'string', enum: ['seed','sprout','seedling','growing','flowering','fruiting','harvested'] },
          health_status: { type: 'string', enum: ['excellent','good','stressed','critical','unknown'] },
          notes: { type: 'string' },
        },
        required: ['name','quantity','status'],
      },
    },
  ]

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const aiResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: [{ role: 'user', content }],
  })

  const mediaUrls = photoPath ? [photoPath] : []
  const created = { events: [] as string[], tasks: [] as string[], plants: [] as string[] }

  for (const block of aiResponse.content) {
    if (block.type !== 'tool_use') continue

    if (block.name === 'log_event') {
      const inp = block.input as Record<string, string>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin as any).from('flowgarden_events').insert({
        user_id: user.id,
        garden_id: gardenId,
        event_type: inp.event_type,
        title: inp.title,
        raw_input: message?.trim() ?? '',
        structured_summary: inp.structured_summary,
        intent: inp.intent,
        urgency: inp.urgency,
        media_urls: mediaUrls,
        occurred_at: new Date().toISOString(),
      }).select('id').single()
      if (data?.id) created.events.push(data.id)
    }

    else if (block.name === 'create_task') {
      const inp = block.input as Record<string, string>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin as any).from('flowgarden_tasks').insert({
        user_id: user.id,
        garden_id: gardenId,
        title: inp.title,
        description: inp.description ?? null,
        urgency: inp.urgency,
        status: 'pending',
        is_mission: true,
        due_at: inp.due_at ?? null,
      }).select('id').single()
      if (data?.id) created.tasks.push(data.id)
    }

    else if (block.name === 'add_plant') {
      const inp = block.input as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin as any).from('flowgarden_plant_groups').insert({
        user_id: user.id,
        garden_id: gardenId,
        name: inp.name as string,
        species: (inp.species as string) ?? null,
        variety: (inp.variety as string) ?? null,
        quantity: (inp.quantity as number) ?? 1,
        status: inp.status as string,
        health_status: (inp.health_status as string) ?? 'unknown',
        notes: (inp.notes as string) ?? null,
        photo_urls: mediaUrls,
      }).select('id').single()
      if (data?.id) created.plants.push(data.id)
    }
  }

  const reply = aiResponse.content.find(b => b.type === 'text')?.text
    ?? "Got it — recorded in your garden log."

  return NextResponse.json({ reply, created })
}
