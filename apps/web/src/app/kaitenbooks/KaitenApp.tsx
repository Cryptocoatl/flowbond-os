'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Editor from './Editor'
import type { OpenPayload } from './types'

type Phase = 'booting' | 'email' | 'code' | 'checking' | 'denied' | 'ready' | 'misconfigured'

/**
 * The gate. One door, one key: an FBID that is on `kaiten_members`.
 *
 * Sign-in is the 8-digit code that arrives by email — the same path the FBID
 * hub uses everywhere else, and the robust one: no redirect allow-lists, no
 * same-browser requirement, no link that expires in a preview pane. Account
 * creation is off, so an unknown address gets a code it can never receive.
 */
export default function KaitenApp({ supabaseUrl, supabaseKey }: { supabaseUrl: string; supabaseKey: string }) {
  const configured = Boolean(supabaseUrl && supabaseKey)

  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!configured) return null
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'kaitenbooks-auth',
      },
    })
  }, [configured, supabaseUrl, supabaseKey])

  const [phase, setPhase] = useState<Phase>(configured ? 'booting' : 'misconfigured')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<OpenPayload | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  /* The editor is a full-screen surface. The marketing shell's ambient layers —
     grain, magnetic cursor, scroll progress — have no business over a page
     someone is trying to write on. */
  useEffect(() => {
    document.documentElement.classList.add('kaiten-mode')
    return () => document.documentElement.classList.remove('kaiten-mode')
  }, [])

  const open = useCallback(async () => {
    if (!supabase) return
    setPhase('checking')
    const { data, error: rpcError } = await supabase.rpc('kaiten_open')
    if (rpcError) {
      setError('No se pudo abrir el escritorio. Intenta de nuevo en un momento.')
      setPhase('email')
      return
    }
    const result = data as OpenPayload
    if (!result?.ok) {
      setPhase('denied')
      return
    }
    setPayload(result)
    setPhase('ready')
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) void open()
      else setPhase('email')
    })
    return () => {
      cancelled = true
    }
  }, [supabase, open])

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (otpError) {
      setError('Ese correo no tiene acceso a Kaitenbooks.')
      return
    }
    setPhase('code')
    setTimeout(() => codeRef.current?.focus(), 60)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (verifyError) {
      setError('El código no es válido o ya venció. Pide uno nuevo.')
      return
    }
    void open()
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setPayload(null)
    setCode('')
    setPhase('email')
  }

  if (phase === 'ready' && payload?.canon && supabase) {
    return <Editor supabase={supabase} payload={payload} onSignOut={signOut} />
  }

  return (
    <main className="gate">
      <div className="gate__panel">
        <div className="gate__mark">
          Kaiten<b>books</b>
        </div>

        {phase === 'misconfigured' && (
          <>
            <h1>El escritorio no está conectado</h1>
            <p>
              Falta la configuración de Supabase en este despliegue. Avísale a Steph — no es
              algo que se arregle desde aquí.
            </p>
          </>
        )}

        {(phase === 'booting' || phase === 'checking') && (
          <>
            <h1>Abriendo…</h1>
            <p className="gate__muted">Un momento.</p>
          </>
        )}

        {phase === 'email' && (
          <>
            <h1>Tu escritorio</h1>
            <p>
              Los tres libros, tal como están hoy. Escribe con tu correo y te mando un código
              de 8 dígitos.
            </p>
            <form onSubmit={sendCode} className="gate__form">
              <label htmlFor="k-email">Correo</label>
              <input
                id="k-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
              <button className="gate__btn" type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Enviando…' : 'Mandarme el código'}
              </button>
            </form>
          </>
        )}

        {phase === 'code' && (
          <>
            <h1>Revisa tu correo</h1>
            <p>
              Le mandé un código de 8 dígitos a <b>{email}</b>. Escríbelo aquí — el enlace del
              mismo correo también sirve.
            </p>
            <form onSubmit={verify} className="gate__form">
              <label htmlFor="k-code">Código</label>
              <input
                id="k-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="········"
                className="gate__code"
              />
              <button className="gate__btn" type="submit" disabled={busy || code.length < 6}>
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
              <button
                type="button"
                className="gate__link"
                onClick={() => {
                  setPhase('email')
                  setCode('')
                  setError(null)
                }}
              >
                Usar otro correo
              </button>
            </form>
          </>
        )}

        {phase === 'denied' && (
          <>
            <h1>Este correo no tiene acceso</h1>
            <p>
              Kaitenbooks es privado. Si crees que debería abrirse para ti, habla con Steph.
            </p>
            <button className="gate__btn" type="button" onClick={signOut}>
              Probar con otro correo
            </button>
          </>
        )}

        {error && (
          <p className="gate__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <p className="gate__foot">Privado · Juan Carlos Kaiten</p>
    </main>
  )
}
