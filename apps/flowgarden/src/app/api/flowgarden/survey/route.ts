import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPhotoBlocks, loadPhotoBytes } from '@/lib/photos'
import { SURVEY_SCHEMA, type SurveyResult } from '@/lib/survey'
import { getGardenClimate, climateBrief } from '@/lib/climate'
import { identifyPlant } from '@/lib/plantnet'

export const dynamic = 'force-dynamic'
// Measured: 4 photos takes ~105 s at effort medium, ~128 s at high. Cloudflare's
// edge drops a connection that sends no bytes for ~100 s (524), so a survey of
// any real size CANNOT be a plain request/response — it has to stream. The route
// emits newline-delimited JSON: heartbeats while the model works, then one final
// `done` line. Heartbeats exist to keep the connection alive, not for decoration.
export const maxDuration = 300

const MAX_PHOTOS = 8

const SYSTEM = `You are FlowGarden's garden surveyor. A gardener has walked their garden and photographed it. Read the photos as ONE PLACE seen from several angles — not as unrelated images.

Your job is to produce the garden's structure: its zones (beds, pots, patches), the plants growing in them, and the work those plants need.

How to read the set:
- The same bed will appear in several photos from different angles. Recognise it and describe it ONCE, listing every photo it appears in. Do not invent a new zone per photo.
- Infer arrangement from what is visible: what is next to what, what is behind what, fence lines, paths, buildings, shadows. Place zones on a 0-100 grid (x from left to right, y from near to far) as a FIRST GUESS the gardener will correct. It is a sketch, not a measurement.
- Judge sun exposure from shadow direction and length, and from what is growing well.

Identifying plants:
- Give the everyday name a gardener would use as \`name\`. Give \`species\` (botanical) ONLY when the photo genuinely supports it — leaf shape, growth habit, fruit, flower all legible. A confident wrong species is worse than an honest "unknown".
- \`confidence\` is your own honest read: 0.9+ only when you could stake a claim on it, below 0.6 when you are pattern-matching from silhouette or context. The gardener is shown anything under 0.6 for confirmation, so use the low end freely.
- \`quantity\` counts what you can actually see. Do not extrapolate.
- Read health from the leaves: chlorosis, wilt, spotting, pest damage, leggy growth, sunscald. Say what you see in \`notes\`, in plain language.

Missions — this is the part that matters most:
- Propose work that is grounded in something visible in the photos or in what the plant needs at this stage. Every mission must carry a \`reason\` that names the evidence: "the lower leaves on the tomatoes are yellowing and the soil looks compacted" beats "tomatoes need feeding".
- Prefer a few high-value missions over a long list. Ten vague chores is worse than three that change the garden.
- Order by what will fail first without attention. Urgency is about consequence and timing, not enthusiasm.
- \`due_in_days\` reflects the plant's clock, not a default. Watering a wilting seedling is today; a dormant-season prune is months out.
- xp_reward: 5 for routine, 10 for real effort, 15+ for something that takes an afternoon.

Weather:
- If a climate outlook is given, schedule against it. Do not propose watering that incoming rain will do for you; say so in the reason instead. Do not propose sowing when the soil at 6 cm is too cold for that seed. Flag frost risk for tender plants and heat stress ahead of the hot days.
- The water balance (ET0 minus rainfall) is the honest measure of whether the garden is drying out. Use it rather than guessing from air temperature.

Close-ups:
- For each plant, set closeup_photo_index to a photo where THAT plant fills most of the frame, and \`organ\` to what is clearly visible in it (leaf / flower / fruit / bark). Set both to null if no such photo exists — a wide bed shot is not a close-up.
- These are sent to a botanical identification service for the plants you are unsure about, so an honest null is more useful than a hopeful index.

Be honest about what you cannot see. If a bed is half out of frame or a plant is too far away to identify, say so in needs_better_photo rather than guessing.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FlowMe is not configured yet — the garden intelligence key is missing.' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null) as { gardenId?: string; paths?: string[]; note?: string } | null
  const gardenId = body?.gardenId
  const paths = (body?.paths ?? []).filter(p => typeof p === 'string')
  if (!gardenId) return NextResponse.json({ error: 'gardenId required' }, { status: 400 })
  if (paths.length === 0) return NextResponse.json({ error: 'Add at least one photo' }, { status: 400 })
  if (paths.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Up to ${MAX_PHOTOS} photos per survey. Run a second survey for the rest of the garden.` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Confirm the caller actually belongs to this garden before spending a
  // vision call on it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('garden_id')
    .eq('garden_id', gardenId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not your garden' }, { status: 403 })

  // What's already recorded, so the survey extends the garden instead of
  // proposing duplicates of everything already there.
  const [gardenRes, zonesRes, plantsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_gardens').select('name, location_label, climate_zone, latitude, longitude').eq('id', gardenId).single(),
    admin.from('flowgarden_zones').select('name, zone_type').eq('garden_id', gardenId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_plant_groups').select('name, species, status, health_status').eq('garden_id', gardenId).limit(60),
  ])

  const { blocks, loaded } = await loadPhotoBlocks(paths)
  if (blocks.length === 0) {
    return NextResponse.json({ error: 'None of those photos could be read. Try uploading again.' }, { status: 400 })
  }

  const garden = gardenRes.data
  const existingZones = (zonesRes.data ?? []).map(z => z.name).join(', ') || 'none yet'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPlants = ((plantsRes.data ?? []) as any[])
    .map(p => `${p.name}${p.species ? ` (${p.species})` : ''} — ${p.status}, ${p.health_status}`)
    .join('; ') || 'none yet'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // Real weather for this garden's coordinates, when the owner has set a
  // location. Missions are only as good as their timing, and timing is weather.
  const climate = garden?.latitude != null && garden?.longitude != null
    ? await getGardenClimate(Number(garden.latitude), Number(garden.longitude))
    : null

  const context = [
    `Garden: ${garden?.name ?? 'Unnamed'}`,
    garden?.location_label ? `Location: ${garden.location_label}` : null,
    garden?.climate_zone ? `Climate zone: ${garden.climate_zone}` : null,
    `Today: ${today} (use this for seasonality and mission timing)`,
    `Zones already recorded: ${existingZones}`,
    `Plants already recorded: ${existingPlants}`,
    body?.note ? `The gardener adds: ${body.note}` : null,
    climate ? `\n--- Weather outlook for this garden ---\n${climateBrief(climate)}` : null,
    '',
    `${blocks.length} photo${blocks.length === 1 ? '' : 's'} follow, in order. Refer to them by their 0-based index in photo_indexes.`,
  ].filter(Boolean).join('\n')

  const anthropic = new Anthropic({ apiKey })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) } catch { /* client gone */ }
      }

      // Keep bytes flowing while the model reads the photos.
      let alive = true
      const started = Date.now()
      const beat = setInterval(() => {
        if (alive) send({ type: 'progress', seconds: Math.round((Date.now() - started) / 1000) })
      }, 5000)

      try {
        send({ type: 'progress', seconds: 0, note: `Reading ${blocks.length} photos as one place…` })

        const res = await anthropic.beta.messages.create({
          model: 'claude-opus-5',
          max_tokens: 16000,
          // medium measured as fast as it is good here; high adds ~25 s for
          // output that was not better on the test set.
          output_config: { effort: 'medium', format: { type: 'json_schema', schema: SURVEY_SCHEMA } },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM,
          messages: [{ role: 'user', content: [{ type: 'text', text: context }, ...blocks] }],
        })

        if (res.stop_reason === 'refusal') {
          send({ type: 'error', error: 'Those photos could not be analysed. Try different ones.' })
          return
        }
        const text = res.content.find(b => b.type === 'text')
        if (!text || text.type !== 'text') {
          send({ type: 'error', error: 'No survey came back. Try again.' })
          return
        }

        const survey = JSON.parse(text.text) as SurveyResult

        // ── Second opinion on the uncertain ones ────────────────────────
        // Pl@ntNet is the species specialist, but its free tier is 500 lookups
        // a DAY for the whole app — so it runs only where Claude said it was
        // unsure AND there is a genuine close-up to send.
        const uncertain = survey.plants
          .filter(p => p.confidence < 0.75 && p.closeup_photo_index !== null)
          .slice(0, 4)

        if (uncertain.length > 0 && process.env.PLANTNET_API_KEY) {
          send({ type: 'progress', seconds: Math.round((Date.now() - started) / 1000), note: `Checking ${uncertain.length} uncertain plants against Pl@ntNet…` })
          await Promise.all(uncertain.map(async plant => {
            const idx = plant.closeup_photo_index
            if (idx === null || idx < 0 || idx >= loaded.length) return
            const bytes = await loadPhotoBytes(loaded[idx])
            if (!bytes) return
            const organ = plant.organ && plant.organ !== 'auto' ? plant.organ : 'auto'
            const result = await identifyPlant([bytes], [organ])
            if (!result || result.candidates.length === 0) return
            // Attached, not applied: the gardener picks. An automatic overwrite
            // would just be a second confident guess replacing the first.
            plant.candidates = result.candidates.map(c => ({
              score: c.score,
              scientificName: c.scientificName,
              commonNames: c.commonNames,
              family: c.family,
            }))
            if (result.remaining !== null && result.remaining < 50) {
              console.warn('[plantnet] daily quota low:', result.remaining)
            }
          }))
        }

        send({
          type: 'done',
          survey,
          photos: loaded,
          climate: climate ? {
            rainTotalMm: climate.rainTotalMm,
            et0TotalMm: climate.et0TotalMm,
            waterDeficitMm: climate.waterDeficitMm,
            coldestNightC: climate.coldestNightC,
            hottestDayC: climate.hottestDayC,
            soilTemp6cm: climate.soilTemp6cm,
            days: climate.days,
          } : null,
          usage: res.usage,
        })
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) {
          console.error('[survey] ANTHROPIC_API_KEY rejected (401) — invalid or revoked')
          send({ type: 'error', error: 'FlowMe could not sign in to its own brain.' })
        } else if (err instanceof Anthropic.RateLimitError) {
          send({ type: 'error', error: 'FlowMe is busy — try again in a moment.' })
        } else {
          console.error('[survey] failed:', err)
          send({ type: 'error', error: 'The survey failed. Try again with fewer photos.' })
        }
      } finally {
        alive = false
        clearInterval(beat)
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      // Belt and braces against any proxy that would buffer the stream and
      // reintroduce exactly the idle timeout this exists to avoid.
      'X-Accel-Buffering': 'no',
    },
  })
}
