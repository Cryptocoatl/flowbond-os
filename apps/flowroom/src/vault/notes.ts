import { loadNotes, saveNotes, type Session } from './session';
import type { MarkKey } from '@/content/types';

/**
 * Notes, wired.
 *
 * Every mark and every comment goes to the Worker, which writes it on
 * service_role — so what Vandana and her crew leave in the room actually
 * reaches Steph rather than dying in one browser's local storage.
 *
 * Local storage is still written on every change, but as a *safety net*
 * rather than the source of truth: if the network is down mid-flight, her
 * marks survive the tab closing and the room still shows them back to her.
 * The server is authoritative whenever it answers.
 */

export interface ServerNote {
  id: string;
  block_key: string;
  author: string;
  role: string;
  mark: MarkKey | null;
  body: string | null;
  created_at: string;
}

export interface NotesState {
  /** Every mark in the room, by block key then author. */
  marks: Record<string, Record<string, MarkKey>>;
  comments: Record<string, ServerNote[]>;
  /** False when the API is unreachable or unconfigured — the room says so. */
  online: boolean;
}

const empty = (): NotesState => ({ marks: {}, comments: {}, online: false });

function shape(notes: ServerNote[]): Omit<NotesState, 'online'> {
  const marks: NotesState['marks'] = {};
  const comments: NotesState['comments'] = {};
  for (const n of notes) {
    if (n.mark) {
      (marks[n.block_key] ??= {})[n.author] = n.mark;
    } else if (n.body) {
      (comments[n.block_key] ??= []).push(n);
    }
  }
  return { marks, comments };
}

/** What the Worker needs to know we are allowed to write. */
function credentials(session: Session) {
  const token = session.token;
  return token ? { token, name: session.name } : { name: session.name, key: session.key };
}

export async function fetchNotes(): Promise<NotesState> {
  try {
    const res = await fetch('/api/notes', { headers: { accept: 'application/json' } });
    const data = (await res.json()) as { ok: boolean; notes?: ServerNote[] };
    if (!data.ok || !data.notes) return { ...localFallback(), online: false };
    return { ...shape(data.notes), online: true };
  } catch {
    return { ...localFallback(), online: false };
  }
}

/** Everything this browser has said, in case the server never answered. */
function localFallback(): Omit<NotesState, 'online'> {
  const local = loadNotes();
  const marks: NotesState['marks'] = {};
  for (const [block, mark] of Object.entries(local.marks)) {
    marks[block] = { you: mark as MarkKey };
  }
  const comments: NotesState['comments'] = {};
  for (const [block, list] of Object.entries(local.comments)) {
    comments[block] = list.map((c) => ({
      id: c.id,
      block_key: block,
      author: c.who,
      role: 'guest',
      mark: null,
      body: c.body,
      created_at: c.at,
    }));
  }
  return { marks, comments };
}

export async function pushMark(
  session: Session,
  blockKey: string,
  mark: MarkKey | null,
): Promise<boolean> {
  // Local first, always — the net can fail, the note should not.
  const local = loadNotes();
  if (mark === null) delete local.marks[blockKey];
  else local.marks[blockKey] = mark;
  saveNotes(local);

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials(session), blockKey, mark }),
    });
    return ((await res.json()) as { ok: boolean }).ok;
  } catch {
    return false;
  }
}

export async function pushComment(
  session: Session,
  blockKey: string,
  body: string,
): Promise<ServerNote | null> {
  const local = loadNotes();
  const entry = {
    id: `${blockKey}:${Date.now()}`,
    body,
    who: session.name,
    at: new Date().toISOString(),
  };
  local.comments[blockKey] = [...(local.comments[blockKey] ?? []), entry];
  saveNotes(local);

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials(session), blockKey, body }),
    });
    const data = (await res.json()) as { ok: boolean; note?: ServerNote };
    return data.ok && data.note ? data.note : null;
  } catch {
    return null;
  }
}

export { empty as emptyNotes };
