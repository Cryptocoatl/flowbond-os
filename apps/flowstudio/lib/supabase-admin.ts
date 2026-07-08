import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Stateless anon client for public reads in server code (no cookies). The Event
 * Drop feature uses NO service-role key — every privileged operation runs through
 * SECURITY DEFINER RPCs + storage RLS under the FBID user's own session.
 */
export const dbRead = () =>
  createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
