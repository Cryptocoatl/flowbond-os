import Link from 'next/link'

/**
 * Dashboard entry point to the photo survey. Leads for an empty garden — the
 * fastest way from "I just signed up" to "my garden is in here" is a walk with
 * a phone, not filling in forms one plant at a time.
 */
export function SurveyCard({ empty }: { empty: boolean }) {
  return (
    <Link
      href="/survey"
      data-tour="survey-cta"
      className={`${empty ? 'card-accent' : 'card'} w-full flex items-center gap-4 transition-transform hover:-translate-y-0.5`}
    >
      <span
        className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
        aria-hidden
      >
        📷
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-text)' }}>
          {empty ? 'Start by photographing your garden' : 'Survey your garden again'}
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--fg-text-muted)' }}>
          {empty
            ? 'Walk around, take a few photos, and FlowMe maps your beds, names your plants and works out what they need.'
            : 'New season, new photos — FlowMe spots what changed and what needs doing.'}
        </p>
      </div>
      <span className="btn-gold text-xs px-3 py-1.5 shrink-0 hidden sm:inline-flex">
        {empty ? 'Start' : 'Re-survey'}
      </span>
    </Link>
  )
}
