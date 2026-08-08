'use client';
// =============================================================================
// useParty — the React face of co-op.
//
// Owns the room socket and the voice call, and exposes only what the UI needs
// to re-render on: who is here, what the party's shared mission state is, and
// whether the mic is live. Positions stay out of React entirely (see room.ts).
//
// Co-op here is cooperative by construction: there is one shared objective set
// for the party, so anything either player picks up counts for both. Nobody can
// "win" a mission away from the other.
// =============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RoomClient, type RoomStatus } from '@/lib/net/room';
import { VoiceClient, type VoiceState } from '@/lib/net/voice';
import { makeCode, normalizeCode, type BuiltProp, type Member, type Shared } from '@/lib/net/protocol';

const KEY = 'kai.party.v1';

interface Saved {
  code: string;
  name: string;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>;
      return { code: normalizeCode(s.code ?? '') ?? '', name: (s.name ?? '').slice(0, 16) };
    }
  } catch {
    /* SSR / privacy mode */
  }
  return { code: '', name: '' };
}

export interface Party {
  /** false until the saved code/name have been read out of localStorage */
  ready: boolean;
  status: RoomStatus;
  /** the room code we're in (or the last one used), for the invite card */
  code: string;
  /** our own member id — '' until the handshake lands */
  you: string;
  /** the OTHER players; never includes you */
  members: Member[];
  /** party mission state, or null when playing solo */
  shared: Shared | null;
  /** true once at least one other player is in the room with us */
  together: boolean;
  name: string;
  setName: (n: string) => void;
  join: (code: string, name: string, avatar: string, w: string, mi: number) => void;
  leave: () => void;
  /** a fresh code to read out loud to the other player */
  suggestCode: () => string;
  voice: VoiceState;
  toggleMic: () => void;
  /** last emoji anyone sent, with a nonce so repeats still animate */
  lastEmote: { id: string; e: string; n: number } | null;
  sendEmote: (e: string) => void;
  /** the live client — for the 3D scene and for sending mission events */
  room: RoomClient | null;
  /** live speaking level 0..1 per member id; read per frame, never in render */
  levels: Map<string, number>;
  /** everything the party has built in the current world (yours included) */
  built: BuiltProp[];
}

const NO_LEVELS = new Map<string, number>();

export function useParty(): Party {
  const roomRef = useRef<RoomClient | null>(null);
  const voiceRef = useRef<VoiceClient | null>(null);

  const [status, setStatus] = useState<RoomStatus>('off');
  const [code, setCode] = useState('');
  const [you, setYou] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [shared, setShared] = useState<Shared | null>(null);
  const [name, setNameState] = useState('');
  const [voice, setVoice] = useState<VoiceState>('off');
  const [lastEmote, setLastEmote] = useState<{ id: string; e: string; n: number } | null>(null);
  const [built, setBuilt] = useState<BuiltProp[]>([]);
  // Bumped whenever the underlying clients are swapped, so the memo below hands
  // the scene the CURRENT RoomClient instead of a stale ref read.
  const [session, setSession] = useState(0);
  const emoteN = useRef(0);
  const knownIds = useRef<Set<string>>(new Set());

  const [ready, setReady] = useState(false);

  // restore the family's room code + name
  useEffect(() => {
    const s = load();
    setCode(s.code);
    setNameState(s.name);
    setReady(true);
  }, []);

  const persist = useCallback((next: Partial<Saved>) => {
    try {
      const cur = load();
      localStorage.setItem(KEY, JSON.stringify({ ...cur, ...next }));
    } catch {
      /* ignore */
    }
  }, []);

  const setName = useCallback(
    (n: string) => {
      const clean = n.slice(0, 16);
      setNameState(clean);
      persist({ name: clean });
    },
    [persist],
  );

  const join = useCallback(
    (rawCode: string, playerName: string, avatar: string, w: string, mi: number) => {
      const c = normalizeCode(rawCode);
      if (!c) return;

      // Tear down any previous session before opening a new one.
      voiceRef.current?.destroy();
      roomRef.current?.close();
      knownIds.current = new Set();

      const room = new RoomClient();
      const vc = new VoiceClient(room);
      roomRef.current = room;
      voiceRef.current = vc;

      vc.onState = (s) => setVoice(s);

      room.on('status', (s) => setStatus(s));
      room.on('roster', (ms, myId) => {
        setMembers([...ms]);
        setYou(myId);
        // Reach out to newcomers, hang up on leavers.
        const now = new Set(ms.map((m) => m.id));
        for (const id of now) if (!knownIds.current.has(id)) vc.greet(id);
        for (const id of knownIds.current) if (!now.has(id)) vc.drop(id);
        knownIds.current = now;
      });
      room.on('shared', (s) => setShared({ ...s }));
      room.on('built', (list) => setBuilt([...list]));
      room.on('signal', (from, d) => void vc.onSignal(from, d));
      room.on('emote', (id, e) => setLastEmote({ id, e, n: ++emoteN.current }));

      const finalName = playerName.slice(0, 16) || 'Guardián';
      setName(finalName);
      setCode(c);
      persist({ code: c, name: finalName });
      setSession((n) => n + 1);
      room.connect(c, { name: finalName, avatar, w, mi });
    },
    [persist, setName],
  );

  const leave = useCallback(() => {
    voiceRef.current?.destroy();
    roomRef.current?.close();
    voiceRef.current = null;
    roomRef.current = null;
    knownIds.current = new Set();
    setMembers([]);
    setShared(null);
    setBuilt([]);
    setYou('');
    setStatus('off');
    setVoice('off');
    setSession((n) => n + 1);
  }, []);

  const toggleMic = useCallback(() => {
    const vc = voiceRef.current;
    if (!vc) return;
    if (vc.state === 'on') vc.stop();
    else void vc.start();
  }, []);

  const sendEmote = useCallback((e: string) => {
    roomRef.current?.send({ t: 'emote', e });
    setLastEmote({ id: 'you', e, n: ++emoteN.current });
  }, []);

  const suggestCode = useCallback(() => code || makeCode(), [code]);

  // Leave cleanly on unmount so the other player sees us go instead of timing out.
  useEffect(
    () => () => {
      voiceRef.current?.destroy();
      roomRef.current?.close();
    },
    [],
  );

  return useMemo(
    () => ({
      ready,
      status,
      code,
      you,
      members,
      shared,
      together: members.length > 0,
      name,
      setName,
      join,
      leave,
      suggestCode,
      voice,
      toggleMic,
      lastEmote,
      sendEmote,
      room: roomRef.current,
      levels: voiceRef.current?.levels ?? NO_LEVELS,
      built,
    }),
    // `session` is what makes the two refs above safe to read here.
    [session, ready, status, code, you, members, shared, built, name, setName, join, leave, suggestCode, voice, toggleMic, lastEmote, sendEmote],
  );
}
