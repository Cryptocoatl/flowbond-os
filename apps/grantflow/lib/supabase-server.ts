import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Read-only server client for the public catalog (grants / projects / matches). */
export const dbRead = () =>
  createClient(URL, ANON, {
    db: { schema: 'grantflow' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Service-role client — server-only. Required for grantflow.applications (no public policy). */
export const dbAdmin = () =>
  createClient(URL, SERVICE, {
    db: { schema: 'grantflow' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
