import { FlowGardenLockup } from '@flowbond/ui'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-flow-dark flex flex-col items-center justify-between px-6 py-16">
      {/* Center section */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-2xl">
        <FlowGardenLockup width={420} color="gold" priority />

        <p className="font-serif text-2xl md:text-4xl text-flow-cream text-center leading-relaxed max-w-2xl">
          A living ecosystem where growth is effortless, connected and abundant.
        </p>
      </div>

      {/* Footer */}
      <footer className="text-flow-gold text-xs tracking-[0.3em] uppercase">
        GROW · FLOW · THRIVE
      </footer>
    </main>
  )
}
