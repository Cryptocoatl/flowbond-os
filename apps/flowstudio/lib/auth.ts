import { getMyIdentity, getProfileById, type FbidIdentity } from '@flowbond/auth/identity';
import { dbRead } from './supabase-admin';
import { serverClient } from './supabase-server';

/** The signed-in FBID. This is `auth.uid()` (== flowbond_users.id), which is the
 *  exact key every flowstudio RLS policy + FK uses (owner_fbid, contributor_fbid,
 *  editor_fbid …). We deliberately do NOT use current_fbid()/the identity id here,
 *  because that can differ from auth.uid() and would break ownership matching. */
export async function myFbid(): Promise<string | null> {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

/** The signed-in identity row, or null. */
export async function myIdentity(): Promise<FbidIdentity | null> {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  try {
    return await getMyIdentity(sb);
  } catch {
    return null;
  }
}

/** Best-effort display name (handle → name → short fbid) for a contributor/editor. */
export async function displayNameFor(fbid: string): Promise<string> {
  try {
    const p = (await getProfileById(dbRead(), fbid)) as Record<string, unknown> | null;
    const h = p?.handle as string | undefined;
    const n = (p?.display_name as string | undefined) ?? (p?.name as string | undefined);
    if (h) return `@${h}`;
    if (n) return n;
  } catch {
    /* fall through */
  }
  return fbid.slice(0, 8);
}
