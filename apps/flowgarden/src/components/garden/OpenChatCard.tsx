'use client'

// Dashboard call-to-action that opens the global FlowMe chat launcher.
export function OpenChatCard() {
  function open() {
    window.dispatchEvent(new Event('fg-open-chat'))
  }
  return (
    <button
      type="button"
      onClick={open}
      data-tour="chat-cta"
      className="card-accent w-full text-left flex items-center gap-4 transition-transform hover:-translate-y-0.5"
    >
      <span
        className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
      >
        🌱
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg">Ask FlowMe anything</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-snug">
          “I planted 6 tomatoes”, “what should I do today?”, or snap a photo — it logs
          everything for you.
        </p>
      </div>
      <span className="btn-gold text-xs px-3 py-1.5 shrink-0 hidden sm:inline-flex">Open chat</span>
    </button>
  )
}
