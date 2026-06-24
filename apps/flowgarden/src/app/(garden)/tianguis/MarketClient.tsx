'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, categoryMeta, formatMoney, type TianguisProduct } from '@/lib/tianguis'

type Product = TianguisProduct & { garden_name: string }

export function MarketClient({ products, myUserId }: { products: Product[]; myUserId: string }) {
  const [cat, setCat] = useState<string>('all')

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) m.set(p.category, (m.get(p.category) ?? 0) + 1)
    return m
  }, [products])

  const visible = useMemo(
    () => (cat === 'all' ? products : products.filter(p => p.category === cat)),
    [products, cat],
  )

  return (
    <div className="p-5 md:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-fg">Tianguis</h1>
          <p className="text-sm text-fg-muted mt-1">
            Fresh from local gardens · {products.length} listing{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/tianguis/mine" className="btn-secondary">My stall</Link>
          <Link href="/tianguis/mine?new=1" className="btn-primary">
            <span className="text-base leading-none">＋</span> Sell something
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card-accent text-center py-16">
          <p className="text-4xl mb-3">🧺</p>
          <p className="text-fg font-semibold">The market is empty</p>
          <p className="text-fg-muted text-sm mt-1 mb-5 max-w-xs mx-auto">
            Be the first to bring something to the tianguis — list your harvest, honey, or seedlings.
          </p>
          <Link href="/tianguis/mine?new=1" className="btn-primary">List a product</Link>
        </div>
      ) : (
        <>
          {/* Category chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[['all', `All ${products.length}`] as [string, string]]
              .concat(CATEGORIES.filter(c => counts.get(c.key)).map(c => [c.key, `${c.emoji} ${c.label} ${counts.get(c.key)}`]))
              .map(([key, label]) => {
                const on = cat === key
                return (
                  <button
                    key={key}
                    onClick={() => setCat(key)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: on ? 'var(--fg-green)' : 'var(--fg-panel)',
                      color: on ? '#fff' : 'var(--fg-text-secondary)',
                      border: `1px solid ${on ? 'var(--fg-green)' : 'var(--fg-border)'}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(p => {
              const meta = categoryMeta(p.category)
              const mine = p.user_id === myUserId
              return (
                <Link
                  key={p.id}
                  href={`/tianguis/${p.id}`}
                  className="card flex flex-col gap-2 hover:shadow-card-lg transition-shadow"
                >
                  {/* Photo / emoji banner */}
                  <div
                    className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
                    style={{
                      aspectRatio: '4 / 3',
                      background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))',
                    }}
                  >
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{meta.emoji}</span>
                    )}
                    {mine && (
                      <span className="absolute top-2 left-2 badge" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--fg-green)' }}>
                        Yours
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-fg leading-tight truncate">{p.name}</h3>
                    <span className="font-display font-bold text-fg-gold whitespace-nowrap text-sm">
                      {formatMoney(p.price_cents, p.currency)}
                    </span>
                  </div>
                  <p className="text-[11px] text-fg-muted -mt-1">per {p.unit}</p>

                  <div className="flex items-center gap-1 text-xs text-fg-muted mt-auto pt-1 min-w-0">
                    <span className="truncate">🌿 {p.garden_name}</span>
                  </div>
                  {p.pickup_label && (
                    <div className="flex items-center gap-1 text-[11px] text-fg-muted min-w-0">
                      <span>📍</span><span className="truncate">{p.pickup_label}</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {visible.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-10">Nothing in this category yet.</p>
          )}
        </>
      )}
    </div>
  )
}
