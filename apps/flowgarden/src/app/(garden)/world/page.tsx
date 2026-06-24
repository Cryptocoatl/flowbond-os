import { WorldMap } from '@/components/garden/WorldMap'

export const dynamic = 'force-dynamic'

export default function WorldPage() {
  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-3.5rem)] md:min-h-screen">
      <div className="px-5 md:px-8 pt-5 md:pt-8 pb-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-fg">Garden World</h1>
        <p className="text-sm text-fg-muted mt-1">
          The living network of FlowGardens. Every garden is private until its owner chooses to share — by area, exact spot, or live.
        </p>
      </div>
      <div className="flex-1 min-h-[420px] mx-3 md:mx-6 mb-4 md:mb-6 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--fg-border)' }}>
        <WorldMap />
      </div>
    </div>
  )
}
