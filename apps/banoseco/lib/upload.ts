import { browserClient } from './supabase/client';

// Storage bucket for mission proof photos. Create it once (public) in Supabase:
//   insert into storage.buckets (id, name, public) values
//     ('banoseco-proofs','banoseco-proofs', true) on conflict do nothing;
// TODO(infra): provision this bucket + an insert policy for authenticated users
// before going live; until then completing a mission falls back to no proof.
const BUCKET = 'banoseco-proofs';

/** Upload a proof photo, returning its public URL — or null if it can't store. */
export async function uploadProof(file: File, userId: string): Promise<string | null> {
  try {
    const sb = browserClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) return null;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
