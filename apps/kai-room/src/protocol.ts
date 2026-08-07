// =============================================================================
// Kai World party protocol — the wire format between the game client and the
// KaiRoom Durable Object.
//
// Keys are short on purpose: the `pos` message goes out ~12×/second per player,
// so every byte is paid for on a phone's mobile data.
//
// ⚠️ This file is mirrored at apps/play/lib/net/protocol.ts. Change both.
// =============================================================================

/** A player in the room, as everyone else sees them. */
export interface Member {
  /** server-assigned, unique for the life of the connection */
  id: string;
  /** display name the player typed ("Kai", "Papá") */
  name: string;
  /** avatar url — 'proc:kai' or a GLB path; others render the same avatar */
  avatar: string;
  /** true while their microphone is live */
  voice: boolean;
}

/**
 * The party's shared mission state. The Durable Object is the referee: only it
 * advances the mission, so two players collecting the last objective at the
 * same instant can never double-advance.
 */
export interface Shared {
  /** world id the whole party is in — travelling is a group action */
  w: string;
  /** index of the active mission inside that world */
  mi: number;
  /** objective indices already collected, by anyone */
  col: number[];
  /** how many objectives each member has collected this mission */
  by: Record<string, number>;
}

// ---- client → server --------------------------------------------------------
export type ClientMsg =
  /** first message; the first player into an empty room sets where the party starts */
  | { t: 'hello'; name: string; avatar: string; w: string; mi: number }
  /** position broadcast: [x,y,z], facing, moving */
  | { t: 'pos'; p: [number, number, number]; f: number; m: 0 | 1 }
  /** take the whole party to another world */
  | { t: 'world'; w: string; mi: number }
  /** an objective was picked up */
  | { t: 'collect'; w: string; mi: number; id: number }
  /** the active mission's goal is met (server verifies it is still current) */
  | { t: 'done'; w: string; mi: number }
  /** WebRTC offer/answer/ICE, relayed verbatim to one peer */
  | { t: 'sig'; to: string; d: unknown }
  /** microphone turned on/off */
  | { t: 'voice'; on: boolean }
  /** one-tap emoji, for when talking isn't happening */
  | { t: 'emote'; e: string };

// ---- server → client --------------------------------------------------------
export type ServerMsg =
  | { t: 'welcome'; you: string; room: string; members: Member[]; s: Shared }
  | { t: 'join'; m: Member }
  | { t: 'leave'; id: string }
  | { t: 'pos'; id: string; p: [number, number, number]; f: number; m: 0 | 1 }
  | { t: 's'; s: Shared }
  | { t: 'sig'; from: string; d: unknown }
  | { t: 'voice'; id: string; on: boolean }
  | { t: 'emote'; id: string; e: string }
  | { t: 'full' }
  | { t: 'err'; m: string };

/** Room codes a 7-year-old can read off a screen and type: no O/0, no I/1. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 4;
/** Small on purpose — this is a family room, not a lobby. */
export const MAX_MEMBERS = 6;

export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  if (c.length !== CODE_LEN) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}
