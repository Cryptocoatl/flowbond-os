# Kai World co-op — how to work on it

Two players, one world, one voice call. The pieces:

| where | what it does |
|---|---|
| `apps/kai-room` | Worker + one Durable Object per room code. Presence, the **shared mission state**, the party's creations, and WebRTC signalling relay. |
| `lib/net/protocol.ts` | the wire format. **Mirrored** at `apps/kai-room/src/protocol.ts` — change both or the party silently stops syncing. |
| `lib/net/room.ts` | the socket. Positions live in a mutable `Map` read in `useFrame`, never in React state. |
| `lib/net/voice.ts` | peer-to-peer WebRTC. Audio never touches our servers. |
| `components/game/useParty.ts` | the React face: who's here, shared state, mic. |
| `components/game/RemotePlayers.tsx` | teammates in the scene, and where `party` in `runtime.ts` is written. |
| `components/game/PartyLayer.tsx` | room pill, mic button, emotes, join panel. |

## Running it locally

```bash
# terminal 1 — the room server
cd apps/kai-room && pnpm dev            # :8788

# terminal 2 — the game, pointed at it
echo 'NEXT_PUBLIC_KAI_ROOM_URL=http://localhost:8788' > apps/play/.env.development.local
cd apps/play && pnpm dev                # :3070
```

⚠️ **Never put `NEXT_PUBLIC_KAI_ROOM_URL` in `.env.local`.** Next reads that file
during `next build` too, so `localhost` gets baked into the production bundle.
It belongs in `.env.development.local`. After any build, confirm:

```bash
grep -rl "localhost:8788" .open-next/assets   # must print nothing
```

## Testing

```bash
# the room server's rules — 27 checks, no browser needed
cd apps/kai-room && pnpm test ws://localhost:8788 XYZ4   # use a FRESH code each run

# the client, in two REAL Brave windows (headed, not headless)
cd apps/play && pnpm e2e:coop http://localhost:3070
cd apps/play && pnpm e2e:coop                            # against production
```

Neither can test the **voice call**: the microphone needs a human tap, HTTPS (or
localhost), and someone to listen. That one is always a real-device check.

## The rules the design rests on

- **One shared objective set.** Whatever either player picks up counts for both,
  and both earn the full XP. Nothing is ever taken from the other player.
- **The bond.** Within `BOND_RADIUS` (12 m, `runtime.ts`) a link forms, and the
  *last* objective of every mission stays sealed until it holds.
- **The Durable Object is the referee.** Only it advances a mission, so two
  players finishing on the same frame move the party forward exactly once.
- **You can only take back your own creations** — `clear` never touches a
  teammate's work.

## Known gaps, if you're picking this up

- Voice is STUN-only. On a symmetric-NAT network it will fail; a TURN relay
  drops in via `NEXT_PUBLIC_KAI_TURN` (JSON `RTCIceServer`) with no rebuild.
- A room's state lives in the Durable Object, not in Postgres — it is not tied
  to FBID and does not survive as a permanent "our world".
- Mission completion does not yet write to the `kai_` proof ledger.
