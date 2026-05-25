'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'agent'
  text: string
  photoUrl?: string
  created?: { events: number; tasks: number; plants: number; updated: number }
}

export function AgentChat({ gardenId }: { gardenId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPendingPhoto({ file, preview })
    setUploadStatus('idle')
    e.target.value = ''
  }

  function removePendingPhoto() {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.preview)
    setPendingPhoto(null)
    setUploadStatus('idle')
  }

  function handleSend() {
    if (!input.trim() && !pendingPhoto) return

    const userText = input.trim()
    const photoPreview = pendingPhoto?.preview
    const photoFile = pendingPhoto?.file

    setInput('')
    setPendingPhoto(null)

    // Snapshot history before adding the new user message
    const historySnapshot = messages.map(m => ({ role: m.role, text: m.text }))

    startTransition(async () => {
      setMessages(m => [...m, { role: 'user', text: userText, photoUrl: photoPreview }])

      let photoPath: string | undefined

      if (photoFile) {
        setUploadStatus('uploading')
        try {
          const fd = new FormData()
          fd.append('file', photoFile)
          const upRes = await fetch('/api/flowgarden/upload', { method: 'POST', body: fd })
          if (upRes.ok) {
            const { path } = await upRes.json()
            photoPath = path
            setUploadStatus('done')
          } else {
            const err = await upRes.json().catch(() => ({}))
            console.error('[upload] failed:', err)
            setUploadStatus('error')
          }
        } catch (err) {
          console.error('[upload] network error:', err)
          setUploadStatus('error')
        }
      }

      try {
        const agentRes = await fetch('/api/flowgarden/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            photoPath,
            gardenId,
            history: historySnapshot,
          }),
        })

        if (agentRes.ok) {
          const { reply, created } = await agentRes.json()
          const summary = {
            events: created.events.length,
            tasks: created.tasks.length,
            plants: created.plants.length,
            updated: created.updated?.length ?? 0,
          }
          setMessages(m => [...m, { role: 'agent', text: reply, created: summary }])
          if (summary.tasks > 0 || summary.plants > 0 || summary.updated > 0) router.refresh()
        } else {
          const err = await agentRes.json().catch(() => ({}))
          console.error('[agent] failed:', err)
          setMessages(m => [...m, {
            role: 'agent',
            text: 'Something went wrong talking to your garden intelligence. Try again.',
          }])
        }
      } catch (err) {
        console.error('[agent] network error:', err)
        setMessages(m => [...m, {
          role: 'agent',
          text: 'Could not reach the garden intelligence. Check your connection.',
        }])
      } finally {
        setUploadStatus('idle')
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="card border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-900">Garden Intelligence</p>
          <p className="text-xs text-emerald-600">Tell me what you observe, planted, or need done</p>
        </div>
      </div>

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-52 md:max-h-80 overflow-y-auto pr-1 overscroll-contain">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'agent' && (
                <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {msg.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.photoUrl} alt="Garden photo" className="rounded-lg max-h-32 object-cover" />
                )}
                {msg.text && (
                  <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-sm'
                      : 'bg-white border border-stone-100 text-stone-800 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
                {msg.created && (msg.created.tasks > 0 || msg.created.plants > 0 || msg.created.updated > 0 || msg.created.events > 0) && (
                  <div className="flex gap-1.5 flex-wrap">
                    {msg.created.plants > 0 && (
                      <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 rounded-full px-2 py-0.5">
                        +{msg.created.plants} plant{msg.created.plants > 1 ? 's' : ''} added
                      </span>
                    )}
                    {msg.created.updated > 0 && (
                      <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">
                        {msg.created.updated} plant{msg.created.updated > 1 ? 's' : ''} updated
                      </span>
                    )}
                    {msg.created.tasks > 0 && (
                      <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">
                        +{msg.created.tasks} mission{msg.created.tasks > 1 ? 's' : ''}
                      </span>
                    )}
                    {msg.created.events > 0 && (
                      <span className="text-[10px] bg-stone-50 border border-stone-200 text-stone-500 rounded-full px-2 py-0.5">
                        logged
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white animate-spin">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-sm px-3 py-2">
                <span className="text-xs text-stone-400">
                  {uploadStatus === 'uploading' ? 'Uploading photo…' : 'Thinking…'}
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      )}

      {/* Pending photo preview */}
      {pendingPhoto && (
        <div className="relative inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingPhoto.preview} alt="Pending" className="h-16 rounded-lg object-cover" />
          <button
            onClick={removePendingPhoto}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-800 text-white rounded-full flex items-center justify-center text-xs"
          >
            ×
          </button>
          {uploadStatus === 'error' && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600/80 text-white text-[9px] text-center rounded-b-lg py-0.5">
              Upload failed
            </span>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 active:bg-stone-300 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 touch-manipulation"
          aria-label="Attach photo"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-600">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          onChange={handlePhotoSelect}
          className="sr-only"
        />

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="I planted 3 tomato seedlings in zone A…"
          rows={1}
          className="flex-1 resize-none bg-white border border-stone-200 rounded-2xl px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-400 transition-colors disabled:opacity-60"
          style={{ minHeight: '36px', maxHeight: '96px' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 96) + 'px'
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || (!input.trim() && !pendingPhoto)}
          className="w-10 h-10 rounded-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors touch-manipulation"
          aria-label="Send"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>

      {messages.length === 0 && (
        <p className="text-[11px] text-stone-400 text-center">
          Tell me what you observe, planted, or need done — or attach a photo. Everything gets logged automatically.
        </p>
      )}
    </div>
  )
}
