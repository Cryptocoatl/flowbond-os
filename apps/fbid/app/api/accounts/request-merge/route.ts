import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Start merging another account (the one that owns `email`) into the caller's FBID.
// SECURITY: the confirmation link is sent to the LOSER email (proves control of it),
// and can only be confirmed while signed in as the winner. The token never reaches
// the browser in production. Re-uses the same hardened-token pattern as add-email.
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}) as { email?: string })
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ status: 'invalid_email' }, { status: 400 })
  }

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ status: 'not_authenticated' }, { status: 401 })

  const { data: fbid, error: fe } = await sb.rpc('current_fbid')
  if (fe || !fbid) return NextResponse.json({ status: 'no_fbid' }, { status: 400 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ status: 'not_configured' })

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('request_merge', { p_winner_fbid: fbid, p_loser_email: email })
  if (error) return NextResponse.json({ status: 'error' }, { status: 500 })
  const res = data as { status: string; token?: string; email?: string }

  if (res.status !== 'sent') {
    // not_an_account | same_account | no_loser_identity | rate_limited
    return NextResponse.json({ status: res.status })
  }

  const origin = new URL(req.url).origin
  const confirmUrl = `${origin}/auth/confirm-merge?token=${res.token}`
  const delivered = await sendMergeEmail(res.email!, confirmUrl)

  const body: Record<string, unknown> = { status: delivered ? 'merge_sent' : 'email_unconfigured' }
  if (process.env.NODE_ENV !== 'production') body.devConfirmUrl = confirmUrl
  return NextResponse.json(body)
}

async function sendMergeEmail(to: string, confirmUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FBID_FROM_EMAIL || 'FlowBond ID <id@flowbond.life>',
        to,
        subject: 'Confirm merging this account into your FlowBond ID',
        html: `<div style="font-family:system-ui;max-width:520px">
          <h2>Merge this account into your FlowBond identity?</h2>
          <p>You asked to fold this account (<b>${to}</b>) into your main FlowBond ID. Its data moves to your
          main account and this login is retired — this cannot be undone.</p>
          <p><b>Open this link while signed in to the account you want to keep.</b></p>
          <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;border-radius:12px;text-decoration:none">Review &amp; confirm merge</a></p>
          <p style="color:#666;font-size:13px">Single-use, expires in 30 minutes. You'll see exactly what moves before anything happens. If you didn't request this, ignore this email.</p>
        </div>`,
      }),
    })
    return r.ok
  } catch {
    return false
  }
}
