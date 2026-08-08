/**
 * The key.
 *
 * Vandana opens the room with her name and a four-digit key. From inside, she
 * mints keys for her own people at a chosen permission and copies the link
 * straight to them; when they open it the vault greets them by her name
 * before asking for theirs.
 *
 * ⚠️ Be clear-eyed about what this is: a *capability link*, not authentication.
 * Anyone holding the URL can open the room at the permission baked into it,
 * and the four-digit key is a ceremony rather than a secret. That is the right
 * trade for a warm proposal you want a crew to walk into without friction —
 * but if this ever needs to be genuinely private, the email-OTP gate and the
 * Supabase row-level rules are already written and switch on underneath it.
 */

export type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface Session {
  name: string;
  role: Role;
  /** Who handed over the key. Absent for the owner. */
  from?: string;
  /** The signed key they arrived on. Absent for the owner. */
  token?: string;
  /** The owner's four digits, so her writes can be authorised. */
  key?: string;
}

export const OWNER_NAME = 'vandana';
export const OWNER_KEY = '1440';

export const ROLE_LABELS: Record<Exclude<Role, 'owner'>, { label: string; detail: string }> = {
  editor: { label: 'Editor', detail: 'Can mark every block and join every thread' },
  commenter: { label: 'Commenter', detail: 'Can comment, but cannot mark blocks' },
  viewer: { label: 'Viewer', detail: 'Can read the whole flow, and nothing else' },
};

export const can = (role: Role) => ({
  mark: role === 'owner' || role === 'editor',
  comment: role !== 'viewer',
  invite: role === 'owner',
});

/* ------------------------------------------------------------------ */
/* Key tokens                                                          */
/* ------------------------------------------------------------------ */

const b64u = {
  encode: (s: string) =>
    btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (s: string) =>
    decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};

export interface KeyPayload {
  /** Who is handing the key over. */
  f: string;
  /** Role granted. */
  r: Exclude<Role, 'owner'>;
}

/**
 * Read the display half of a signed key (`<payload>.<mac>`).
 * The signature is verified by the Worker and never here — a client that
 * decides whether its own key is valid is not a security boundary.
 */

export function readKey(token: string | null): KeyPayload | null {
  if (!token) return null;
  try {
    const p = JSON.parse(b64u.decode(token.split('.')[0])) as KeyPayload;
    if (!p?.f || !['editor', 'commenter', 'viewer'].includes(p.r)) return null;
    return p;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'flowroom.1mwd.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* private browsing — the room still opens, it just forgets. */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Annotations, held locally until the database is switched on          */
/* ------------------------------------------------------------------ */

const NOTES_KEY = 'flowroom.1mwd.notes';

export interface LocalNotes {
  marks: Record<string, string>;
  comments: Record<string, { id: string; body: string; who: string; at: string }[]>;
}

export function loadNotes(): LocalNotes {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) return JSON.parse(raw) as LocalNotes;
  } catch {
    /* fall through */
  }
  return { marks: {}, comments: {} };
}

export function saveNotes(n: LocalNotes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(n));
  } catch {
    /* ignore */
  }
}
