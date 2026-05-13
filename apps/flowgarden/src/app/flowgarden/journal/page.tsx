import { store } from '@/lib/mock-data'
import type { JournalEntry } from '@flowbond/core'

export const dynamic = 'force-dynamic'

function EntryCard({ entry }: { entry: JournalEntry }) {
  const zone = store.zones.find(z => z.id === entry.zoneId)
  const dateStr = entry.entryDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const daysAgo = Math.round((Date.now() - entry.entryDate.getTime()) / 86400000)

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          {entry.title && (
            <h3 className="font-semibold text-stone-900">{entry.title}</h3>
          )}
          <p className="text-xs text-stone-400 mt-0.5">
            {dateStr}
            <span className="ml-2 text-stone-300">
              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
            </span>
          </p>
        </div>
        {zone && (
          <span className="badge bg-emerald-50 text-emerald-700">{zone.name}</span>
        )}
      </div>

      <p className="text-sm text-stone-700 leading-relaxed mt-3">{entry.content}</p>

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-stone-50">
        {entry.watered && (
          <span className="badge bg-blue-50 text-blue-700">💧 Watered</span>
        )}
        {entry.compostAdded && (
          <span className="badge bg-amber-50 text-amber-700">🍂 Compost</span>
        )}
        {entry.pestsObserved && (
          <span className="badge bg-red-50 text-red-600">⚠ Pests</span>
        )}
        {entry.weatherCondition && (
          <span className="badge bg-sky-50 text-sky-700">☁ {entry.weatherCondition}</span>
        )}
        {entry.temperatureC && (
          <span className="badge bg-orange-50 text-orange-700">🌡 {entry.temperatureC}°C</span>
        )}
        {entry.tags.map(tag => (
          <span key={tag} className="badge bg-stone-50 text-stone-500">#{tag}</span>
        ))}
      </div>

      {entry.pestNotes && (
        <div className="mt-3 p-2.5 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs text-red-700">{entry.pestNotes}</p>
        </div>
      )}
    </div>
  )
}

export default function JournalPage() {
  const { journal } = store

  const sorted = [...journal].sort(
    (a, b) => b.entryDate.getTime() - a.entryDate.getTime(),
  )

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Garden Journal</h1>
          <p className="text-sm text-stone-400 mt-1">{journal.length} entries</p>
        </div>
        <button className="btn-primary">+ New Entry</button>
      </div>

      {/* AI summary placeholder */}
      <div className="card border-emerald-100 bg-emerald-50/30 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">AI Weekly Summary</p>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          Active garden week. Aphid management on basil, strong tomato flower set, and compost pile 1 running hot at 58°C.
          Lemon tree fruiting well with minor yellowing to monitor. 5 journal entries recorded this week.
        </p>
        <p className="text-xs text-stone-400 mt-2">Generated from journal · Connect AI to update automatically</p>
      </div>

      <div className="space-y-4">
        {sorted.map(entry => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      <div className="mt-6 card border-dashed border-stone-200 bg-stone-50/50 text-center py-8">
        <p className="text-stone-400 text-sm">Document your garden&apos;s story</p>
        <button className="btn-primary mt-3">+ Write Entry</button>
      </div>
    </div>
  )
}
