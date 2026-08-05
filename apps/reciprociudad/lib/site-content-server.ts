import { createClient } from '@supabase/supabase-js';
import {
  DEFAULTS,
  MEDIA_DEFAULTS,
  INICIATIVAS_DEFAULT,
  FALLBACK,
  type SiteContent,
  type Iniciativa,
} from './site-content';

/** How long a rendered page may serve stale copy. /admin also revalidates on save. */
export const CONTENT_TTL = 30;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Reads the editable copy for the live page.
 *
 * Uses the ANON key and the three public read RPCs — no service role is
 * involved, so this is safe on any runtime. Every failure path falls back to
 * the canonical defaults in lib/site-content.ts: the site renders its designed
 * copy even if the database is down.
 */
export async function getSiteContent(): Promise<SiteContent> {
  if (!URL || !ANON) return FALLBACK;

  try {
    const sb = createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // ISR-friendly: the fetch participates in the route's revalidate window
        // instead of forcing the page to render dynamically on every request.
        fetch: (input, init) =>
          fetch(input as RequestInfo, { ...init, next: { revalidate: CONTENT_TTL } }),
      },
    });

    const [copyRes, mediaRes, initRes] = await Promise.all([
      sb.rpc('reciprociudad_content_public'),
      sb.rpc('reciprociudad_media_public'),
      sb.rpc('reciprociudad_iniciativas_public'),
    ]);

    const copy = { ...DEFAULTS };
    for (const row of (copyRes.data ?? []) as { key: string; value: string }[]) {
      if (row?.key && typeof row.value === 'string') copy[row.key] = row.value;
    }

    const media = { ...MEDIA_DEFAULTS };
    for (const row of (mediaRes.data ?? []) as { slot: string; url: string }[]) {
      if (row?.slot && row.url) media[row.slot] = row.url;
    }

    const rows = (initRes.data ?? []) as Iniciativa[];
    const iniciativas = rows.length ? rows : INICIATIVAS_DEFAULT;

    return { copy, media, iniciativas };
  } catch {
    return FALLBACK;
  }
}
