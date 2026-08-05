'use client';

import { browserClient } from './supabase-browser';
import type { Nodo } from './nodos';

/**
 * /admin data layer.
 *
 * Every call goes through a SECURITY DEFINER RPC that re-checks the caller's
 * role in the database. Nothing here is trusted client-side: hiding a button
 * is a courtesy, the RPC is the actual gate.
 */

export const MEDIA_BUCKET = 'reciprociudad-media';

export type Me = {
  fbid: string;
  email: string;
  nombre: string | null;
  rol: 'super_admin' | 'editor';
  is_editor: boolean;
  is_super: boolean;
};

export type HistoryRow = {
  id: number;
  key: string;
  old_value: string | null;
  new_value: string | null;
  actor_email: string | null;
  at: string;
};

export type AdminIniciativa = {
  id: string;
  kind: string;
  k: string;
  title: string;
  description: string;
  slot: number;
  published: boolean;
};

export type AdminNodo = Nodo & { status: string; created_at: string };

export type AdminUser = {
  fbid: string;
  email: string;
  nombre: string | null;
  rol: string;
  activo: boolean;
  created_at: string;
};

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await browserClient().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Who am I, as far as the database is concerned? `null` = not an editor. */
export async function whoAmI(): Promise<Me | null> {
  const rows = await call<Me[]>('reciprociudad_me');
  return rows?.[0] ?? null;
}

// ── Copy ────────────────────────────────────────────────────────────────────
export async function loadOverrides(): Promise<Record<string, string>> {
  const rows = await call<{ key: string; value: string }[]>('reciprociudad_content_public');
  return Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
}

export const setCopy = (key: string, value: string) =>
  call<void>('reciprociudad_content_set', { p_key: key, p_value: value });

export const resetCopy = (key: string) =>
  call<void>('reciprociudad_content_reset', { p_key: key });

export const history = (key?: string, limit = 60) =>
  call<HistoryRow[]>('reciprociudad_content_history', { p_key: key ?? null, p_limit: limit });

// ── Media ───────────────────────────────────────────────────────────────────
export async function loadMedia(): Promise<Record<string, string>> {
  const rows = await call<{ slot: string; url: string }[]>('reciprociudad_media_public');
  return Object.fromEntries((rows ?? []).map((r) => [r.slot, r.url]));
}

export const setMedia = (slot: string, url: string, path?: string) =>
  call<void>('reciprociudad_media_set', { p_slot: slot, p_url: url, p_path: path ?? null });

export const resetMedia = (slot: string) =>
  call<void>('reciprociudad_media_reset', { p_slot: slot });

/** Upload to the public bucket and return the public URL. */
export async function uploadImage(slot: string, file: File): Promise<{ url: string; path: string }> {
  const sb = browserClient();
  const ext = (file.name.split('.').pop() ?? 'webp').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `site/${slot.replace(/[^a-z0-9.-]/gi, '_')}-${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// ── Iniciativas ─────────────────────────────────────────────────────────────
export const listIniciativas = () => call<AdminIniciativa[]>('reciprociudad_iniciativas_all');

export const saveIniciativa = (i: Omit<AdminIniciativa, 'id'> & { id: string | null }) =>
  call<string>('reciprociudad_iniciativa_upsert', {
    p_id: i.id,
    p_kind: i.kind,
    p_k: i.k,
    p_title: i.title,
    p_description: i.description,
    p_slot: i.slot,
    p_published: i.published,
  });

export const deleteIniciativa = (id: string) =>
  call<void>('reciprociudad_iniciativa_delete', { p_id: id });

// ── Red viva ────────────────────────────────────────────────────────────────
export const listNodes = () => call<AdminNodo[]>('reciprociudad_nodes_admin_list');

/** 'draft' = registered but not shown on the site. Owners create nodes 'published'. */
export const setNodeStatus = (id: string, status: 'published' | 'draft') =>
  call<void>('reciprociudad_node_set_status', { p_id: id, p_status: status });

export const editNode = (n: AdminNodo) =>
  call<void>('reciprociudad_node_admin_edit', {
    p_id: n.id,
    p_name: n.name,
    p_kind: n.kind,
    p_description: n.description,
    p_lat: n.lat,
    p_lng: n.lng,
    p_offers: n.offers,
    p_needs: n.needs,
    p_contact: n.contact ?? null,
  });

// ── Equipo (super admin) ────────────────────────────────────────────────────
export const listAdmins = () => call<AdminUser[]>('reciprociudad_admins_list');

export const grantAdmin = (email: string, rol: 'editor' | 'super_admin', nombre?: string) =>
  call<string>('reciprociudad_admin_grant', {
    p_email: email,
    p_rol: rol,
    p_nombre: nombre ?? null,
  });

export const setAdminActive = (fbid: string, activo: boolean) =>
  call<void>('reciprociudad_admin_set_active', { p_fbid: fbid, p_activo: activo });

/** Ask the site to re-render now, so an edit is live in seconds, not minutes. */
export async function pushLive(): Promise<void> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  try {
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* the 30s ISR window still picks it up */
  }
}
