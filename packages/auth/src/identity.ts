// FBID identity SDK — every app reads handle / profile / user info from FBID
// (the `flowbond_identities` record) through these helpers, and writes privacy
// settings via the DB RPCs that enforce the 5-tier visibility model server-side.
//
// Framework-agnostic: pass any @supabase/supabase-js client (browser, server, or
// service-role). Privacy is enforced in the database (RLS + get_profile), so these
// are thin, safe wrappers — a client can never see more than its closeness allows.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Most-private → most-open. `private` is the default for every new identity. */
export type FbidVisibility =
  | 'private'
  | 'selected'
  | 'close_friends'
  | 'network'
  | 'public'

/** Closeness an owner grants a peer. Selected ⊃ close_friends ⊃ network. */
export type FbidRelationshipTier = 'selected' | 'close_friends' | 'network'

/** The caller's own identity row (full, since RLS returns only your own). */
export interface FbidIdentity {
  id: string
  auth_user_id: string
  handle: string | null
  handle_is_draft: boolean
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  default_visibility: FbidVisibility
  field_visibility: Record<string, FbidVisibility>
  is_verified: boolean
  [key: string]: unknown
}

/**
 * A privacy-filtered view of someone else's profile. Only the fields the caller
 * is close enough to see are present; everything else is omitted. `null` means
 * the profile is invisible to the caller (e.g. super-private with no relationship).
 */
export type FbidProfile = (Record<string, unknown> & { viewer_closeness: number }) | null

/** The current user's own FBID identity record (handle, profile, settings). */
export async function getMyIdentity(supabase: SupabaseClient): Promise<FbidIdentity | null> {
  const { data, error } = await supabase
    .from('flowbond_identities')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as FbidIdentity) ?? null
}

/** Look up another user's profile by handle, privacy-filtered for the caller. */
export async function getProfile(supabase: SupabaseClient, handle: string): Promise<FbidProfile> {
  const { data, error } = await supabase.rpc('get_profile', { p_handle: handle })
  if (error) throw error
  return (data as FbidProfile) ?? null
}

/** Look up another user's profile by FBID id, privacy-filtered for the caller. */
export async function getProfileById(supabase: SupabaseClient, id: string): Promise<FbidProfile> {
  const { data, error } = await supabase.rpc('get_profile_by_id', { p_id: id })
  if (error) throw error
  return (data as FbidProfile) ?? null
}

/** Is a handle free to claim right now? (valid format, not reserved, not taken) */
export async function handleAvailable(supabase: SupabaseClient, handle: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('handle_available', { p_handle: handle })
  if (error) throw error
  return data === true
}

/**
 * Claim (or replace) the current user's handle. Throws on conflict/invalid:
 * the Postgres error message is one of `handle_taken`, `handle_reserved`,
 * `invalid_handle_format`, `not_authenticated`.
 */
export async function claimHandle(supabase: SupabaseClient, handle: string): Promise<FbidIdentity> {
  const { data, error } = await supabase.rpc('claim_handle', { p_handle: handle })
  if (error) throw error
  return data as FbidIdentity
}

/**
 * Update the current user's privacy. Pass a new profile-level default and/or a
 * partial map of per-field overrides (merged into existing). Omitted fields stay.
 * e.g. setVisibility(sb, { default: 'private', fields: { display_name: 'public' } })
 */
export async function setVisibility(
  supabase: SupabaseClient,
  opts: { default?: FbidVisibility; fields?: Record<string, FbidVisibility> },
): Promise<FbidIdentity> {
  const { data, error } = await supabase.rpc('set_visibility', {
    p_default: opts.default ?? null,
    p_fields: opts.fields ?? null,
  })
  if (error) throw error
  return data as FbidIdentity
}

/** Grant a peer a closeness tier (selected / close_friends / network). Upserts. */
export async function setRelationship(
  supabase: SupabaseClient,
  peerUserId: string,
  tier: FbidRelationshipTier,
): Promise<void> {
  const { error } = await supabase.rpc('set_relationship', { p_peer: peerUserId, p_tier: tier })
  if (error) throw error
}

/** Remove any closeness grant to a peer (they drop back to public-only view). */
export async function removeRelationship(supabase: SupabaseClient, peerUserId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_relationship', { p_peer: peerUserId })
  if (error) throw error
}
