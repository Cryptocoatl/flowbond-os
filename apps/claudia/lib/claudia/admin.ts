'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · admin grants client  (lib/claudia/admin.ts)
//
//  Thin wrappers over the FBID-native grant spine (migration 0002). These run
//  as the signed-in FBID against the gated SECURITY DEFINER RPCs — the database
//  enforces that only the superadmin may grant/list. NONE of this touches the
//  zero-knowledge vault or the blind relay: admin commands are intercepted in
//  the chat box and executed here, so they never reach the LLM or any log.
// ════════════════════════════════════════════════════════════════════════

import { browserClient } from '../supabase';

export type GrantRole = 'viewer' | 'editor' | 'admin';
export interface Grant {
  id: string;
  grantee_fbid: string;
  grantor_fbid?: string;
  app_slug: string;
  page_path: string | null;
  role: string;
  granted_at: string;
}

const sb = () => browserClient();

async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

/** This session's FBID (= flowbond_users.id = auth.uid), or null if signed out. */
export async function myFbid(): Promise<string | null> {
  const { data } = await sb().auth.getUser();
  return data.user?.id ?? null;
}

export async function isSuperadmin(): Promise<boolean> {
  try { return (await rpc<boolean>('is_superadmin')) === true; } catch { return false; }
}

/** One-time root claim — succeeds only for the founder while no root exists. */
export async function claimRoot(): Promise<string> {
  return rpc<string>('claim_root_superadmin');
}

/** Grant an FBID access to an app (whole site if pagePath null). Superadmin only. */
export async function grantAccess(
  granteeFbid: string, appSlug: string, pagePath: string | null = null, role: GrantRole = 'admin',
): Promise<string> {
  return rpc<string>('grant_access', {
    p_grantee_fbid: granteeFbid, p_app_slug: appSlug, p_page_path: pagePath, p_role: role,
  });
}

export async function revokeAccess(grantId: string): Promise<void> {
  await rpc('revoke_access', { p_grant_id: grantId });
}

export async function listGrants(appSlug?: string): Promise<Grant[]> {
  return rpc<Grant[]>('list_grants', { p_app_slug: appSlug ?? null });
}

export async function myGrants(): Promise<Grant[]> {
  return rpc<Grant[]>('my_grants');
}

// ── empire "connect" — bind an app to ClaudIA via the grant spine ──────────
//  Connecting an app = granting THIS FBID admin over that app_slug. For the
//  super-admin this is the registry of "worlds ClaudIA organizes for me"; the
//  same rows authorize editing later (has_grant). Superadmin-gated by the RPC.

/** Connect (grant yourself admin over) an app by slug. Returns the grant id. */
export async function connectApp(appSlug: string): Promise<string> {
  const fbid = await myFbid();
  if (!fbid) throw new Error('not_authenticated');
  return grantAccess(fbid, appSlug, null, 'admin');
}

/** Disconnect an app you previously connected (revoke that grant). */
export async function disconnectApp(grantId: string): Promise<void> {
  return revokeAccess(grantId);
}

// ── /admin command interpreter ────────────────────────────────────────────
//  Returns a chat-ready reply string for any `/`-prefixed input, or null if
//  the text is NOT a command (so the normal relay turn proceeds). Pure text in,
//  text out — the caller shows the reply locally and never persists/relays it.

const HELP = [
  'Comandos de ClaudIA (solo para tu super-admin):',
  '  /whoami                          — muestra tu FBID y tu rol',
  '  /admin init                      — reclama el super-admin raíz (solo la fundadora, una vez)',
  '  /admin grant <fbid> <app> [page] [role]   — otorga acceso (role: viewer|editor|admin, default admin)',
  '  /admin revoke <grantId>          — revoca un acceso',
  '  /admin list [app]                — lista los accesos otorgados',
  'Ej: /admin grant 2f3a…e9 moonchurch /editar editor',
].join('\n');

export function isCommand(text: string): boolean {
  return /^\/(admin|whoami)\b/i.test(text.trim());
}

export async function runCommand(text: string): Promise<string> {
  const parts = text.trim().split(/\s+/);
  const head = parts[0].toLowerCase();

  if (head === '/whoami') {
    const fbid = await myFbid();
    if (!fbid) return 'No estás identificada. Inicia sesión con tu FBID primero.';
    const root = await isSuperadmin();
    return `Tu FBID:\n${fbid}\nRol: ${root ? 'super-admin (raíz) 👑' : 'usuaria'}`;
  }

  // everything below is /admin …
  const sub = (parts[1] || '').toLowerCase();

  if (!sub || sub === 'help') return HELP;

  if (sub === 'init') {
    try {
      const fbid = await claimRoot();
      return `Listo 👑 — eres la super-admin raíz del imperio.\nTu FBID: ${fbid}\nAhora puedes otorgar accesos con /admin grant.`;
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes('root_already_claimed')) return 'El super-admin raíz ya fue reclamado. Usa /whoami para ver tu rol.';
      if (m.includes('not_the_founder')) return 'Solo la fundadora puede reclamar el super-admin raíz.';
      return `No se pudo: ${m}`;
    }
  }

  // gate the rest on superadmin (the RPC also enforces it; this is for a clean message)
  if (!(await isSuperadmin())) {
    return 'No tienes permiso. Solo la super-admin puede usar /admin. (Tip: /whoami)';
  }

  if (sub === 'grant') {
    const [, , granteeFbid, app, maybePage, maybeRole] = parts;
    if (!granteeFbid || !app) return 'Uso: /admin grant <fbid> <app> [page] [role]';
    const roleSet = new Set(['viewer', 'editor', 'admin']);
    // role may be the 4th or 5th token; page is optional
    let page: string | null = null;
    let role: GrantRole = 'admin';
    if (maybePage && roleSet.has(maybePage.toLowerCase())) {
      role = maybePage.toLowerCase() as GrantRole;
    } else if (maybePage) {
      page = maybePage;
      if (maybeRole && roleSet.has(maybeRole.toLowerCase())) role = maybeRole.toLowerCase() as GrantRole;
    }
    try {
      const id = await grantAccess(granteeFbid, app, page, role);
      return `✅ Acceso otorgado.\n  FBID:  ${granteeFbid}\n  App:   ${app}${page ? `\n  Página: ${page}` : ' (sitio completo)'}\n  Rol:   ${role}\n  Grant: ${id}`;
    } catch (e) {
      return `No se pudo otorgar: ${(e as Error).message}`;
    }
  }

  if (sub === 'revoke') {
    const id = parts[2];
    if (!id) return 'Uso: /admin revoke <grantId>';
    try { await revokeAccess(id); return `🚫 Acceso revocado (${id}).`; }
    catch (e) { return `No se pudo revocar: ${(e as Error).message}`; }
  }

  if (sub === 'list') {
    try {
      const rows = await listGrants(parts[2]);
      if (!rows.length) return 'No hay accesos otorgados todavía.';
      const lines = rows.map(
        (g) => `• ${g.app_slug}${g.page_path ? g.page_path : ' (todo)'} — ${g.role}\n    fbid ${g.grantee_fbid}\n    grant ${g.id}`,
      );
      return `Accesos activos (${rows.length}):\n${lines.join('\n')}`;
    } catch (e) {
      return `No se pudo listar: ${(e as Error).message}`;
    }
  }

  return `Comando no reconocido. ${HELP}`;
}
