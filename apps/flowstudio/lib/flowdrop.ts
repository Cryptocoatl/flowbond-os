import { dbRead } from './supabase-admin';

// ── shared row types ─────────────────────────────────────────────────────────
export interface FlowdropEvent {
  id: string;
  slug: string;
  owner_fbid: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: 'open' | 'locked' | 'published';
  drop_starts_at: string | null;
  drop_ends_at: string | null;
  created_at: string;
}
export interface Contribution {
  id: string;
  event_id: string;
  contributor_fbid: string;
  kind: 'photo' | 'video';
  storage_path: string;
  content_hash: string | null;
  original_filename: string | null;
  size_bytes: number | null;
  captured_at: string | null;
  status: 'submitted' | 'used' | 'rejected';
  created_at: string;
}
export interface Publication {
  id: string;
  event_id: string;
  editor_fbid: string;
  title: string;
  storage_path: string;
  content_hash: string | null;
  origo_cert_id: string | null;
  visibility: 'private' | 'unlisted' | 'public';
  credits: { shooters: string[]; editor: string } | null;
  created_at: string;
}

export const DROP_BUCKET = 'event-drops';
export const PUB_BUCKET = 'event-publications';

// FlowCredits minted per publication (env-overridable). The chain: each distinct
// shooter whose footage was used + the editor who cut the piece.
export const REWARD_SHOOTER = Number(process.env.FLOWDROP_REWARD_SHOOTER ?? '20');
export const REWARD_EDITOR = Number(process.env.FLOWDROP_REWARD_EDITOR ?? '50');

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);

/** Public event header (events are world-readable by RLS). */
export async function eventBySlug(slug: string): Promise<FlowdropEvent | null> {
  const { data } = await dbRead().from('flowdrop_events').select('*').eq('slug', slug).maybeSingle();
  return (data as FlowdropEvent) ?? null;
}
