import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

/**
 * FlowRoom API.
 *
 * Two jobs, and the second one is why this exists at all:
 *
 *  1. Sign and verify the keys. The vault link is a capability, so the only
 *     thing standing between a stranger and a write is whether their token
 *     was minted here. Tokens are HMAC-signed with a secret that never
 *     leaves the Worker; a hand-rolled one is rejected.
 *
 *  2. Carry the notes. `flowroom_notes` has RLS on and no policies, so the
 *     browser cannot touch it directly under any circumstances — every read
 *     and write goes through here on service_role, after the token checks out.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ROOM_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

const ROOM = 'shikibuntu';
const MARKS = ['agreed', 'question', 'already_have', 'different_timeline', 'not_this'];
const ROLES = ['owner', 'editor', 'commenter', 'viewer'] as const;
type Role = (typeof ROLES)[number];

/* ------------------------------------------------------------------ */
/* Signed keys                                                         */
/* ------------------------------------------------------------------ */

const b64u = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function sign(env: Env, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ROOM_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64u(mac).slice(0, 32);
}

/** `<base64url payload>.<mac>` — tamper with either half and it stops verifying. */
async function mint(env: Env, from: string, role: Role): Promise<string> {
  const body = btoa(JSON.stringify({ f: from, r: role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${body}.${await sign(env, body)}`;
}

async function verify(env: Env, token: string | undefined): Promise<{ f: string; r: Role } | null> {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = await sign(env, body);
  // Constant-time-ish: compare full strings of equal length.
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const p = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (!p?.f || !ROLES.includes(p.r)) return null;
    return p;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

const rest = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

const configured = (env: Env) =>
  Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.ROOM_SECRET);

/* ------------------------------------------------------------------ */
/* Open the vault                                                      */
/* ------------------------------------------------------------------ */

app.post('/open', async (c) => {
  if (!configured(c.env)) return c.json({ ok: false, offline: true });
  const { name, key, token } = await c.req
    .json<{ name?: string; key?: string; token?: string }>()
    .catch(() => ({}) as never);

  const who = (name ?? '').trim().slice(0, 80);
  if (!who) return c.json({ ok: false }, 400);

  // Arriving on someone else's key.
  if (token) {
    const p = await verify(c.env, token);
    if (!p) return c.json({ ok: false, reason: 'bad-key' }, 401);
    return c.json({ ok: true, name: who, role: p.r, from: p.f });
  }

  // The owner, with the four digits.
  if (who.toLowerCase() === 'gala' && (key ?? '').trim() === '0808') {
    return c.json({ ok: true, name: 'Gala', role: 'owner' as Role });
  }
  return c.json({ ok: false, reason: 'bad-key' }, 401);
});

/** Owner mints a key for their crew. Signed here, unforgeable there. */
app.post('/key', async (c) => {
  if (!configured(c.env)) return c.json({ ok: false, offline: true });
  const { name, key, role } = await c.req
    .json<{ name?: string; key?: string; role?: Role }>()
    .catch(() => ({}) as never);

  if ((name ?? '').trim().toLowerCase() !== 'gala' || (key ?? '').trim() !== '0808') {
    return c.json({ ok: false }, 401);
  }
  if (!role || !['editor', 'commenter', 'viewer'].includes(role)) return c.json({ ok: false }, 400);

  return c.json({ ok: true, token: await mint(c.env, 'Gala', role) });
});

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

app.get('/notes', async (c) => {
  if (!configured(c.env)) return c.json({ ok: false, offline: true, notes: [] });
  const res = await rest(
    c.env,
    `flowroom_notes?room_slug=eq.${ROOM}&deleted_at=is.null` +
      `&select=id,block_key,author,role,mark,body,created_at&order=created_at.asc`,
  );
  if (!res.ok) return c.json({ ok: false, notes: [] }, 502);
  return c.json({ ok: true, notes: await res.json() });
});

app.post('/notes', async (c) => {
  if (!configured(c.env)) return c.json({ ok: false, offline: true });

  const b = await c.req
    .json<{
      token?: string;
      name?: string;
      key?: string;
      blockKey?: string;
      mark?: string | null;
      body?: string;
    }>()
    .catch(() => ({}) as never);

  /* ---- who is asking, and are they allowed ---- */
  let role: Role | null = null;
  let author = (b.name ?? '').trim().slice(0, 80);
  let invitedBy: string | null = null;

  if (b.token) {
    const p = await verify(c.env, b.token);
    if (!p) return c.json({ ok: false }, 401);
    role = p.r;
    invitedBy = p.f;
  } else if (author.toLowerCase() === 'gala' && (b.key ?? '').trim() === '0808') {
    role = 'owner';
    author = 'Gala';
  }
  if (!role || !author) return c.json({ ok: false }, 401);
  if (role === 'viewer') return c.json({ ok: false, reason: 'read-only' }, 403);

  const blockKey = (b.blockKey ?? '').trim().slice(0, 120);
  if (!blockKey) return c.json({ ok: false }, 400);

  /* ---- a mark ---- */
  if (b.mark !== undefined) {
    if (role !== 'owner' && role !== 'editor') return c.json({ ok: false }, 403);

    // One mark per person per block: clear, then set. Cheaper and more
    // predictable than an upsert against a partial unique index.
    await rest(
      c.env,
      `flowroom_notes?room_slug=eq.${ROOM}&block_key=eq.${encodeURIComponent(blockKey)}` +
        `&author=eq.${encodeURIComponent(author)}&mark=not.is.null`,
      { method: 'DELETE' },
    );
    if (b.mark === null) return c.json({ ok: true });
    if (!MARKS.includes(b.mark)) return c.json({ ok: false }, 400);

    const res = await rest(c.env, 'flowroom_notes', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        room_slug: ROOM,
        block_key: blockKey,
        author,
        role,
        invited_by: invitedBy,
        mark: b.mark,
      }),
    });
    return c.json({ ok: res.ok }, res.ok ? 200 : 502);
  }

  /* ---- a comment ---- */
  const body = (b.body ?? '').trim().slice(0, 4000);
  if (!body) return c.json({ ok: false }, 400);

  const res = await rest(c.env, 'flowroom_notes', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      room_slug: ROOM,
      block_key: blockKey,
      author,
      role,
      invited_by: invitedBy,
      body,
    }),
  });
  if (!res.ok) return c.json({ ok: false }, 502);
  const [row] = (await res.json()) as unknown[];
  return c.json({ ok: true, note: row });
});

export const onRequest = handle(app);
