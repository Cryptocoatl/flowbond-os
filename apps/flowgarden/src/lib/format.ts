// Shared formatting helpers. `timeAgo` used to exist three times — twice copied
// verbatim and once as an inline `${hours}h ago` that printed "0h ago" for fresh
// readings and "72h ago" for three-day-old ones.

export function timeAgo(date: string | number | Date): string {
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then

  if (diff < 0) return 'just now'

  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diff / 86_400_000)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 31) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/** "Mar 4" — the app's standard short date. */
export function shortDate(date: string | number | Date): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** "Monday, March 4, 2026" — used in the dashboard header. */
export function longDate(date: string | number | Date = Date.now()): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

/** Pluralise without the `${n !== 1 ? 's' : ''}` noise repeated everywhere. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}
