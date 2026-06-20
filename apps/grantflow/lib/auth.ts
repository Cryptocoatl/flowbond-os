import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { dbAdmin } from './supabase-server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-bound Supabase client for reading the FBID session in server code. */
export async function authClient() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — middleware refreshes instead */
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getUser(): Promise<SessionUser | null> {
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export interface Access {
  email: string;
  tier: 'owner' | 'paid' | 'granted';
  status: string;
}

/** An entitlement row only counts if it's active. Email is the gate key. */
export async function getAccess(email: string | null | undefined): Promise<Access | null> {
  if (!email) return null;
  const { data } = await dbAdmin()
    .from('access')
    .select('email,tier,status')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data && data.status === 'active' ? (data as Access) : null;
}

/** For API routes: returns the entitled user, or null if not signed in / not entitled. */
export async function requireAccess(): Promise<{ user: SessionUser; access: Access } | null> {
  const user = await getUser();
  if (!user) return null;
  const access = await getAccess(user.email);
  if (!access) return null;
  return { user, access };
}
