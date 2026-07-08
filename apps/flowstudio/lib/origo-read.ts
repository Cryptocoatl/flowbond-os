import { createClient } from '@supabase/supabase-js';

export interface OrigoCert {
  cert_id: string;
  content_hash: string;
  title: string;
  medium: string;
  visibility: string;
}

/** Confirm Origo certs for files we already hold, by their content hash. Uses
 *  the public RPC origo_certs_by_hash (the `origo` schema isn't exposed to
 *  PostgREST). Privacy-preserving: only hashes we supply can be matched. */
export async function certsByHash(hashes: string[]): Promise<OrigoCert[]> {
  const unique = [...new Set(hashes.filter(Boolean))];
  if (!unique.length) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb.rpc('origo_certs_by_hash', { p_hashes: unique });
    if (error || !data) return [];
    return data as OrigoCert[];
  } catch {
    return [];
  }
}
