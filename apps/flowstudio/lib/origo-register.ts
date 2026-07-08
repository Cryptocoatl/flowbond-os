import { createClient } from '@supabase/supabase-js';

// Register content on Origo with an explicit chain of `owners` (FBIDs). Origo is a
// Supabase RPC registry (public.origo_register, SECURITY DEFINER) in the canonical
// project — the same one lib/origo-read.ts reads from. It is idempotent by content
// hash, so re-publishing identical bytes returns the existing cert. The hosted cert
// is the durable provenance proof (social platforms strip embedded metadata).
export interface OrigoRegistration {
  registered: boolean;
  certId?: string;
  url?: string;
  existing?: boolean;
  reason?: string;
}

export async function registerContent(opts: {
  contentHash: string;
  title: string;
  creator: string;
  description?: string;
  aiTools?: string[];
  fbid?: string | null;
  owners?: string[];
  visibility?: 'private' | 'unlisted' | 'public';
  medium?: 'video' | 'audio' | 'image';
}): Promise<OrigoRegistration> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The public RPC is SECURITY DEFINER, so the anon key suffices; fall back to the
  // service-role key for server contexts without the public env.
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { registered: false, reason: 'Origo not configured.' };

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb.rpc('origo_register', {
      p_title: opts.title.slice(0, 120),
      p_content_hash: opts.contentHash,
      p_medium: opts.medium ?? 'video',
      p_creator: opts.creator.slice(0, 80),
      p_ai_tools: opts.aiTools ?? [],
      p_fbid: opts.fbid || null,
      p_description: (opts.description ?? '').slice(0, 280),
      p_visibility: opts.visibility ?? 'public',
      p_owners: opts.owners ?? [],
    });
    if (error) return { registered: false, reason: error.message };

    const row: { cert_id?: string; existing?: boolean } = Array.isArray(data) ? data[0] : data;
    const certId = row?.cert_id;
    const site = (process.env.ORIGO_API_URL || 'https://origo.flowme.one').replace(/\/api\/?$/, '');
    return {
      registered: true,
      certId,
      existing: !!row?.existing,
      url: certId ? `${site}/?cert=${encodeURIComponent(certId)}` : site,
    };
  } catch (e) {
    return { registered: false, reason: e instanceof Error ? e.message : 'Origo registration failed.' };
  }
}
