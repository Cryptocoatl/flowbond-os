'use client'
import { useState } from 'react'

interface AiPromptProps {
  siteId: string
}

const API_URL = process.env.NEXT_PUBLIC_FLOWEDIT_API_URL ?? 'http://localhost:4000'

export function AiPrompt({ siteId }: AiPromptProps) {
  const [prompt,  setPrompt]  = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)

  async function handlePreview() {
    if (!prompt.trim()) return
    setLoading(true); setError(null); setResult(null); setPreview(null)
    try {
      const res  = await fetch(`${API_URL}/api/v1/flowedit/ai/${siteId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message ?? 'Failed'); return }
      setPreview(json.data.changes)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    if (!prompt.trim()) return
    setLoading(true); setError(null); setResult(null); setPreview(null)
    try {
      const res  = await fetch(`${API_URL}/api/v1/flowedit/ai/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message ?? 'Failed'); return }
      setResult(`✓ Created ${json.data.changesCount} draft change${json.data.changesCount !== 1 ? 's' : ''} · status: ${json.data.status}`)
      setPrompt('')
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
        <span className="text-white text-sm font-semibold">AI Edit</span>
        <span className="text-zinc-500 text-xs">· Describe a change in natural language</span>
      </div>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePreview()}
          placeholder='e.g. "Change the hero title to Your dog deserves the best"'
          className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
        />
        <button
          onClick={handlePreview}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium disabled:opacity-40 transition-colors"
        >
          Preview
        </button>
        <button
          onClick={handleApply}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-40 transition-colors"
        >
          {loading ? 'Working…' : 'Apply'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
      {result && (
        <p className="text-green-400 text-xs mt-2">{result}</p>
      )}
      {preview && preview.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-zinc-400 text-xs">Preview — click Apply to create these drafts:</p>
          {preview.map((change, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg px-3 py-2 text-xs font-mono">
              <span className="text-purple-400">{String((change as Record<string, unknown>).path)}</span>
              <span className="text-zinc-500"> · {String((change as Record<string, unknown>).field)} → </span>
              <span className="text-green-300">{JSON.stringify((change as Record<string, unknown>).value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
