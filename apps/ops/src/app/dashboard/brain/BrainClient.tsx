'use client'
import { useState, useEffect, useRef } from 'react'

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-violet-300 mt-5 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-violet-200 mt-6 mb-2 border-b border-violet-500/30 pb-1">$2</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-violet-100 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ops-text font-semibold">$1</strong>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-violet-400 font-mono text-xs mt-0.5 shrink-0">$1.</span><span>$2</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-violet-400 shrink-0 mt-1">▸</span><span class="text-sm text-ops-dim">$1</span></div>')
    .replace(/`(.+?)`/g, '<code class="text-xs bg-ops-border px-1 py-0.5 rounded font-mono text-violet-300">$1</code>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export default function BrainClient() {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function runAnalysis() {
    setLoading(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      setAnalysis(data.analysis)
    } catch {
      setAnalysis('Error running analysis. Check API key.')
    } finally {
      setLoading(false)
    }
  }

  async function askQuestion() {
    if (!chatInput.trim() || chatLoading) return
    const q = chatInput.trim()
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', content: q, ts: Date.now() }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.analysis, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error. Try again.', ts: Date.now() }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function syncAll() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const [v, g] = await Promise.all([
        fetch('/api/sync/vercel', { method: 'POST' }).then(r => r.json()),
        fetch('/api/sync/github', { method: 'POST' }).then(r => r.json()),
      ])
      setSyncResult(`Vercel: ${v.synced} projects • GitHub: ${g.synced} repos`)
    } catch {
      setSyncResult('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { runAnalysis() }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ops-text flex items-center gap-2">
            <span className="text-violet-400">◬</span> AI Brain
          </h1>
          <p className="text-sm text-ops-dim mt-1">Strategic advisor with full portfolio context</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncAll}
            disabled={syncing}
            className="btn-ghost text-xs"
          >
            {syncing ? '⟳ Syncing...' : '⟳ Sync Vercel + GitHub'}
          </button>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-primary text-xs"
          >
            {loading ? '◬ Thinking...' : '◬ Re-analyze'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ {syncResult}
        </div>
      )}

      {/* Main analysis */}
      <div className="card border-violet-500/20 bg-gradient-to-b from-violet-950/30 to-ops-surface min-h-[300px]">
        {loading && (
          <div className="flex items-center gap-3 py-8">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            <span className="text-sm text-ops-dim">Analyzing all {21} projects...</span>
          </div>
        )}
        {analysis && !loading && (
          <div
            className="text-sm text-ops-dim leading-relaxed prose-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }}
          />
        )}
      </div>

      {/* Chat */}
      <div>
        <h2 className="text-sm font-semibold text-ops-dim uppercase tracking-wider mb-3">Ask the Brain</h2>

        {messages.length > 0 && (
          <div className="space-y-3 mb-3 max-h-96 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.ts} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  m.role === 'user' ? 'bg-ops-muted text-ops-text' : 'bg-violet-500/30 text-violet-300'
                }`}>
                  {m.role === 'user' ? 'S' : '◬'}
                </div>
                <div className={`card flex-1 text-sm ${m.role === 'user' ? 'bg-ops-border' : 'border-violet-500/20'}`}>
                  {m.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }} />
                  ) : (
                    <p className="text-ops-text">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-300 text-xs shrink-0">◬</div>
                <div className="card flex-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion() } }}
            placeholder="What should I ship this week? / What's stalling? / How are Mountain Dogs and DANZ related?"
            className="input flex-1"
            disabled={chatLoading}
          />
          <button
            onClick={askQuestion}
            disabled={!chatInput.trim() || chatLoading}
            className="btn-primary shrink-0 disabled:opacity-40"
          >
            Ask
          </button>
        </div>
        <p className="text-[10px] text-ops-muted mt-1.5">
          Powered by Claude Sonnet 4.6 · Full portfolio context included in every query
        </p>
      </div>
    </div>
  )
}
