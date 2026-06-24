import { authClient } from './supabase/server';

export interface SessionUser {
  id: string;
  email: string | null;
}

/** The current FBID session user, or null if signed out. */
export async function getUser(): Promise<SessionUser | null> {
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
