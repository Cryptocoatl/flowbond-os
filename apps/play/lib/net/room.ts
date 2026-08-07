'use client';
// =============================================================================
// RoomClient — the game's connection to a party room.
//
// Deliberately NOT a React store. Positions arrive ~12×/second per player and
// are read once per animation frame by the 3D scene; pushing them through
// useState would re-render the whole HUD 12 times a second on a phone. So:
//
//   • hot data (positions)      → plain mutable Map, read in useFrame
//   • cold data (who's here)    → emitted as events, mirrored into React state
//
// The socket reconnects on its own with backoff, replaying the handshake, so a
// phone that locks its screen mid-mission rejoins the party on wake.
// =============================================================================
import type { ClientMsg, Member, ServerMsg, Shared } from './protocol';

/** A remote player as the scene needs them: where they are, and where they're headed. */
export interface Remote {
  id: string;
  /** latest authoritative position from the network */
  tx: number;
  ty: number;
  tz: number;
  /** smoothed position actually rendered (lerped toward t* each frame) */
  x: number;
  y: number;
  z: number;
  face: number;
  moving: boolean;
  /** ms timestamp of the last packet — used to fade out a dropped player */
  at: number;
}

export type RoomStatus = 'off' | 'connecting' | 'live' | 'closed' | 'error';

export interface RoomEvents {
  status: (s: RoomStatus, detail?: string) => void;
  roster: (members: Member[], you: string) => void;
  shared: (s: Shared) => void;
  signal: (from: string, data: unknown) => void;
  emote: (id: string, e: string) => void;
}

const POS_INTERVAL_MS = 80; // ~12 Hz
const POS_EPSILON = 0.03; // don't spend a packet on sub-centimetre drift

export function roomEndpoint(): string {
  const raw = process.env.NEXT_PUBLIC_KAI_ROOM_URL || 'https://kai-room.cryptocoatl101.workers.dev';
  return raw.replace(/^http/, 'ws').replace(/\/$/, '');
}

export class RoomClient {
  readonly remotes = new Map<string, Remote>();

  private ws: WebSocket | null = null;
  private handlers: Partial<RoomEvents> = {};
  private hello: ClientMsg & { t: 'hello' } = { t: 'hello', name: 'Guardián', avatar: 'proc:kai', w: 'selva', mi: 0 };
  private code = '';
  private retry = 0;
  private retryTimer: number | null = null;
  private closedByUs = false;

  private lastSent = 0;
  private lastPos: [number, number, number] = [0, 0, 0];
  private lastFace = 0;
  private lastMoving = false;

  you = '';
  members: Member[] = [];
  shared: Shared | null = null;
  status: RoomStatus = 'off';

  on<K extends keyof RoomEvents>(ev: K, fn: RoomEvents[K]) {
    this.handlers[ev] = fn;
  }

  private setStatus(s: RoomStatus, detail?: string) {
    this.status = s;
    this.handlers.status?.(s, detail);
  }

  connect(code: string, hello: Omit<ClientMsg & { t: 'hello' }, 't'>) {
    this.closedByUs = false;
    this.code = code;
    this.hello = { t: 'hello', ...hello };
    this.open();
  }

  /** Update what the handshake will say, so a reconnect lands in the right place. */
  syncHello(patch: Partial<Omit<ClientMsg & { t: 'hello' }, 't'>>) {
    this.hello = { ...this.hello, ...patch };
  }

  private open() {
    if (typeof window === 'undefined') return;
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${roomEndpoint()}/room/${this.code}`);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify(this.hello));
    };

    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data as string) as ServerMsg;
      } catch {
        return;
      }
      this.handle(msg);
    };

    ws.onclose = () => {
      this.ws = null;
      this.remotes.clear();
      if (this.closedByUs) {
        this.setStatus('closed');
        return;
      }
      this.scheduleRetry();
    };

    ws.onerror = () => {
      // `onclose` always follows, and that's where the retry lives.
      if (this.status === 'connecting') this.setStatus('error', 'no se pudo conectar');
    };
  }

  private scheduleRetry() {
    if (this.closedByUs || this.retryTimer !== null) return;
    this.setStatus('connecting');
    const wait = Math.min(8000, 500 * 2 ** this.retry++);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, wait);
  }

  private handle(msg: ServerMsg) {
    switch (msg.t) {
      case 'welcome':
        this.you = msg.you;
        this.members = msg.members;
        this.shared = msg.s;
        this.setStatus('live');
        this.handlers.roster?.(this.members, this.you);
        this.handlers.shared?.(msg.s);
        return;

      case 'join':
        if (!this.members.some((m) => m.id === msg.m.id)) this.members = [...this.members, msg.m];
        this.handlers.roster?.(this.members, this.you);
        return;

      case 'leave':
        this.members = this.members.filter((m) => m.id !== msg.id);
        this.remotes.delete(msg.id);
        this.handlers.roster?.(this.members, this.you);
        return;

      case 'pos': {
        const r = this.remotes.get(msg.id);
        if (r) {
          r.tx = msg.p[0];
          r.ty = msg.p[1];
          r.tz = msg.p[2];
          r.face = msg.f;
          r.moving = msg.m === 1;
          r.at = performance.now();
        } else {
          // First packet: snap, don't glide in from the origin.
          this.remotes.set(msg.id, {
            id: msg.id,
            tx: msg.p[0], ty: msg.p[1], tz: msg.p[2],
            x: msg.p[0], y: msg.p[1], z: msg.p[2],
            face: msg.f,
            moving: msg.m === 1,
            at: performance.now(),
          });
        }
        return;
      }

      case 's':
        this.shared = msg.s;
        this.handlers.shared?.(msg.s);
        return;

      case 'sig':
        this.handlers.signal?.(msg.from, msg.d);
        return;

      case 'voice':
        this.members = this.members.map((m) => (m.id === msg.id ? { ...m, voice: msg.on } : m));
        this.handlers.roster?.(this.members, this.you);
        return;

      case 'emote':
        this.handlers.emote?.(msg.id, msg.e);
        return;

      case 'full':
        this.closedByUs = true;
        this.setStatus('error', 'sala llena');
        return;

      case 'err':
        this.setStatus('error', msg.m);
        return;
    }
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /**
   * Called every frame by the scene. Rate-limits and dedupes internally, so the
   * caller never has to think about the network.
   */
  pushPos(x: number, y: number, z: number, face: number, moving: boolean) {
    if (this.status !== 'live') return;
    const now = performance.now();
    if (now - this.lastSent < POS_INTERVAL_MS) return;
    const [px, py, pz] = this.lastPos;
    const still =
      Math.abs(px - x) < POS_EPSILON &&
      Math.abs(py - y) < POS_EPSILON &&
      Math.abs(pz - z) < POS_EPSILON &&
      Math.abs(this.lastFace - face) < 0.02 &&
      this.lastMoving === moving;
    if (still) return;
    this.lastSent = now;
    this.lastPos = [x, y, z];
    this.lastFace = face;
    this.lastMoving = moving;
    this.send({ t: 'pos', p: [round(x), round(y), round(z)], f: round(face), m: moving ? 1 : 0 });
  }

  /** Smooth every remote toward its latest network position. Call once per frame. */
  interpolate(dt: number) {
    const k = Math.min(1, dt * 12);
    for (const r of this.remotes.values()) {
      r.x += (r.tx - r.x) * k;
      r.y += (r.ty - r.y) * k;
      r.z += (r.tz - r.z) * k;
    }
  }

  close() {
    this.closedByUs = true;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.remotes.clear();
    this.members = [];
    this.shared = null;
    this.you = '';
    this.setStatus('off');
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
