import Image from 'next/image'

export const metadata = { title: 'Offline · FlowGarden' }

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-fg-bg">
      <div className="relative mb-6" style={{ width: 64, height: 64, opacity: 0.9 }}>
        <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" />
      </div>
      <h1 className="font-display text-2xl font-bold text-fg">You’re offline</h1>
      <p className="text-sm text-fg-muted mt-2 max-w-xs">
        FlowGarden can’t reach the garden right now. Check your connection — your
        plants are still growing. 🌱
      </p>
      <a href="/flowgarden" className="btn-primary mt-6">Try again</a>
    </div>
  )
}
