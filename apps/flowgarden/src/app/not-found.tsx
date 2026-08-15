import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="relative opacity-80 mb-6" style={{ width: 72, height: 72 }}>
        <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="" fill className="object-contain" />
      </div>
      <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--fg-text)' }}>
        Nothing grows here
      </h1>
      <p className="text-sm mt-2 max-w-sm" style={{ color: 'var(--fg-text-muted)' }}>
        That page doesn&rsquo;t exist — or it moved when we cleaned up the paths.
      </p>
      <div className="flex gap-2 mt-6">
        <Link href="/" className="btn-primary">Go to your garden</Link>
        <Link href="/welcome" className="btn-secondary">About FlowGarden</Link>
      </div>
    </main>
  )
}
