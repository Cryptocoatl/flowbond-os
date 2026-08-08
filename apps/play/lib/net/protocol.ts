// =============================================================================
// Kai World party protocol — client-side mirror.
//
// ⚠️ Mirrored from apps/kai-room/src/protocol.ts. Change both together; the
// Worker and the game must agree on every key or the party silently stops
// syncing. Keys are short because `pos` goes out ~12×/second per player.
// =============================================================================

export interface Member {
  id: string;
  name: string;
  avatar: string;
  voice: boolean;
}

export interface Shared {
  /** world id the whole party is in */
  w: string;
  /** active mission index inside that world */
  mi: number;
  /** objective indices collected by anyone */
  col: number[];
  /** objectives collected per member (for the "juntos" credit line) */
  by: Record<string, number>;
}

/** A creation placed in the world by one of the players. */
export interface BuiltProp {
  id: string;
  /** member id of whoever placed it */
  by: string;
  kind: string;
  x: number;
  z: number;
  rot: number;
}

export type ClientMsg =
  | { t: 'hello'; name: string; avatar: string; w: string; mi: number }
  | { t: 'pos'; p: [number, number, number]; f: number; m: 0 | 1 }
  | { t: 'world'; w: string; mi: number }
  | { t: 'collect'; w: string; mi: number; id: number }
  | { t: 'done'; w: string; mi: number }
  | { t: 'sig'; to: string; d: unknown }
  /** place a creation — the room keeps it so your teammate sees it too */
  | { t: 'build'; b: { id: string; kind: string; x: number; z: number; rot: number } }
  /** take back one of YOUR creations */
  | { t: 'unbuild'; id: string }
  /** take back all of YOUR creations in this world — never your teammate's */
  | { t: 'buildclear' }
  | { t: 'voice'; on: boolean }
  | { t: 'emote'; e: string };

export type ServerMsg =
  | { t: 'welcome'; you: string; room: string; members: Member[]; s: Shared }
  | { t: 'join'; m: Member }
  | { t: 'leave'; id: string }
  | { t: 'pos'; id: string; p: [number, number, number]; f: number; m: 0 | 1 }
  | { t: 's'; s: Shared }
  | { t: 'sig'; from: string; d: unknown }
  | { t: 'voice'; id: string; on: boolean }
  | { t: 'emote'; id: string; e: string }
  | { t: 'built'; w: string; list: BuiltProp[] }
  | { t: 'build1'; w: string; b: BuiltProp }
  | { t: 'unbuilt'; w: string; id: string }
  | { t: 'full' }
  | { t: 'err'; m: string };

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 4;

export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  if (c.length !== CODE_LEN) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** A fresh room code, using only characters a 7-year-old can read aloud. */
export function makeCode(): string {
  let out = '';
  const buf = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(buf);
  for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}
