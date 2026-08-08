// =============================================================================
// kai-room — the party server for Kai World co-op.
//
// One Durable Object per room code. It does three jobs:
//   1. presence + position relay, so two players see each other in one world
//   2. referee for the SHARED mission state (co-op, never competitive: whatever
//      one of you picks up counts for both, and only the DO advances a mission)
//   3. signalling relay for the WebRTC voice call — the audio itself is
//      peer-to-peer and never touches this Worker
//
// Deliberately stateless beyond the room: no accounts, no database, no logs of
// what anyone said. A room evaporates when the last player leaves.
// =============================================================================
import { MAX_MEMBERS, normalizeCode, type BuiltProp, type ClientMsg, type Member, type ServerMsg, type Shared } from './protocol';

export interface Env {
  ROOM: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
}

/** SDP blobs are the big ones; anything past this is not a real game message. */
const MAX_MSG_BYTES = 24_000;

/** Creations kept per world. Old ones fall off the front rather than growing forever. */
const MAX_BUILDS_PER_WORLD = 300;

function allowed(env: Env, origin: string | null): boolean {
  const list = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  if (!origin) return false;
  return list.includes(origin);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'kai-room' }), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }

    // /room/<CODE> — WebSocket upgrade
    const m = url.pathname.match(/^\/room\/([A-Za-z0-9]{4})$/);
    if (!m) return new Response('not found', { status: 404 });

    const code = normalizeCode(m[1]);
    if (!code) return new Response('bad room code', { status: 400 });

    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    if (!allowed(env, req.headers.get('Origin'))) {
      return new Response('origin not allowed', { status: 403 });
    }

    const id = env.ROOM.idFromName(code);
    return env.ROOM.get(id).fetch(req);
  },
};

export class KaiRoom implements DurableObject {
  private ctx: DurableObjectState;
  private shared: Shared = { w: 'selva', mi: 0, col: [], by: {} };
  /** what the party has built, per world id */
  private builds: Record<string, BuiltProp[]> = {};
  private seq = 0;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
    ctx.blockConcurrencyWhile(async () => {
      const s = await ctx.storage.get<Shared>('shared');
      if (s) this.shared = s;
      const b = await ctx.storage.get<Record<string, BuiltProp[]>>('builds');
      if (b) this.builds = b;
    });
  }

  async fetch(req: Request): Promise<Response> {
    if (this.ctx.getWebSockets().length >= MAX_MEMBERS) {
      return new Response('room full', { status: 503 });
    }
    const code = new URL(req.url).pathname.split('/').pop() ?? '';
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Hibernation API: the DO can be evicted between messages and the socket
    // survives, so a paused game doesn't burn duration charges.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      id: `p${++this.seq}_${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      avatar: 'proc:kai',
      voice: false,
      room: code.toUpperCase(),
      joined: false,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ---- socket plumbing ------------------------------------------------------
  private att(ws: WebSocket) {
    return ws.deserializeAttachment() as Member & { room: string; joined: boolean };
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket already gone */
    }
  }

  private broadcast(msg: ServerMsg, except?: WebSocket) {
    const raw = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(raw);
      } catch {
        /* socket already gone */
      }
    }
  }

  /** Everyone who has finished the handshake, as public Member records. */
  private roster(): Member[] {
    return this.ctx
      .getWebSockets()
      .map((ws) => this.att(ws))
      .filter((a) => a.joined)
      .map(({ id, name, avatar, voice }) => ({ id, name, avatar, voice }));
  }

  private async setShared(next: Shared) {
    const worldChanged = next.w !== this.shared.w;
    this.shared = next;
    await this.ctx.storage.put('shared', next);
    this.broadcast({ t: 's', s: next });
    // Arriving in a new world, everyone needs to see what is already built there.
    if (worldChanged) this.broadcast({ t: 'built', w: next.w, list: this.builds[next.w] ?? [] });
  }

  private async saveBuilds() {
    await this.ctx.storage.put('builds', this.builds);
  }

  // ---- message handling -----------------------------------------------------
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG_BYTES) return;

    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }

    const a = this.att(ws);

    // Nothing but `hello` is accepted before the handshake.
    if (!a.joined && msg.t !== 'hello') return;

    switch (msg.t) {
      case 'hello': {
        if (a.joined) return;
        const empty = this.roster().length === 0;
        const next = {
          ...a,
          name: String(msg.name ?? '').slice(0, 16) || 'Guardián',
          avatar: String(msg.avatar ?? 'proc:kai').slice(0, 200),
          joined: true,
        };
        ws.serializeAttachment(next);

        // First one in sets where the party is; everyone after adopts it, so a
        // kid who joins lands exactly where the grown-up already is.
        if (empty) {
          await this.setShared({ w: String(msg.w ?? 'selva'), mi: Number(msg.mi) || 0, col: [], by: {} });
        }

        const me: Member = { id: next.id, name: next.name, avatar: next.avatar, voice: next.voice };
        this.send(ws, { t: 'welcome', you: me.id, room: a.room, members: this.roster().filter((r) => r.id !== me.id), s: this.shared });
        this.send(ws, { t: 'built', w: this.shared.w, list: this.builds[this.shared.w] ?? [] });
        this.broadcast({ t: 'join', m: me }, ws);
        return;
      }

      case 'pos':
        // Hot path: relayed as-is, never stored, never persisted.
        this.broadcast({ t: 'pos', id: a.id, p: msg.p, f: msg.f, m: msg.m }, ws);
        return;

      case 'world': {
        const w = String(msg.w ?? '');
        if (!w || w === this.shared.w) return;
        await this.setShared({ w, mi: Number(msg.mi) || 0, col: [], by: {} });
        return;
      }

      case 'collect': {
        // Stale message from a player still on the previous mission: ignore.
        if (msg.w !== this.shared.w || msg.mi !== this.shared.mi) return;
        const id = Number(msg.id);
        if (!Number.isInteger(id) || id < 0 || id > 999) return;
        if (this.shared.col.includes(id)) return;
        await this.setShared({
          ...this.shared,
          col: [...this.shared.col, id],
          by: { ...this.shared.by, [a.id]: (this.shared.by[a.id] ?? 0) + 1 },
        });
        return;
      }

      case 'done': {
        // The referee call: only the DO advances, so simultaneous reports from
        // both players still move the party exactly one mission forward.
        if (msg.w !== this.shared.w || msg.mi !== this.shared.mi) return;
        await this.setShared({ w: this.shared.w, mi: this.shared.mi + 1, col: [], by: {} });
        return;
      }

      case 'sig': {
        const to = String(msg.to ?? '');
        for (const peer of this.ctx.getWebSockets()) {
          if (this.att(peer).id === to) {
            this.send(peer, { t: 'sig', from: a.id, d: msg.d });
            break;
          }
        }
        return;
      }

      case 'build': {
        const b = msg.b;
        if (!b || typeof b.id !== 'string' || typeof b.kind !== 'string') return;
        if (!Number.isFinite(b.x) || !Number.isFinite(b.z) || !Number.isFinite(b.rot)) return;
        const w = this.shared.w;
        const list = this.builds[w] ?? [];
        if (list.some((p) => p.id === b.id)) return;
        const item: BuiltProp = {
          id: b.id.slice(0, 40),
          by: a.id,
          kind: b.kind.slice(0, 24),
          // Same clamp the client uses, enforced here so a bad client can't
          // scatter props outside the world.
          x: Math.max(-150, Math.min(150, b.x)),
          z: Math.max(-150, Math.min(150, b.z)),
          rot: b.rot,
        };
        this.builds[w] = [...list, item].slice(-MAX_BUILDS_PER_WORLD);
        await this.saveBuilds();
        this.broadcast({ t: 'build1', w, b: item });
        return;
      }

      case 'unbuild': {
        // You can only take back your OWN creations.
        const w = this.shared.w;
        const list = this.builds[w] ?? [];
        const id = String(msg.id ?? '');
        const target = list.find((p) => p.id === id && p.by === a.id);
        if (!target) return;
        this.builds[w] = list.filter((p) => p !== target);
        await this.saveBuilds();
        this.broadcast({ t: 'unbuilt', w, id: target.id });
        return;
      }

      case 'buildclear': {
        // Clearing wipes only what YOU placed — a teammate's work is never
        // collateral damage.
        const w = this.shared.w;
        const list = this.builds[w] ?? [];
        this.builds[w] = list.filter((p) => p.by !== a.id);
        await this.saveBuilds();
        this.broadcast({ t: 'built', w, list: this.builds[w] });
        return;
      }

      case 'voice': {
        const on = !!msg.on;
        ws.serializeAttachment({ ...a, voice: on });
        this.broadcast({ t: 'voice', id: a.id, on });
        return;
      }

      case 'emote':
        this.broadcast({ t: 'emote', id: a.id, e: String(msg.e ?? '').slice(0, 8) });
        return;
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.departed(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.departed(ws);
  }

  private departed(ws: WebSocket) {
    const a = this.att(ws);
    if (a?.joined) this.broadcast({ t: 'leave', id: a.id }, ws);
  }
}
