'use client'

import { useState } from 'react'

export function InviteCodeCopy({ code, xp }: { code: string; xp: number }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="text-right">
      <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Invite code</p>
      <button
        onClick={copy}
        className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 hover:bg-emerald-100 active:scale-95 transition-all touch-manipulation"
        title="Tap to copy"
      >
        {copied ? '✓ Copied!' : code}
      </button>
      {xp > 0 && (
        <p className="text-[10px] text-amber-600 mt-1">+{xp} XP from referrals</p>
      )}
    </div>
  )
}
