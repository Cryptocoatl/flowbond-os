import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const eventTypeIcons: Record<string, string> = {
  text_observation:   '📝',
  planting:           '🌱',
  watering:           '💧',
  pest_observed:      '⚠️',
  disease_observed:   '🔴',
  pruning:            '✂️',
  fertilizing:        '🧪',
  compost_added:      '🍂',
  mulch_added:        '🪵',
  harvest:            '🌾',
  germination:        '🌿',
  transplant:         '🪴',
  photo_uploaded:     '📷',
  voice_note_uploaded:'🎙',
  question_asked:     '💬',
  task_completed:     '✅',
  ai_recommendation:  '🤖',
  system_summary:     '📊',
}

const urgencyDot: Record<string, string> = {
  urgent: 'bg-red-400',
  high:   'bg-amber-400',
  medium: 'bg-stone-300',
  low:    'bg-stone-200',
  none:   'bg-stone-100',
}

interface GardenEvent {
  id: string
  event_type: string
  title: string
  structured_summary: string | null
  raw_input: string | null
  urgency: string
  media_urls: string[] | null
  occurred_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function EventCard({ event }: { event: GardenEvent }) {
  const icon = eventTypeIcons[event.event_type] ?? '📝'
  const dot = urgencyDot[event.urgency] ?? urgencyDot.none
  const dateStr = new Date(event.occurred_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="text-xl shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-stone-900 leading-tight">{event.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {event.urgency !== 'none' && (
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              )}
              <span className="text-[10px] text-stone-400">{timeAgo(event.occurred_at)}</span>
            </div>
          </div>
          {event.structured_summary && (
            <p className="text-xs text-stone-600 leading-relaxed">{event.structured_summary}</p>
          )}
          {event.media_urls && event.media_urls.length > 0 && (
            <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-stone-400">
              📎 {event.media_urls.length} photo{event.media_urls.length > 1 ? 's' : ''}
            </span>
          )}
          <p className="text-[10px] text-stone-300 mt-1.5">{dateStr}</p>
        </div>
      </div>
    </div>
  )
}

export default async function JournalPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (admin as any)
    .from('flowgarden_events')
    .select('id, event_type, title, structured_summary, raw_input, urgency, media_urls, occurred_at')
    .eq('garden_id', ctx.garden.id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  const allEvents: GardenEvent[] = events ?? []

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Garden Journal</h1>
        <p className="text-sm text-stone-400 mt-1">{allEvents.length} entr{allEvents.length !== 1 ? 'ies' : 'y'}</p>
      </div>

      {allEvents.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">📖</p>
          <p className="text-stone-600 font-medium">No journal entries yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Everything you tell the Garden Intelligence is automatically logged here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEvents.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  )
}
