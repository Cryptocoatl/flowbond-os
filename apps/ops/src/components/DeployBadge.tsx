import type { DeployState } from '@/lib/types'

const states: Record<string, { label: string; color: string; dot: string }> = {
  READY:    { label: 'Live', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  ERROR:    { label: 'Error', color: 'text-red-400', dot: 'bg-red-400' },
  BUILDING: { label: 'Building', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  QUEUED:   { label: 'Queued', color: 'text-zinc-400', dot: 'bg-zinc-400' },
  CANCELED: { label: 'Canceled', color: 'text-zinc-500', dot: 'bg-zinc-500' },
}

export default function DeployBadge({ state, url }: { state: DeployState | null | undefined; url?: string | null }) {
  if (!state) return null
  const s = states[state] ?? { label: state, color: 'text-zinc-400', dot: 'bg-zinc-400' }
  const inner = (
    <span className={`flex items-center gap-1.5 text-[10px] font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
  if (url && state === 'READY') {
    return <a href={url} target="_blank" className="hover:underline">{inner}</a>
  }
  return inner
}
