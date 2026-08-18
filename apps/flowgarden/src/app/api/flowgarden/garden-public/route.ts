import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Publishing is the OWNER's decision, not any member's — a shared garden should
// not become a public page because one collaborator flipped a switch.

const SLUG_SHAPE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/
const RESERVED = new Set([
  'api', 'auth', 'debug', 'welcome', 'offline', 'onboarding', 'settings', 'survey',
  'plants', 'tasks', 'journal', 'map', 'world', 'devices', 'tianguis', 'g', 'new', 'admin',
])

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as
    { is_public?: boolean; public_slug?: string; public_bio?: string } | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()

  // The garden this user OWNS — publishing is not a member action.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: owned } = await (admin as any)
    .from('flowgarden_gardens')
    .select('id, public_slug')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!owned) {
    return NextResponse.json(
      { error: 'Only the garden owner can publish a page. Create your own garden to publish one.' },
      { status: 403 },
    )
  }

  const slug = body.public_slug?.trim().toLowerCase()
  const wantsPublic = body.is_public === true

  if (slug !== undefined && slug !== '') {
    if (!SLUG_SHAPE.test(slug)) {
      return NextResponse.json(
        { error: 'Use 3–40 characters: lowercase letters, numbers and hyphens, starting and ending with a letter or number.' },
        { status: 400 },
      )
    }
    if (RESERVED.has(slug)) {
      return NextResponse.json({ error: `“${slug}” is reserved. Try something more specific to your garden.` }, { status: 400 })
    }
    // Someone else's slug — check before the DB's unique index turns it into a
    // 500-shaped error, so the message can be useful.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clash } = await (admin as any)
      .from('flowgarden_gardens')
      .select('id')
      .eq('public_slug', slug)
      .neq('id', owned.id)
      .maybeSingle()
    if (clash) {
      return NextResponse.json({ error: `“${slug}” is taken. Try another.` }, { status: 409 })
    }
  }

  const effectiveSlug = slug === '' ? null : (slug ?? owned.public_slug ?? null)
  if (wantsPublic && !effectiveSlug) {
    return NextResponse.json({ error: 'Choose a web address for your garden before publishing it.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.is_public !== undefined) patch.is_public = wantsPublic
  if (slug !== undefined) patch.public_slug = effectiveSlug
  if (body.public_bio !== undefined) patch.public_bio = body.public_bio.trim().slice(0, 600) || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_gardens')
    .update(patch)
    .eq('id', owned.id)
    .select('is_public, public_slug, public_bio')
    .single()

  if (error) {
    console.error('[garden-public] update failed:', error.message)
    return NextResponse.json({ error: 'Could not save. Try a different web address.' }, { status: 400 })
  }

  return NextResponse.json({ garden: data })
}
