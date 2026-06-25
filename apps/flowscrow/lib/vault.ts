'use client';

import { browserClient } from './supabase/client';

export type VaultRole = 'steph' | 'russell';
export type VaultDoc = 'acknowledgment' | 'agreement';

export interface Signature {
  id: string;
  party_role: VaultRole;
  signer_name: string;
  document: VaultDoc;
  signed_at: string;
}

export interface Witness {
  id: string;
  name: string;
  first_viewed_at: string;
  last_viewed_at: string;
}

/** Who a code belongs to. Returned by resolve; null = invalid code. */
export interface Resolved {
  kind: 'signer' | 'witness';
  party_role: VaultRole | null;
  display_name: string;
  person_key: string | null;
}

/** Identify a person by their unique code (no email leaked). */
export async function vaultResolve(code: string): Promise<Resolved | null> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_resolve', { p_code: code });
  if (error) throw error;
  const row = (data as Resolved[])?.[0];
  return row ?? null;
}

/** Is the current FBID session authorized to sign/download for this signer code? */
export async function vaultAuthorized(code: string): Promise<boolean> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_authorized', { p_code: code });
  if (error) return false;
  return data === true;
}

/** Record a signature — requires an FBID session matching the signer. */
export async function vaultSign(code: string, document: VaultDoc): Promise<Signature> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_sign', { p_code: code, p_document: document });
  if (error) throw error;
  return data as Signature;
}

/** Record a witness view (code-based; view only). */
export async function vaultWitness(code: string): Promise<Witness> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_witness', { p_code: code });
  if (error) throw error;
  return data as Witness;
}

export async function vaultSignatures(): Promise<Signature[]> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_signatures');
  if (error) throw error;
  return (data as Signature[]) ?? [];
}

export async function vaultWitnesses(): Promise<Witness[]> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_witnesses');
  if (error) throw error;
  return (data as Witness[]) ?? [];
}

/** Current FBID session email (for showing who's verified), or null. */
export async function sessionEmail(): Promise<string | null> {
  const sb = browserClient();
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? null;
}
