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

/**
 * The current user's canonical FBID id (the `flowbond_identities.id`), resolved
 * server-side via `current_fbid()` — which maps this session's login to its owning
 * FBID through `fbid_logins`, falling back to the legacy 1:1 `auth_user_id` link.
 *
 * Prefer this over `auth.uid()` anywhere you need "who is this" as a stable id: it
 * stays correct when a person has multiple logins/emails attached to one FBID.
 * Returns null if unauthenticated. */
export async function currentFbid(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_fbid')
  if (error) throw error
  return (data as string) ?? null
}

/**
 * The current user's own FBID identity record (handle, profile, settings).
 * Resolved through RLS: the caller may read the row matched by `current_fbid()`
 * (multi-login aware) OR the legacy `auth_user_id` link — both resolve to the same
 * single row, so this stays a safe `.maybeSingle()`. */
export async function getMyIdentity(supabase: SupabaseClient): Promise<FbidIdentity | null> {
  const { data, error } = await supabase
    .from('flowbond_identities')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as FbidIdentity) ?? null
}

/** A permanent entry in an FBID's connected-accounts ledger. Unlinking flips
 *  `status` to 'unlinked' but the row stays — the history is forever. */
export interface FbidConnectedAccount {
  id: string
  link_type: 'email' | 'wallet' | 'login' | 'external' | 'merged_account'
  value_ref: string | null
  provider: string
  label: string | null
  is_primary: boolean
  status: 'active' | 'unlinked'
  commitment: string
  linked_at: string
  unlinked_at: string | null
  [key: string]: unknown
}

/**
 * The current user's connected accounts (emails/wallets/logins linked to their
 * FBID), active first then history. This is the user-facing "what's linked to me"
 * list — every entry is permanently recorded on the FBID. */
export async function getConnectedAccounts(supabase: SupabaseClient): Promise<FbidConnectedAccount[]> {
  const { data, error } = await supabase.rpc('fbid_connected_accounts')
  if (error) throw error
  return (data as FbidConnectedAccount[]) ?? []
}

/**
 * Complete a verified email link by redeeming the one-time token from the email.
 * Must be called while signed in as the SAME FBID that requested it (the DB enforces
 * this). Returns the linked email. Throws `invalid_or_expired_token` / `linked_elsewhere`
 * / `not_authenticated`. Tokens are single-use and expire in 15 minutes. */
export async function confirmEmailLink(supabase: SupabaseClient, token: string): Promise<{ status: string; email: string }> {
  const { data, error } = await supabase.rpc('confirm_email_link', { p_token: token })
  if (error) throw error
  return data as { status: string; email: string }
}

/**
 * Unlink a connected account by its ledger id. Own links only; lockout-protected —
 * throws `cannot_unlink_primary` / `cannot_unlink_last_credential` / `link_not_found`.
 * The ledger row is kept (status → 'unlinked'); only the operational link is removed. */
export async function unlinkAccount(supabase: SupabaseClient, linkId: string): Promise<{ status: string; id: string }> {
  const { data, error } = await supabase.rpc('unlink_account', { p_link_id: linkId })
  if (error) throw error
  return data as { status: string; id: string }
}

/** A dry-run of what merging a duplicate account would move into your FBID. */
export interface MergePreview {
  dry_run: boolean
  loser_email: string
  loser_handle: string | null
  total_rows: number
  by_column: Record<string, number>
  [key: string]: unknown
}

/** Preview the merge for a confirmation token (winner session only). Shows exactly
 *  what would move before anything happens. Throws `invalid_or_expired_token` /
 *  `not_authenticated` (e.g. if opened while signed in as the wrong account). */
export async function mergePreview(supabase: SupabaseClient, token: string): Promise<MergePreview> {
  const { data, error } = await supabase.rpc('merge_preview_for_token', { p_token: token })
  if (error) throw error
  return data as MergePreview
}

/** Execute the merge for a confirmation token (single-use; winner session only).
 *  Re-points the other account's data onto your FBID and retires its login. */
export async function confirmMerge(supabase: SupabaseClient, token: string): Promise<{ merged: boolean; loser_email: string; total_rows: number }> {
  const { data, error } = await supabase.rpc('confirm_merge', { p_token: token })
  if (error) throw error
  return data as { merged: boolean; loser_email: string; total_rows: number }
}

/** A read-only preview of exactly what closing this account would erase. Changes nothing. */
export interface EraseFbidPreview {
  dry_run: true
  /** the caller's FBID id */
  fbid: string
  /** their handle, or null if never claimed */
  handle: string | null
  /** the phrase the user must type to confirm (their handle, or FB short id) */
  confirm_phrase: string
  /** how many logins (emails/wallets) will be closed */
  login_count: number
  /** total rows that will be deleted across every FlowBond world */
  total_rows: number
  /** the breakdown, keyed `table.column` → row count */
  by_column: Record<string, number>
}

/**
 * Dry-run the irreversible account closure. Reads only — deletes nothing — and
 * returns the full blast radius (`total_rows`, `by_column`, `login_count`) plus the
 * `confirm_phrase` the user must type. Use this to populate the "are you sure" screen
 * with honest numbers before anyone confirms. Throws `not_authenticated`.
 */
export async function eraseFbidPreview(supabase: SupabaseClient): Promise<EraseFbidPreview> {
  const { data, error } = await supabase.rpc('erase_my_fbid', { p_confirm: null, p_execute: false })
  if (error) throw error
  return data as EraseFbidPreview
}

/**
 * PERMANENTLY erase the current user's FBID and everything it owns across every
 * FlowBond world. Irreversible. Leaves only a no-PII tombstone (a one-way commitment
 * that an account once existed and was closed). After this resolves, sign the user out
 * — every login is dead. `confirm` MUST equal the `confirm_phrase` from
 * `eraseFbidPreview()`. Resolved entirely server-side from the caller's session, so it
 * can only ever erase the caller — never anyone else. Throws `confirm_mismatch`,
 * `not_authenticated`, or `has_dependent_identities`.
 */
export async function eraseMyFbid(
  supabase: SupabaseClient,
  confirm: string,
): Promise<{ erased: boolean; tombstone_id: string; rows_erased: number; logins_closed: number }> {
  const { data, error } = await supabase.rpc('erase_my_fbid', { p_confirm: confirm, p_execute: true })
  if (error) throw error
  return data as { erased: boolean; tombstone_id: string; rows_erased: number; logins_closed: number }
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
