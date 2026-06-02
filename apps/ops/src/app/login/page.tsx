import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ops-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-ops-accent text-2xl font-bold">⚡</span>
            <div className="text-left">
              <p className="text-xs font-bold text-ops-text tracking-widest uppercase leading-none">FlowBond</p>
              <p className="text-[10px] text-ops-dim tracking-widest uppercase leading-none mt-0.5">OPS · dev</p>
            </div>
          </div>
          <h1 className="text-xl font-bold text-ops-text">Command Center</h1>
          <p className="text-sm text-ops-dim mt-1">Private. Password required.</p>
        </div>

        <LoginForm />

        {/* GitHub link */}
        <div className="mt-6 text-center">
          <a
            href="https://github.com/cryptocoatl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-ops-dim hover:text-ops-text transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            github.com/cryptocoatl
          </a>
        </div>
      </div>
    </div>
  )
}
