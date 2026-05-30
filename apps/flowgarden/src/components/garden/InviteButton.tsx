'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

interface Props {
  gardenCode: string | null
  gardenName: string
  personalCode: string | null
  personalXp?: number
}

type CopiedKey = 'garden' | 'personal' | null

export function InviteButton({ gardenCode, gardenName, personalCode, personalXp = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<CopiedKey>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function copy(text: string, key: CopiedKey) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2200)
    })
  }

  function gardenInviteUrl() {
    return `${window.location.origin}/onboarding?code=${gardenCode}`
  }

  function personalInviteUrl() {
    return `${window.location.origin}/auth/login?ref=${personalCode}`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 font-medium rounded-xl transition-all"
        style={{
          padding: '8px 16px',
          backgroundColor: open ? 'rgba(201,169,97,0.12)' : 'rgba(201,169,97,0.07)',
          border: '1px solid rgba(201,169,97,0.22)',
          color: 'var(--fg-gold)',
          fontSize: '0.8rem',
          letterSpacing: '0.03em',
        }}
        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => { if (!open) e.currentTarget.style.backgroundColor = 'rgba(201,169,97,0.11)' }}
        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => { if (!open) e.currentTarget.style.backgroundColor = 'rgba(201,169,97,0.07)' }}
      >
        {/* Leaf icon */}
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M8 2C5 2 2 5 2 8.5c0 2.5 1.5 4.5 3.5 5.5L6 12c-1-1-1.5-2.2-1.5-3.5C4.5 5.8 6.2 4 8 4c1.8 0 3.5 1.8 3.5 4.5 0 1.3-.5 2.5-1.5 3.5l.5 2c2-1 3.5-3 3.5-5.5C14 5 11 2 8 2z" />
        </svg>
        Invite to the Flow
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5 opacity-60" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 z-50 rounded-2xl"
          style={{
            top: 'calc(100% + 8px)',
            width: 320,
            backgroundColor: '#0C1A0E',
            border: '1px solid rgba(201,169,97,0.18)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,97,0.06)',
            overflow: 'hidden',
            animation: 'fg-fade-up 0.2s ease-out both',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(239,232,216,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
              <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="" fill className="object-contain" />
            </div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(239,232,216,0.7)', letterSpacing: '0.04em' }}>
              Invite to the Flow
            </p>
          </div>

          <div style={{ padding: '10px 8px' }}>

            {/* Option 1 — Garden invite */}
            {gardenCode && (
              <InviteOption
                icon="🌿"
                title={`Invite to ${gardenName}`}
                description="Join your specific garden as a collaborator"
                xpNote={personalXp > 0 ? `${personalXp} XP earned so far` : undefined}
                copied={copied === 'garden'}
                onCopy={() => copy(gardenInviteUrl(), 'garden')}
                accentColor="#1A5C35"
                badgeColor="rgba(26,92,53,0.12)"
                badgeText="#1A5C35"
              />
            )}

            {/* Divider */}
            {gardenCode && personalCode && (
              <div style={{ margin: '6px 10px', height: 1, backgroundColor: 'rgba(239,232,216,0.05)' }} />
            )}

            {/* Option 2 — FlowGarden invite */}
            {personalCode && (
              <InviteOption
                icon="✦"
                title="Invite to FlowGarden"
                description="Your personal invite — they can join any garden"
                xpNote="+5 XP per signup · +10 XP when they grow"
                copied={copied === 'personal'}
                onCopy={() => copy(personalInviteUrl(), 'personal')}
                accentColor="#9B7A28"
                badgeColor="rgba(155,122,40,0.10)"
                badgeText="#9B7A28"
                isGold
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InviteOption({
  icon, title, description, xpNote, copied, onCopy, accentColor, badgeColor, badgeText, isGold,
}: {
  icon: string; title: string; description: string; xpNote?: string;
  copied: boolean; onCopy: () => void;
  accentColor: string; badgeColor: string; badgeText: string; isGold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="w-full text-left rounded-xl transition-all group"
      style={{ padding: '12px 10px' }}
      onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.04)')}
      onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          backgroundColor: badgeColor,
          border: `1px solid ${isGold ? 'rgba(155,122,40,0.2)' : 'rgba(26,92,53,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: '0.825rem', fontWeight: 600, color: '#EFE8D8', lineHeight: 1.3 }}>{title}</p>
            {/* Copy indicator */}
            <span style={{
              fontSize: '0.7rem', fontWeight: 600,
              color: copied ? accentColor : 'rgba(239,232,216,0.3)',
              flexShrink: 0, transition: 'color 0.2s',
              letterSpacing: '0.03em',
            }}>
              {copied ? '✓ Copied!' : 'Copy link'}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(239,232,216,0.38)', marginTop: 3, lineHeight: 1.5 }}>
            {description}
          </p>
          {xpNote && (
            <p style={{ fontSize: '0.7rem', color: accentColor, marginTop: 5, opacity: 0.85, fontWeight: 500 }}>
              {xpNote}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
