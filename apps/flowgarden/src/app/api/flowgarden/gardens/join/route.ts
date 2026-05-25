import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_GARDEN_MEMBERS = 5
const REFERRAL_XP = 100

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrCreateFlowBondIdentity(admin: any, userId: string, email?: string | null) {
  const { data: existing } = await admin
    .from('flowbond_identities')
    .select('id, points_balance')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (existing) return existing as { id: string; points_balance: number }

  // Derive a deterministic unique handle from the user's UUID
  const handle = 'fg' + userId.replace(/-/g, '').slice(0, 14)
  const { data: created, error } = await admin
    .from('flowbond_identities')
    .insert({ auth_user_id: userId, handle, email: email ?? null })
    .select('id, points_balance')
    .single()

  if (error) {
    console.error('[flowbond_identity] create error:', error)
    return null
  }
  return created as { id: string; points_balance: number }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const inviteCode = body.invite_code?.trim().toUpperCase()

  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the garden by invite code (user_id needed for referral tracking)
  const { data: garden, error: gardenError } = await admin
    .from('flowgarden_gardens')
    .select('id, name, invite_code, user_id')
    .eq('invite_code', inviteCode)
    .single()

  if (gardenError || !garden) {
    return NextResponse.json({ error: 'Invalid invite code. Check the code and try again.' }, { status: 404 })
  }

  // Check if already a member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('id')
    .eq('garden_id', garden.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ garden, already_member: true }, { status: 200 })
  }

  // Check member count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('id', { count: 'exact', head: true })
    .eq('garden_id', garden.id)

  if ((count ?? 0) >= MAX_GARDEN_MEMBERS) {
    return NextResponse.json(
      { error: `This garden is full (max ${MAX_GARDEN_MEMBERS} members).` },
      { status: 409 }
    )
  }

  // Add user as member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (admin as any)
    .from('flowgarden_garden_members')
    .insert({ garden_id: garden.id, user_id: user.id, role: 'member' })

  if (memberError) {
    return NextResponse.json({ error: 'Failed to join garden' }, { status: 500 })
  }

  // Update display_name if provided
  if (body.display_name?.trim()) {
    await admin
      .from('flowgarden_profiles')
      .update({ display_name: body.display_name.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  // Referral tracking — skip if the owner is somehow joining their own garden
  if (garden.user_id !== user.id) {
    void trackReferral(admin, garden, user)
  }

  return NextResponse.json({ garden }, { status: 200 })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trackReferral(admin: any, garden: { id: string; invite_code: string | null; user_id: string }, user: { id: string; email?: string }) {
  try {
    // Fetch garden owner's email from auth
    const { data: ownerData } = await admin.auth.admin.getUserById(garden.user_id)
    const ownerEmail = ownerData?.user?.email ?? null

    // Find or create FlowBond identities for both parties in parallel
    const [referrerIdentity, referredIdentity] = await Promise.all([
      getOrCreateFlowBondIdentity(admin, garden.user_id, ownerEmail),
      getOrCreateFlowBondIdentity(admin, user.id, user.email),
    ])

    if (!referrerIdentity || !referredIdentity) return

    // Link referred_by on the joiner's identity (only if not already set)
    await admin
      .from('flowbond_identities')
      .update({ referred_by_id: referrerIdentity.id })
      .eq('id', referredIdentity.id)
      .is('referred_by_id', null)

    // Record referral in cross-product referrals table
    const { error: refError } = await admin
      .from('referrals')
      .insert({
        referrer_id: referrerIdentity.id,
        referred_id: referredIdentity.id,
        referral_code_used: garden.invite_code ?? '',
        event_type: 'signup',
        resource_type: 'flowgarden',
        resource_id: garden.id,
        referrer_points: REFERRAL_XP,
        referred_points: 0,
        status: 'rewarded',
        converted_at: new Date().toISOString(),
        rewarded_at: new Date().toISOString(),
      })
    if (refError) console.error('[referral] insert error:', refError)

    // Award XP to referrer via garden XP log
    const { error: xpError } = await admin
      .from('flowgarden_xp_log')
      .insert({
        user_id: garden.user_id,
        amount: REFERRAL_XP,
        reason: `${user.email ?? 'A new gardener'} joined your garden via invite code`,
      })
    if (xpError) console.error('[flowgarden_xp_log] insert error:', xpError)

    // Increment referrer's FlowBond points balance
    const newBalance = (referrerIdentity.points_balance ?? 0) + REFERRAL_XP
    const { error: balError } = await admin
      .from('flowbond_identities')
      .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', referrerIdentity.id)
    if (balError) console.error('[flowbond_identities] balance update error:', balError)
  } catch (err) {
    // Referral tracking is best-effort — never block the join response
    console.error('[trackReferral] unexpected error:', err)
  }
}
