import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REFERRAL_SIGNUP_XP = 5

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/flowgarden'
  const ref = searchParams.get('ref') // personal invite code of the referrer

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData?.user) {
      // Process platform referral if ref code present (best-effort, never blocks redirect)
      if (ref) {
        void processReferral(sessionData.user.id, ref)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}

async function processReferral(newUserId: string, referralCode: string) {
  try {
    const admin = createAdminClient()

    // Find referrer by personal_invite_code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referrerProfile } = await (admin as any)
      .from('flowgarden_profiles')
      .select('user_id, xp_total')
      .eq('personal_invite_code', referralCode)
      .maybeSingle()

    if (!referrerProfile || referrerProfile.user_id === newUserId) return

    // Find the new user's profile — only reward if not already set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newProfile } = await (admin as any)
      .from('flowgarden_profiles')
      .select('user_id, referral_signup_xp_awarded, referred_by_user_id')
      .eq('user_id', newUserId)
      .maybeSingle()

    if (!newProfile || newProfile.referral_signup_xp_awarded) return

    // Mark the new user as referred and prevent double-award
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('flowgarden_profiles')
      .update({
        referred_by_user_id: referrerProfile.user_id,
        referral_signup_xp_awarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', newUserId)

    // Award 5 XP to referrer
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
