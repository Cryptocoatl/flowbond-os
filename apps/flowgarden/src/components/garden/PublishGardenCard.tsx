'use client'

import { useState, useTransition } from 'react'

interface Props {
  ownsGarden: boolean
  gardenName: string
  initial: { is_public: boolean; public_slug: string; public_bio: string }
}

/** Suggests a slug from the garden's name, so nobody has to invent one. */
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export function PublishGardenCard({ ownsGarden, gardenName, initial }: Props) {
  const [isPublic, setIsPublic] = useState(initial.is_public)
  const [slug, setSlug] = useState(initial.public_slug || slugify(gardenName))
  const [bio, setBio] = useState(initial.public_bio)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.flowgarden.life'
  const url = `${origin}/g/${slug || '…'}`

  if (!ownsGarden) {
    return (
      <div className="card">
        <h2 className="font-semibold text-fg mb-1">Public page</h2>
        <p className="text-xs text-fg-muted">
          Only the garden owner can publish a page. Create your own garden to publish one.
        </p>
      </div>
    )
  }

  function save(next: { is_public?: boolean; public_slug?: string; public_bio?: string }) {
    setError(null); setSaved(false)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/garden-public', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Could not save')
        // Don't leave the toggle showing a state the server rejected.
        if (next.is_public !== undefined) setIsPublic(!next.is_public)
        return
      }
      if (json.garden) {
        setIsPublic(json.garden.is_public)
        setSlug(json.garden.public_slug ?? '')
        setBio(json.garden.public_bio ?? '')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-fg mb-1">Public page</h2>
      <p className="text-xs text-fg-muted mb-4">
        A page you can send to anyone — what&rsquo;s growing, the layout you arranged, and anything
        you have for sale. Your garden stays private until you turn this on.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="pub-slug" className="field-label">Web address</label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs shrink-0" style={{ color: 'var(--fg-text-dim)' }}>/g/</span>
            <input
              id="pub-slug"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input-field flex-1"
              placeholder="my-back-garden"
              maxLength={40}
            />
          </div>
          {isPublic && slug && (
            <a
              href={`/g/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1.5 inline-block hover:underline"
              style={{ color: 'var(--fg-gold)' }}
            >
              {url} ↗
            </a>
          )}
        </div>

        <div>
          <label htmlFor="pub-bio" className="field-label">
            Introduction <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span>
          </label>
          <textarea
            id="pub-bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            maxLength={600}
            className="input-field resize-none"
            placeholder="A small regenerative food garden in the backyard — mostly tomatoes, herbs and whatever the season allows."
          />
        </div>

        {/* Privacy is stated plainly rather than buried: publishing must never
            feel like it quietly did more than the gardener agreed to. */}
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: 'var(--fg-panel)', border: '1px solid var(--fg-border)' }}
        >
          <span className="text-base leading-none mt-0.5" aria-hidden>🔒</span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
            The page shows your garden&rsquo;s name, plants, layout and history. It never shows the
            people in your garden, your invite code, or your exact location — location follows the
            map setting above, so a private or city-level garden stays city-level here too.
          </p>
        </div>

        {error && <p className="alert-error">{error}</p>}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const next = !isPublic
              setIsPublic(next)
              save({ is_public: next, public_slug: slug, public_bio: bio })
            }}
            className={isPublic ? 'btn-secondary' : 'btn-primary'}
          >
            {pending ? 'Saving…' : isPublic ? 'Unpublish' : 'Publish my garden'}
          </button>
          {isPublic && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ public_slug: slug, public_bio: bio })}
              className="btn-secondary"
            >
              Save changes
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--fg-gold)' }} role="status" aria-live="polite">
            {saved ? '✓ Saved' : isPublic ? 'Live' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
