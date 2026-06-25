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

export const VAULT_CODE = '4444'; // pilot: both parties share 4444

/** Record a signature server-side (code-gated SECURITY DEFINER RPC). */
export async function vaultSign(role: VaultRole, code: string, name: string, document: VaultDoc) {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_sign', {
    p_party_role: role,
    p_code: code,
    p_signer_name: name,
    p_document: document,
  });
  if (error) throw error;
  return data as Signature;
}

/** Read the deal's signatures (public). */
export async function vaultSignatures(): Promise<Signature[]> {
  const sb = browserClient();
  const { data, error } = await sb.rpc('flowscrow_vault_signatures');
  if (error) throw error;
  return (data as Signature[]) ?? [];
}
