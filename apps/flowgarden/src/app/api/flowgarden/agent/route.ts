import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface HistoryMessage {
  role: 'user' | 'agent'
  text: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { message, photoPath, gardenId, history = [] } = body as {
    message?: string
    photoPath?: string
    gardenId: string
    history?: HistoryMessage[]
  }

  if (!message?.trim() && !photoPath) {
    return NextResponse.json({ error: 'Message or photo required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [gardenRes, zonesRes, plantsRes, tasksRes] = await Promise.all([
    admin.from('flowgarden_gardens').select('id,name,location_label').eq('id', gardenId).single(),
    admin.from('flowgarden_zones').select('id,name').eq('garden_id', gardenId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_plant_groups')
      .select('id,name,species,variety,quantity,status,health_status,notes')
      .eq('garden_id', gardenId)
      .order('created_at', { ascending: false })
      .limit(30),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tasks')
      .select('id,title,urgency,status')
      .eq('garden_id', gardenId)
      .neq('status', 'completed')
      .limit(10),
  ])

  const garden = gardenRes.data
  const zones = (zonesRes.data ?? []) as { id: string; name: string }[]
  const plants = (plantsRes.data ?? []) as {
    id: string; name: string; species?: string; variety?: string
    quantity: number; status: string; health_status: string; notes?: string
  }[]
  const pendingTasks = (tasksRes.data ?? []) as { id: string; title: string; urgency: string }[]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const plantList = plants.length
    ? plants.map(p =>
        `• ${p.name}${p.variety ? ` (${p.variety})` : ''}${p.species ? ` — ${p.species}` : ''} | qty: ${p.quantity} | ${p.status} | health: ${p.health_status}${p.notes ? ` | ${p.notes}` : ''}`
      ).join('\n')
    : 'None registered yet'

  const systemPrompt = `You are the AI Garden Intelligence for "${garden?.name ?? 'the garden'}". You are a proactive gardening advisor. Your job is not just to log what the gardener tells you — it is to THINK like an experienced gardener and generate missions based on what you observe. You have memory of this conversation session.

Today: ${today}
Garden: ${garden?.name}${garden?.location_label ? ` — ${garden.location_label}` : ''}
Zones: ${zones.length ? zones.map(z => `${z.name} (id: ${z.id})`).join(', ') : 'None set up yet'}

Registered plants:
${plantList}

Active missions already created (do not duplicate these): ${pendingTasks.length ? pendingTasks.map(t => `"${t.title}" (${t.urgency})`).join(', ') : 'None'}

YOUR CORE BEHAVIOR — READ CAREFULLY:

1. LOG EVERYTHING: Call log_event for every message or photo. Non-negotiable.

2. PROPOSE MISSIONS PROACTIVELY — this is the most important part:
   - When a photo is shared, analyze it carefully and generate 2–4 specific create_task calls based on what you actually see. Look for: pest damage, yellowing, overcrowding, dry soil, weeds, plants needing support, ripeness, pruning needs.
   - When the gardener mentions plant health, growth, or conditions, generate missions for what should happen next.
   - Think seasonally (today is ${today}) — what should a good gardener be doing right now given what's in the garden?
   - Do NOT wait for the user to tell you what to do. Observe → diagnose → create missions.
   - Skip missions already in the active list above.

3. TOOL RULES:
   - create_zone: call immediately when user mentions adding an area/bed/zone.
   - add_plant: call when a new plant is mentioned.
   - update_plant_status: call when a plant's condition changes.
   - You can call 5+ tools in a single response — log_event + multiple create_task calls is normal.

4. RESPONSE STYLE:
   - After your tool calls, give a warm 2–4 sentence response.
   - Tell the gardener what missions you just created and WHY (what you observed that triggered each one).
   - Be specific — name the plant, zone, or condition you noticed.
   - Sound like an experienced gardener who genuinely cares about this garden.`

  // Build current message content (text + optional image)
  const currentContent: Anthropic.MessageParam['content'] = []

  if (photoPath) {
    try {
      const { data: signed } = await admin.storage
        .from('flowgarden-photos')
        .createSignedUrl(photoPath, 3600)

      if (signed?.signedUrl) {
        const res = await fetch(signed.signedUrl)
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        const mime = (res.headers.get('content-type') ?? 'image/jpeg') as
          'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        currentContent.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
      }
    } catch (err) {
      console.error('[agent] photo fetch failed:', err)
    }
  }

  currentContent.push({ type: 'text', text: message?.trim() || '(photo attached — please analyse)' })

  // Build full conversation history for Claude
  const messages: Anthropic.MessageParam[] = []
  for (const h of history) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    })
  }
  messages.push({ role: 'user', content: currentContent })

  const tools: Anthropic.Tool[] = [
    {
      name: 'log_event',
      description: 'Record any garden observation, activity, or photo analysis in the permanent log.',
      input_schema: {
        type: 'object' as const,
        properties: {
          event_type: {
            type: 'string',
            enum: [
              'text_observation', 'planting', 'watering', 'pest_observed', 'disease_observed',
              'pruning', 'fertilizing', 'compost_added', 'harvest', 'photo_uploaded',
              'germination', 'transplant', 'mulch_added', 'question_asked',
            ],
          },
          title: { type: 'string', description: 'Short descriptive title (max 80 chars)' },
          structured_summary: { type: 'string', description: '1–3 sentence summary of what happened or was observed' },
          intent: {
            type: 'string',
            enum: [
              'LOG_OBSERVATION', 'LOG_WATERING', 'LOG_PLANTING', 'LOG_PEST_ALERT',
              'LOG_DISEASE_ALERT', 'LOG_PHOTO_ANALYSIS', 'CREATE_TASK',
              'LOG_TRANSPLANT', 'LOG_GERMINATION', 'UNKNOWN_GARDEN_INPUT',
            ],
          },
          urgency: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        },
        required: ['event_type', 'title', 'structured_summary', 'intent', 'urgency'],
      },
    },
    {
      name: 'add_plant',
      description: 'Register a new plant or plant group. This adds it to the garden map and plant list.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Common name (e.g. Tomato, Basil)' },
          species: { type: 'string', description: 'Latin species name if known' },
          variety: { type: 'string', description: 'Cultivar/variety name (e.g. Cherry, Genovese)' },
          quantity: { type: 'number', description: 'How many plants/seeds', default: 1 },
          status: {
            type: 'string',
            enum: ['seed', 'germinating', 'seedling', 'transplanted', 'established', 'flowering', 'fruiting', 'harvested', 'dormant'],
          },
          health_status: { type: 'string', enum: ['excellent', 'good', 'stressed', 'critical', 'unknown'] },
          notes: { type: 'string', description: 'Any extra details: location, observations, care notes' },
        },
        required: ['name', 'quantity', 'status'],
      },
    },
    {
      name: 'update_plant_status',
      description: 'Update the status or health of an existing plant. Use when the user reports a change.',
      input_schema: {
        type: 'object' as const,
        properties: {
          plant_id: { type: 'string', description: 'UUID of the plant group to update' },
          status: {
            type: 'string',
            enum: ['seed', 'germinating', 'seedling', 'transplanted', 'established', 'flowering', 'fruiting', 'harvested', 'dormant', 'dead'],
          },
          health_status: { type: 'string', enum: ['excellent', 'good', 'stressed', 'critical', 'unknown'] },
          notes: { type: 'string' },
        },
        required: ['plant_id'],
      },
    },
    {
      name: 'create_task',
      description: 'Create an actionable garden task or mission for the gardener.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Clear, actionable task (max 100 chars)' },
          description: { type: 'string', description: 'What to do, why, and how' },
          urgency: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
          due_at: { type: 'string', description: 'ISO 8601 datetime if there is a deadline' },
        },
        required: ['title', 'urgency'],
      },
    },
    {
      name: 'create_zone',
      description: 'Create a new garden zone or area (e.g. raised bed, nursery, greenhouse, pots). Call this whenever the user mentions adding or setting up a zone.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Zone name (e.g. "Raised Bed", "Nursery", "Back Porch Pots")' },
          description: { type: 'string', description: 'Brief description of the zone' },
          zone_type: {
            type: 'string',
            enum: ['raised_bed', 'grounded_bed', 'container', 'greenhouse', 'nursery', 'lawn', 'compost', 'herb_garden', 'orchard', 'other'],
            description: 'Type of garden zone',
          },
          sun_exposure: {
            type: 'string',
            enum: ['full_sun', 'partial_shade', 'full_shade'],
            description: 'Sun exposure level',
          },
          soil_notes: { type: 'string', description: 'Soil type, quality, or mix used' },
        },
        required: ['name', 'zone_type'],
      },
    },
  ]

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const aiResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    tools,
    messages,
  })

  const mediaUrls = photoPath ? [photoPath] : []
  const created = { events: [] as string[], tasks: [] as string[], plants: [] as string[], updated: [] as string[] }

  for (const block of aiResponse.content) {
    if (block.type !== 'tool_use') continue

    if (block.name === 'log_event') {
      const inp = block.input as Record<string, string>
      const { data, error } = await (admin as any).from('flowgarden_events').insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
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
      if (error) console.error('[agent] log_event insert failed:', error.message)
      else if (data?.id) created.events.push(data.id)
    }

    else if (block.name === 'add_plant') {
      const inp = block.input as Record<string, unknown>
      const { data, error } = await (admin as any).from('flowgarden_plant_groups').insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
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
      if (error) console.error('[agent] add_plant insert failed:', error.message)
      else if (data?.id) created.plants.push(data.id)
    }

    else if (block.name === 'update_plant_status') {
      const inp = block.input as Record<string, string>
      const update: Record<string, string> = {}
      if (inp.status) update.status = inp.status
      if (inp.health_status) update.health_status = inp.health_status
      if (inp.notes) update.notes = inp.notes
      const { error } = await (admin as any).from('flowgarden_plant_groups') // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(update)
        .eq('id', inp.plant_id)
        .eq('garden_id', gardenId)
      if (error) console.error('[agent] update_plant_status failed:', error.message)
      else created.updated.push(inp.plant_id)
    }

    else if (block.name === 'create_task') {
      const inp = block.input as Record<string, string>
      const { data, error } = await (admin as any).from('flowgarden_tasks').insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
        user_id: user.id,
        garden_id: gardenId,
        title: inp.title,
        description: inp.description ?? null,
        urgency: inp.urgency,
        status: 'pending',
        is_mission: true,
        xp_reward: 5,
        due_at: inp.due_at ?? null,
      }).select('id').single()
      if (error) console.error('[agent] create_task insert failed:', error.message)
      else if (data?.id) created.tasks.push(data.id)
    }

    else if (block.name === 'create_zone') {
      const inp = block.input as Record<string, string>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin as any).from('flowgarden_zones').insert({
        garden_id: gardenId,
        user_id: user.id,
        name: inp.name,
        description: inp.description ?? null,
        zone_type: inp.zone_type ?? null,
        sun_exposure: inp.sun_exposure ?? null,
        soil_notes: inp.soil_notes ?? null,
      }).select('id').single()
      if (error) console.error('[agent] create_zone insert failed:', error.message)
      else if (data?.id) created.events.push(data.id)
    }
  }

  const reply = aiResponse.content.find(b => b.type === 'text')?.text
    ?? 'Got it — recorded in your garden log.'

  return NextResponse.json({ reply, created })
}
