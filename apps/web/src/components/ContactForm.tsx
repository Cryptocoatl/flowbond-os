'use client'

import { useState, useTransition } from 'react'
import { joinWaitlist } from '@/app/actions/waitlist'
import { FINAL } from '@/content/site'

export function ContactForm() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean }>({ text: '', ok: true })
  const [pending, start] = useTransition()

  const submit = () => {
    if (pending) return
    start(async () => {
      const res = await joinWaitlist(email)
      setMsg({ text: res.message, ok: res.ok })
      if (res.ok) setEmail('')
    })
  }

  return (
    <>
      <div className="cform">
        <input
          type="email"
          id="email"
          placeholder={FINAL.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          aria-label="Email address"
        />
        <button className="btn btn-primary" id="join" data-mag onClick={submit} disabled={pending}>
          {pending ? 'Sending…' : FINAL.cta} <span className="arr">→</span>
        </button>
      </div>
      <div className="cform-msg" id="cmsg" role="status" aria-live="polite" style={{ color: msg.ok ? 'var(--jade)' : '#ff9b9b' }}>
        {msg.text}
      </div>
    </>
  )
}
