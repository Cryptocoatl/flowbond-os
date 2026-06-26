# ClaudIA always-on node — runbook

A persistent ClaudIA that lives 24/7 and serves your private membership across
**every messaging platform**, unified through a self-hosted **Matrix** hub.
Hybrid posture: one hardened managed instance now, architected so each member
can run their **own node** later (the sovereign / DAO shape).

```
WhatsApp ─┐
Telegram ─┤   mautrix bridges   ┌─ Matrix homeserver (conduwuit) ─┐
Signal  ──┼───────────────────▶ │  one room per chat              │──▶ ClaudIA node
Instagram ┘                     └─────────────────────────────────┘     (this service)
                                                                          │
                       member gate (FBID + tier)  ◀── Supabase (service role, authz only)
                       her voice (Anthropic ZDR)
```

## The three tiers of presence (be honest about this)

| Tier | What | Privacy |
|---|---|---|
| **Sealed vault** | sacred memory/tasks/notes | zero-knowledge — keys only on the member's device |
| **Private relay** | her web chat | no-log, no-train, ZDR |
| **Always-on node** (this) | lives 24/7, holds the messaging connections | **private but NOT zero-knowledge** — it processes plaintext for the channels it serves (the price of being always-on). Isolated instance, ZDR, no-training, **no transcript persisted** by the node (context is memory-only). |

The node never reads the sealed vault. Durable memory still belongs to the
vault (written from the member's device) — wiring a node→vault memory bridge is
a deliberate future step, not a silent one.

## 1. Database

Apply migration **`0010_flowbond_channels.sql`** (after `0007`). It maps a
platform identity → FBID and is gated to the **service role** for the node.
Validated (rolled-back transaction) against the canonical project.

## 2. Stand up the Matrix hub

Two shapes — pick one:

- **Single box (simplest):** a small VPS (Hetzner CX22 ~€4/mo, or similar). Use
  `infra/docker-compose.yml` (conduwuit + bridges + node). Put **Caddy** in front
  of conduwuit for automatic TLS on `matrix.your-domain.tld`.
- **Fly.io (managed, node-ready):** run conduwuit + each bridge as their own Fly
  apps; deploy this node with `fly deploy` using `fly.toml` (one always-on
  machine, `512mb`, a `claudia_data` volume — never scale to zero).

## 3. Create ClaudIA's bot user

On the homeserver, create a user `@claudia:your-domain.tld`, log in once, and
copy its **access token** → `MATRIX_ACCESS_TOKEN`. Set `MATRIX_HOMESERVER_URL`.

## 4. Wire the bridges (WhatsApp + Telegram first)

Each `mautrix` bridge generates an **appservice registration** on first run;
point conduwuit at it (mounted `./registrations`), restart, then:

- **WhatsApp:** DM the bridge bot `login`, scan the **QR** with WhatsApp →
  Linked Devices. Your WhatsApp chats now appear as Matrix rooms.
- **Telegram:** DM the bridge bot `login`, follow the phone/code (or bot-token)
  flow. (Create a Telegram API id/hash at https://my.telegram.org.)

Invite `@claudia` into the bridged rooms you want her in (or set the bridge to
auto-invite her). She auto-joins (AutojoinRoomsMixin).

> Signal / Instagram / Discord: add `mautrix-signal`, `mautrix-meta`,
> `mautrix-discord` the same way — the node already speaks the unified Matrix
> layer, so no node changes are needed.

## 5. Env + run

Copy `.env.example` → `.env`, fill it in (Matrix token, Supabase **service
role**, Anthropic key), then:

```
# single box
cd infra && docker compose up -d --build
# or Fly
fly deploy
```

## 6. How a member links a channel

1. In their ClaudIA dashboard, mint a code: `select claudia_new_channel_code();`
   (wire a "Link a channel" button to this RPC).
2. They send that 8-char code to ClaudIA from WhatsApp/Telegram.
3. The node redeems it (`claudia_redeem_channel_code`, service role) → binds
   that platform identity to their FBID. From then on she knows them everywhere,
   gated by their tier (`free` chats; `plus`/`pro` unlock more as you wire it).

Non-members get a warm onboarding reply, never served silently.

## Cost (rough)

VPS + Matrix + bridges + node: **~$5–15/mo** infra (Hetzner) or **~$10–25/mo**
(Fly), plus Anthropic usage. Comfortably under ~$80/mo for a small membership.

## What's deliberately NOT done yet

- **E2E-encrypted Matrix rooms:** the scaffold serves plaintext rooms; turning
  on the bot's crypto store (rust-sdk) is a follow-up.
- **node → sealed-vault memory bridge:** durable memory still flows through the
  member's device. Honest by design.
- **per-member self-hosted nodes:** the architecture supports it; the managed
  instance ships first.
- This service is a **deploy-time scaffold** — `npm install` + run it on the
  node; it isn't part of the Next app's typecheck/build.
