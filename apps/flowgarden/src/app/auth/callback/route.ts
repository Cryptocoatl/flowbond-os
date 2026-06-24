import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REFERRAL_SIGNUP_XP = 5

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/'
  const ref        = searchParams.get('ref')

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()                  { return cookieStore.getAll() },
        setAll(cookiesToSet)      { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  // ── PKCE flow (magic link / FBID hub handoff via code) ──
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      await linkFbid(supabase)
      if (ref) void processReferral(data.user.id, ref)
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] PKCE exchange failed:', error?.message)
  }

  // ── token_hash flow (FBID hub handoff, recovery, invite, email templates) ──
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email' | 'recovery' | 'invite',
    })
    if (!error && data?.user) {
      await linkFbid(supabase)
      if (ref) void processReferral(data.user.id, ref)
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] OTP verify failed:', error?.message)
  }

  // ── Nothing worked — send back to login with a clear error ──
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}

// Link the canonical FBID identity + register FlowGarden's app connection.
// Idempotent; never block login if it fails.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkFbid(supabase: any) {
  try {
    await supabase.rpc('activate_app', { p_app_slug: 'flowgarden' })
  } catch (err) {
    console.error('[auth/callback] activate_app failed:', err)
  }
}

async function processReferral(newUserId: string, referralCode: string) {
  try {
    const admin = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referrerProfile } = await (admin as any)
      .from('flowgarden_profiles')
      .select('user_id, xp_total')
      .eq('personal_invite_code', referralCode)
      .maybeSingle()

    if (!referrerProfile || referrerProfile.user_id === newUserId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newProfile } = await (admin as any)
      .from('flowgarden_profiles')
      .select('user_id, referral_signup_xp_awarded')
      .eq('user_id', newUserId)
      .maybeSingle()

    if (!newProfile || newProfile.referral_signup_xp_awarded) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('flowgarden_profiles')
      .update({
        referred_by_user_id: referrerProfile.user_id,
        referral_signup_xp_awarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', newUserId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('flowgarden_xp_log').insert({
      user_id: referrerProfile.user_id,
      amount: REFERRAL_SIGNUP_XP,
      reason: 'Someone joined FlowGarden using your invite link',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('flowgarden_profiles')
      .update({ xp_total: (referrerProfile.xp_total ?? 0) + REFERRAL_SIGNUP_XP })
      .eq('user_id', referrerProfile.user_id)
  } catch (err) {
    console.error('[referral] processReferral error:', err)
  }
}
