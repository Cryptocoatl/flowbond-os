import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser/client-component client (public schema). Client-safe — no next/headers.
 * This is the client that performs all encrypted reads/writes: ciphertext is
 * produced/consumed in the browser (lib/claudia/crypto.ts) and only opaque bytes
 * ever travel to Postgres.
 */
export const browserClient = () => createBrowserClient(URL, KEY);
