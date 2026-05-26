'use client'

import { useState } from 'react'

interface Props {
  code: string
  label: string
  xp: number
  subtitle?: string
  // defaults to /onboarding with param "code" (garden invite)
  // override to /auth/login with param "ref" for personal invite
  linkPath?: string
  linkParam?: string
}

export function InviteCodeCopy({
  code,
  label,
  xp,
  subtitle,
  linkPath = '/onboarding',
  linkParam = 'code',
}: Props) {
  const [copied, setCopied] = useState(false)
  const [copyMode, setCopyMode] = useState<'code' | 'link'>('code')

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopyMode('code')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyLink() {
    const url = `${window.location.origin}${linkPath}?${linkParam}=${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyMode('link')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="text-right">
      <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={copyCode}
          className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 hover:bg-emerald-100 active:scale-95 transition-all touch-manipulation"
          title="Copy code"
        >
          {copied && copyMode === 'code' ? '✓ Copied!' : code}
        </button>
        <button
          onClick={copyLink}
          className="text-xs text-stone-400 hover:text-emerald-700 border border-stone-200 hover:border-emerald-200 rounded-lg px-2.5 py-1 transition-all touch-manipulation"
          title="Copy invite link"
        >
          {copied && copyMode === 'link' ? '✓ Link copied!' : '🔗 Link'}
        </button>
      </div>
      {subtitle && <p className="text-[10px] text-amber-600 mt-1">{subtitle}</p>}
      {xp > 0 && <p className="text-[10px] text-amber-600 mt-1">+{xp} XP earned from referrals</p>}
    </div>
  )
}
