import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Add a verified email to the caller's FBID.
// SECURITY: the one-time token is minted by the SERVICE-ROLE RPC and delivered ONLY
// to the target email — it is never returned to the browser in production (so you
// can't link an address you don't control). The dev fallback link is gated to
// non-production only.
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}) as { email?: string })
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ status: 'invalid_email' }, { status: 400 })
  }

  // Who is calling — resolved from the RLS session, as the user.
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ status: 'not_authenticated' }, { status: 401 })

  const { data: fbid, error: fe } = await sb.rpc('current_fbid')
  if (fe || !fbid) return NextResponse.json({ status: 'no_fbid' }, { status: 400 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ status: 'email_unconfigured' })
  }

  // Mint the challenge server-side; the plaintext token stays on the server.
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('request_email_link', { p_fbid: fbid, p_email: email })
  if (error) return NextResponse.json({ status: 'error' }, { status: 500 })
  const res = data as { status: string; token?: string; email?: string }

  if (res.status !== 'sent') {
    // already_linked | requires_merge | linked_elsewhere | rate_limited | invalid_email
    return NextResponse.json({ status: res.status })
  }

  const origin = new URL(req.url).origin
  const confirmUrl = `${origin}/auth/confirm-email?token=${res.token}`
  const delivered = await sendVerificationEmail(res.email!, confirmUrl)

  const body: Record<string, unknown> = { status: delivered ? 'sent' : 'email_unconfigured' }
  if (process.env.NODE_ENV !== 'production') body.devConfirmUrl = confirmUrl // dev-only convenience
  return NextResponse.json(body)
}

async function sendVerificationEmail(to: string, confirmUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FBID_FROM_EMAIL ?? 'FlowBond ID <id@flowbond.life>',
        to,
        subject: 'Confirm linking this email to your FlowBond ID',
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
          <h2>Link this email to your FlowBond identity</h2>
          <p>Someone (hopefully you) asked to connect this email to a FlowBond ID.</p>
          <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;border-radius:12px;text-decoration:none">Confirm &amp; link this email</a></p>
          <p style="color:#666;font-size:13px">This link is single-use and expires in 15 minutes. If you didn't request it, just ignore this email — nothing happens.</p>
        </div>`,
      }),
    })
    return r.ok
  } catch {
    return false
  }
}
