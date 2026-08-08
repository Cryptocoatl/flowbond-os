# FlowRoom — Build Brief

**Product:** `FlowRoom` — private, invite-only, annotatable proposal rooms.
**First room:** `1MWD × DANZ — Build Proposal` for Vandana Hart / House of Tigris Media.
**Owner:** Steph Ferrera
**Status:** greenfield, ship first room in 5 working days.

---

## 0 — Read this first

You are building a **product**, not a one-off page. Steph sends proposals constantly (BrandMark, Voces para el Alma, Tu Estratega Patrimonial, Legatum, Moon Temple). Every one of them currently dies as a PDF in someone's inbox with no way to know if it was read, no way for the client to react in-place, and no record of what was agreed.

FlowRoom fixes that. A room is a cinematic, scroll-driven document that the recipient can **react to inline** — mark any block as agreed, questioned, already-solved, or wrong-timeline, leave a comment, attach a file, and invite their own people. Steph gets a live signal of exactly which parts landed and which didn't.

Room #1 is 1MWD. Build it generic enough that room #2 is a content file, not a rebuild. Do not hardcode 1MWD anywhere outside of seed data and theme config.

**Before writing any code, invoke the `frontend-design` skill.** The visual bar here is the pitch. This room *is* the demo of what we can build — if it looks like a Notion doc we have lost the deal.

---

## 1 — Non-negotiables

| Rule | Detail |
|---|---|
| **Cloudflare only** | Pages, Workers, R2, DNS, Cron. **Never scaffold a Vercel project.** No `vercel.json`, no `@vercel/*`. |
| **Supabase project** | `fgsrcxxccdjqyrpkitmk` (us-east-2, "FlowBond-life"). This is the only project. Never create a new one. |
| **Pattern A schema** | App-prefixed tables (`flowroom_*`), FK to `flowbond_users`, RLS ON for every table, mutations via `SECURITY DEFINER` RPCs, append-only activity log. |
| **Migrations** | Every migration runs as a `BEGIN; … ROLLBACK;` dry-run first, output reviewed, then re-run with `COMMIT`. Never apply blind. |
| **App registry** | Register the app in `flowbond_app_connections` before first write. |
| **Deploy path** | feature → `/test` environment → validation → promote to production. No direct-to-prod. |
| **Monorepo** | Lives in `Cryptocoatl/flowbond-os` as `apps/flowroom`. Reuse existing shared packages; do not fork them. |
| **Privacy** | `noindex, nofollow` on every route. No public room index. No room discoverable without an invite. |

---

## 2 — Stack

```
Frontend    Vite + React 18 + TypeScript + Tailwind
            GSAP + ScrollTrigger (scroll choreography)
            Lenis (smooth scroll)
            One canvas/WebGL hero — see §7
            → deployed to Cloudflare Pages

API         Hono on Cloudflare Workers
            → routes under /api/*

Data        Supabase Postgres (fgsrcxxccdjqyrpkitmk)
            Supabase Realtime for live comments + presence
            Supabase Auth — email OTP only, no passwords

Files       Cloudflare R2, presigned PUT from the Worker
            Never let the browser touch R2 credentials

Email       Resend, called from the Worker
            Invites, OTP branding, digest to owner

Domain      1mwd.danz.now  (Cloudflare DNS, Pages custom domain)
            Room links are DANZ-branded, not FlowBond-branded
```

---

## 3 — Access model

Three roles. Enforce in RLS, not just in UI.

- **owner** — Steph. Full read/write on content and all annotations. Sees analytics.
- **guest** — Vandana. Read content. Create/edit/delete *her own* annotations. **Can invite** additional emails as `viewer`.
- **viewer** — whoever Vandana invites (her counsel, Chelsea, Franziska, an investor). Read content. Create/edit/delete their own annotations. **Cannot invite.**

### Auth flow
1. Recipient opens `https://1mwd.danz.now/r/<slug>`. Slug is a 22-char nanoid — unguessable, but **not** the security boundary.
2. Gate screen: cinematic, branded, one email field.
3. Email must exist in `flowroom_members` for that room. If not → generic "check your link" message. **Never reveal whether an email is on the list.**
4. Supabase Auth sends a 6-digit OTP. On verify, map/create `flowbond_users` row → FBID → set session.
5. Session 30 days. Silent refresh.

### Invite flow (guest only)
Guest enters an email + optional note → Worker validates the inviter is `guest` or `owner` on that room → creates `flowroom_members` row with role `viewer` → Resend sends a branded invite carrying the same room URL. Cap at 10 invites per room; log every invite to the activity table.

---

## 4 — Data model

Sketch. Refine names as needed but keep Pattern A.

```sql
-- Rooms
flowroom_rooms (
  id uuid pk default gen_random_uuid(),
  slug text unique not null,              -- nanoid(22)
  title text not null,
  client_name text,
  theme jsonb not null default '{}',      -- palette, fonts, logo urls
  status text not null default 'draft',   -- draft | live | archived
  owner_user_id uuid not null references flowbond_users(id),
  published_at timestamptz,
  created_at timestamptz default now()
)

-- Membership + roles
flowroom_members (
  id uuid pk,
  room_id uuid references flowroom_rooms(id) on delete cascade,
  email citext not null,
  user_id uuid references flowbond_users(id),   -- null until first login
  role text not null check (role in ('owner','guest','viewer')),
  invited_by uuid references flowbond_users(id),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  unique (room_id, email)
)

-- Content blocks — the anchor points for everything
flowroom_blocks (
  id uuid pk,
  room_id uuid references flowroom_rooms(id) on delete cascade,
  section_key text not null,        -- 'system' | 'flow' | 'chain' | ...
  block_key text not null,          -- stable, human-readable, NEVER changes
  ordinal int not null,
  kind text not null,               -- hero | prose | stage | table_row | card | timeline | need_item | option
  payload jsonb not null,           -- the actual content
  annotatable boolean default true,
  unique (room_id, block_key)
)

-- Reactions: one per member per block, upsert
flowroom_marks (
  id uuid pk,
  room_id uuid, block_id uuid references flowroom_blocks(id) on delete cascade,
  user_id uuid references flowbond_users(id),
  mark text not null check (mark in
    ('agreed','question','already_have','different_timeline','not_this')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (block_id, user_id)
)

-- Threaded comments
flowroom_comments (
  id uuid pk,
  room_id uuid, block_id uuid references flowroom_blocks(id) on delete cascade,
  parent_id uuid references flowroom_comments(id),
  user_id uuid references flowbond_users(id),
  body text not null,
  resolved_at timestamptz,
  resolved_by uuid,
  deleted_at timestamptz,           -- soft delete only
  created_at timestamptz default now()
)

-- Attachments on comments
flowroom_attachments (
  id uuid pk,
  comment_id uuid references flowroom_comments(id) on delete cascade,
  r2_key text not null, filename text, mime text, bytes bigint,
  uploaded_by uuid, created_at timestamptz default now()
)

-- Append-only. Never update, never delete.
flowroom_activity (
  id bigserial pk,
  room_id uuid, user_id uuid,
  event text not null,              -- viewed | section_read | marked | commented | invited | uploaded
  target_block_key text,
  meta jsonb, created_at timestamptz default now()
)
```

**RLS**: a member sees only rooms they belong to. Marks and comments are visible to all members of the room (this is a conversation, not a survey) but writable only by their author. Owner can resolve any comment. Enforce all writes through `SECURITY DEFINER` RPCs — `flowroom_set_mark`, `flowroom_add_comment`, `flowroom_invite_member`, `flowroom_log_activity`.

---

## 5 — The five marks

These are the whole point. Anchor them to every annotatable block. Design them as a small, elegant, always-reachable control — not a comment icon bolted on.

| Mark | Label shown | Meaning |
|---|---|---|
| `agreed` | **Agreed** | Yes, build this |
| `question` | **Question** | Unclear or I need to understand it |
| `already_have` | **We have this** | Solved already — don't rebuild it |
| `different_timeline` | **Different timing** | Right, but not on this schedule |
| `not_this` | **Not this** | Wrong for us |

Interaction: hovering (or tapping, on touch) any block reveals a floating gutter control. One tap sets a mark. A second tap opens the comment composer for that block. Marks are optimistic-UI with rollback on failure. Every mark is instantly visible to the owner via Realtime.

**Reading progress must be tracked** — log `section_read` when a section is ≥60% viewed for ≥3s. Steph needs to know she read §8 (the money section) even if she left no mark on it.

---

## 6 — Owner console

Route `/r/<slug>/console`, owner-only.

- Live presence: who is in the room right now.
- Heatmap of the document: every block colored by mark, unmarked blocks grey.
- Comment inbox, newest first, with reply-in-place and resolve.
- Read-through funnel: which sections were reached, time on each.
- **Export button** → generates a markdown "Resolution Summary": every block with a mark, grouped by mark type, with its comment thread. This is the document Steph works from on the follow-up call. Ship this — it is the actual business value.
- Digest email to Steph, max once per hour, only when there is new activity.

---

## 7 — Design direction

Invoke `frontend-design` before touching CSS. Then hold to this.

**Brand:** DANZ presenting to 1MWD. The room wears their world so it feels like theirs: deep aubergine-black ground (`#120A16`), gold (`#A87C2E → #F3D89A`), and the 1MWD rainbow heart gradient (`#FF6BB8 → #B36BFF → #4FA8FF → #FFD84F`) used **once or twice only**, never as decoration. Cause colours (Water / Forests / Air / Women / Culture) exist as a functional accent set, not a palette to sprinkle.

**Type:** high-contrast serif display against a clean grotesque body, with a mono for status and technical labels. Their marks are gold serif caps — match that register. Display face used at genuinely large sizes; restraint everywhere else.

**The signature moment — the Dance Chain.** This is the one place to spend real budget. A canvas/WebGL particle graph: one node (her move) that branches outward as the user scrolls, generation by generation, each node a real dancer, gold edges drawing in. It should feel alive — slow drift, subtle parallax — and the count should climb with the scroll. When the user reaches the fraud-control block, a branch **visibly quarantines**: goes desaturated and detaches from the ranking while the honest tree keeps growing. That single interaction argues the entire technical thesis without a word of copy. Build it once, build it properly.

**Elsewhere, restraint.** Scroll-triggered reveals, a pinned section for the four-brand architecture where the four sites resolve into one identity spine beneath them, hover micro-states on the mark gutter. That's it. Do not animate every element. The chain is the memorable thing; everything else stays quiet so it lands.

**Quality floor, unannounced:** 60fps on a MacBook Air, full mobile responsiveness (she will open this on a phone first), visible keyboard focus, `prefers-reduced-motion` fully honored — reduced motion gets a static, beautifully composed chain, not a broken one. Lighthouse performance ≥85 on mobile. Preload the display font; no layout shift.

---

## 8 — Content

Source of truth is `content/rooms/1mwd.ts` — a typed array of blocks that seeds `flowroom_blocks`. Every block carries a permanent `block_key`. **Changing a `block_key` orphans its comments — never do it.**

Sections, in order (full copy is in the existing static proposal — port it, don't rewrite it):

```
hero        The chain is a graph, not a counter
system      Four brands, one account          → pinned scroll moment
flow        Five stages, and the rail under each one
chain       Why the Dance Chain has to be a graph  → signature WebGL
hearts      Dance Hearts, designed so they never become a liability
inventory   What exists / what we wire / what waits   → every row annotatable
plan        Twelve weeks to a public MVP
need        What we need from you             → every item annotatable + checkable
money       Year 1 has no technology line     → the three structures, each markable
next        Seven days, seven things
```

Two content rules:
1. Every row of the inventory table, every item in "what we need", and each of the three commercial structures is its **own block**. That granularity is the product — Steph needs to know she agreed to structure B, not that she left a comment somewhere in §8.
2. Blocks in `plan` and `need` render an owner field and a due date from payload. Guests can mark `different_timeline` on any of them and the console surfaces a revised schedule.

---

## 9 — Build order

Ship in this sequence. Each step is deployable.

1. **Scaffold + migrations.** `apps/flowroom` in the monorepo, Pages + Worker wired, migration dry-run reviewed, tables live, app registered in `flowbond_app_connections`, RLS policies written and tested with a throwaway second account.
2. **Auth + gate.** Email OTP, member check, session, the branded gate screen. Verify a non-member is cleanly refused.
3. **Content pipeline.** Seed script, block renderer, all ten sections rendering statically and responsively. No animation yet.
4. **Annotation layer.** Mark gutter, comment threads, Realtime, R2 attachments, activity logging.
5. **Invites.** Guest invite flow + Resend templates + rate limit.
6. **Console + export.** Heatmap, inbox, resolution summary export, digest cron.
7. **Cinematic pass.** GSAP choreography, the WebGL chain, the pinned architecture moment, reduced-motion fallbacks. Do this **last** — animating an unfinished layout wastes the work.
8. **Deploy to `/test`, validate end-to-end with a real second email, then promote.**

---

## 10 — Acceptance criteria

Do not call this done until all of these pass.

- [ ] A non-member with the exact URL cannot see one word of content and cannot tell whether the email they tried is on the list.
- [ ] Vandana can mark any block, comment, attach a PDF, and invite her lawyer — and the lawyer lands in a working room without talking to anyone.
- [ ] A `viewer` cannot invite. Verified at the RLS layer, not just hidden in the UI.
- [ ] Marks and comments appear in Steph's console in under 2 seconds, live.
- [ ] Export produces a resolution summary Steph can run a call from.
- [ ] Loads in under 2.5s on 4G mobile; the chain runs at 60fps; reduced-motion is beautiful, not broken.
- [ ] Zero Vercel artifacts anywhere in the repo.
- [ ] Room #2 can be created by adding one content file and one theme object — nothing else.

---

## 11 — Out of scope for v1

Say no to these now: rich-text editing of content by the guest, PDF export of the room itself, multi-language, Slack/WhatsApp notifications, e-signature, payments. Note them and move on.
