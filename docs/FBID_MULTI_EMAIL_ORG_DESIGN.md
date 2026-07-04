# FBID v2 — Multi-Email Identity, Merge, FlowMe Routing & Org/Company FBIDs

Status: **Design / deep-plan** (not yet built). Authored from a live audit of project `fgsrcxxccdjqyrpkitmk` on 2026-06-08.

This document is the plan for turning FBID from a single-email login into a true Layer-0 identity:
one **person** (or **org**) → many verified emails → routed by FlowMe → owning data across every app.

---

## 0. Why this exists (the proof case)

Steph today has **two** Supabase accounts that are really one human:

| Email | auth uid | FBID handle | state |
|---|---|---|---|
| `cryptocoatl101@gmail.com` | `1fa8789b…` | `@cryptocoatl` (+ flowme `stephferrera`) | claimed / recognized |
| `stepbystephbtm@gmail.com` | `0027cca5…` | `fb_0027cca540d7` | draft, never claimed |

Logging in with the second email shows "create a new handle" — correct under today's model,
because **FBID is welded 1:1 to a single Supabase email** and the system has no concept of
"these two emails are the same person." That is the gap this design closes.

---

## 1. Current state (ground truth, audited)

- **Identity = `auth.uid()`.** `public.flowbond_identities.auth_user_id` is the link; one row per auth user.
  Created eagerly by trigger `handle_new_auth_user` and idempotently by `link_auth_or_create_identity()`.
- **`flowbond_users`** mirrors `auth.users` 1:1 (`id = auth.uid`); treated as the canonical FBID id elsewhere.
- **No indirection layer exists.** `flowbond_auth_accounts` is **dropped**; `current_core_identity_id()`
  still references it and is therefore **dead code** (would raise `relation does not exist`). Do not build on it.
- **The hub gate** (`apps/fbid/app/DashboardClient.tsx:64`) is literally `{identity.handle_is_draft && <ClaimHandle/>}`.
  `getMyIdentity()` does `from('flowbond_identities').select('*').maybeSingle()` with **no `.eq()`** — it leans
  entirely on the RLS SELECT policy `auth_user_id = auth.uid()`. Correct today, but assumes 1 row per session.
- **Login** (`apps/fbid/app/LoginClient.tsx`) already supports magic-link + password + reset, all on the shared
  project. `signInWithOtp({ shouldCreateUser: true })`. All monorepo apps point at `fgsrcxxccdjqyrpkitmk`.
- **Owned-data surface = ~38 tables** keyed to `auth.uid()` via `user_id` / `auth_user_id` / `owner_id` / `created_by`:
  `fd_*` (9), `flowgarden_*` (12), `xelva_*` (4), `flow3_creations`, `danz_profiles`, `flow_cdmx_profiles`,
  `mountain_dogs_profiles`, `flowstudio_api_usage`, `flowedit_*` (3), `flowcredits_ledger`,
  `flowbond_app_connections`, `fbid_relationships`, `flowme_profiles`. **Any merge must re-point all of these.**

---

## 2. Core model change: FBID becomes an entity, emails/logins attach to it

Introduce one indirection so an FBID is no longer `== auth.uid()`:

```
auth.users (one per email/provider)
      │  N:1
      ▼
fbid_logins  ──────────────►  flowbond_identities   (the FBID; kind = person | org)
(provider_account_id=uid)        id = FBID
                                 handle, profile, …
```

- The FBID's stable id stays `flowbond_identities.id`. We **stop** treating `auth.uid()` as the identity.
- A resolver `current_fbid()` maps the session's `auth.uid()` → the owning FBID id, via `fbid_logins`,
  with a **fallback to `flowbond_identities.auth_user_id`** during transition so nothing breaks mid-migration.
- All new RLS/ownership reads through `current_fbid()`, not `auth.uid()`.

This is the same shape the abandoned `flowbond_auth_accounts` was reaching for — we rebuild it cleanly.

---

## 3. Data model (new / changed)

```sql
-- 3.1 The login → FBID indirection (one row per auth.users / provider account)
create table fbid_logins (
  id                  uuid primary key default gen_random_uuid(),
  fbid_id             uuid not null references flowbond_identities(id) on delete cascade,
  provider            text not null default 'supabase',   -- supabase | wallet | oauth:google …
  provider_account_id text not null,                      -- = auth.uid() for supabase
  is_primary          boolean not null default false,
  linked_at           timestamptz not null default now(),
  unique (provider, provider_account_id)
);

-- 3.2 Verified emails owned by an FBID (superset of login emails; supports route targets
--     that are NOT login methods, e.g. a billing inbox)
create table fbid_emails (
  id           uuid primary key default gen_random_uuid(),
  fbid_id      uuid not null references flowbond_identities(id) on delete cascade,
  email        citext not null unique,           -- globally unique: an email belongs to one FBID
  login_id     uuid references fbid_logins(id) on delete set null,  -- set if this email can sign in
  is_primary   boolean not null default false,
  verified_at  timestamptz,                      -- null until ownership proven
  label        text,                             -- 'personal', 'work', 'billing' …
  created_at   timestamptz not null default now()
);
create unique index one_primary_email_per_fbid on fbid_emails(fbid_id) where is_primary;

-- 3.3 kind discriminator on the identity itself
alter table flowbond_identities add column kind text not null default 'person'
  check (kind in ('person','org'));

-- 3.4 Org membership (company FBID ← member person FBIDs)
create table fbid_org_members (
  org_fbid_id    uuid not null references flowbond_identities(id) on delete cascade,
  member_fbid_id uuid not null references flowbond_identities(id) on delete cascade,
  role           text not null check (role in ('owner','admin','member')),
  added_at       timestamptz not null default now(),
  primary key (org_fbid_id, member_fbid_id)
);

-- 3.5 FlowMe routing: which email receives which class of message
create table fbid_email_routes (
  fbid_id   uuid not null references flowbond_identities(id) on delete cascade,
  purpose   text not null,   -- 'security' | 'billing' | 'social' | 'newsletter' | 'app:<slug>' …
  email_id  uuid not null references fbid_emails(id) on delete cascade,
  primary key (fbid_id, purpose)
);
```

Resolver + RLS helper:

```sql
create or replace function current_fbid() returns uuid language sql stable security definer
set search_path = public, auth as $$
  select coalesce(
    (select l.fbid_id from fbid_logins l
       where l.provider='supabase' and l.provider_account_id = auth.uid()::text limit 1),
    (select i.id from flowbond_identities i where i.auth_user_id = auth.uid() limit 1)  -- transition fallback
  );
$$;
```

---

## 4. Auth-time linking & duplicate detection (security-critical)

**Rule: never auto-merge two accounts just because a human looks the same.** Auto-linking by raw email
or name is an account-takeover vector. Linking only ever happens with **proof of control of both sides.**

- **Same email** can already only ever map to one FBID — Supabase enforces one `auth.users` per email, and
  `fbid_emails.email` is `unique`. So the literal "two FBIDs for one email" case is structurally impossible. ✅
- **Same human, different emails** (Steph's case) is detected, **not** auto-merged:
  - On login/callback, after `current_fbid()`, run a soft `detect_possible_duplicates()` (match on shared
    devices, prior `fbid_relationships`, identical recovery phone, etc.) and surface a **non-blocking nudge**:
    "Is `stepbystephbtm@…` also you? Link it." Acting on it requires the verified add-email flow (§5).

---

## 5. Add-email & merge flow (the actual multi-email feature)

From an **authenticated** FBID session (so we already trust side A):

1. Settings → "Add email" → enter address B.
2. Send a 6-digit OTP / verify link to B (`signInWithOtp` style, but bound to the current FBID via a nonce).
3. User proves control of B → we now trust **both** sides. Then branch:
   - **B is a fresh email** (no auth user): insert `fbid_emails(fbid_id=A, email=B, verified_at=now())`.
     Optionally provision a `fbid_logins` row so B can also sign in to A.
   - **B already has its own FBID** (Steph's draft case): **merge B → A** transactionally (§5.1).

### 5.1 `merge_fbid(loser, winner)` — transactional RPC, `security definer`

1. Guard: caller controls **both** (verified login/email on each). Winner keeps its claimed handle;
   refuse if both have distinct claimed (non-draft) handles unless an explicit `keep_handle` is chosen.
2. Re-point **every** owned row from `loser`'s uid/fbid to `winner` across the ~38-table surface (§1).
   Maintain this list as a generated registry (`fbid_owned_tables` metadata) so new apps auto-enroll.
3. Move `fbid_logins` + `fbid_emails` from loser → winner.
4. Mark loser `flowbond_identities` row `merged_into = winner`, revoke its sessions, soft-delete.
5. Emit an audit row (`fbid_merge_log`) — irreversible, so it must be logged.

Conflicts to handle explicitly: duplicate rows in `flowcredits_ledger` (sum, don't drop), unique
constraints in per-app profile tables (`flowgarden_profiles.user_id` PK collision → keep winner, archive loser).

---

## 6. FlowMe routing layer

`fbid_email_routes` lets FlowMe (the messaging/agent layer) send the right thing to the right inbox:

- `security` → primary email, always.
- `billing` → work/billing email or the org's email.
- `social` / `newsletter` → a throwaway, etc.
- `app:flowgarden` → per-app override.

FlowMe resolves: `route(fbid, purpose) → fbid_emails.email`, falling back to the primary email when no
explicit route exists. This is what makes "direct specific things to specific emails" real.

---

## 7. Organization / Company FBID

- An org is a `flowbond_identities` row with `kind='org'` — it has a handle, profile, visibility, and can
  **own data** in any app (projects, credits, content) exactly like a person, but it has **no direct login**.
- People control it through `fbid_org_members(role)`. RLS for org-owned rows: allow when
  `current_fbid()` is a member with sufficient role.
- **"Act as"** context (like FB Pages): the hub lets a person switch their active FBID to an org they admin;
  a request header / session claim carries `acting_fbid`, and `current_fbid()` honors it when the session
  is a verified member. All writes are attributed to the org, audited to the acting person.
- Org = "a social profile linked to all the things": apps reference `owner_fbid` (person **or** org) uniformly.

---

## 8. Migrating the two existing accounts (the proof)

Once §5 ships:
1. Sign in as `cryptocoatl101` (winner — keeps `@cryptocoatl` + flowme `stephferrera`).
2. Add-email `stepbystephbtm@gmail.com`, verify.
3. `merge_fbid(loser=0027cca5…, winner=1fa8789b…)` — re-points any `fd_*`/`flowgarden_*`/etc. rows the old
   account owned, discards the draft handle `fb_0027cca540d7`, retires the old FBID.

Until then, the zero-code workaround is simply: **use `cryptocoatl101@gmail.com`** — it's already recognized.

---

## 9. Phasing

- **Phase 0 (done):** fix FlowDesk env (was empty `sensitive` Supabase vars → now `plain`, redeployed);
  password-reset link sent to `cryptocoatl101`.
- **Phase 1 — indirection (non-breaking):** add `fbid_logins`, `fbid_emails`, `current_fbid()` + fallback;
  backfill one login + one primary email per existing identity. Nothing changes behaviorally.
- **Phase 2 — cut reads over to `current_fbid()`:** migrate hub `getMyIdentity()` and RLS policies off raw
  `auth.uid()` incrementally behind the fallback. Add-email + verify in hub settings.
- **Phase 3 — merge:** ship `merge_fbid()` + owned-table registry; merge Steph's two accounts as the test.
- **Phase 4 — orgs:** `kind='org'`, `fbid_org_members`, "act as", `owner_fbid` on app tables.
- **Phase 5 — FlowMe routing:** `fbid_email_routes` + FlowMe send-resolver.

## 10. Risks / open questions

- **RLS migration touches every app.** Do it behind `current_fbid()`'s fallback so 1:1 keeps working until each
  policy is converted; convert + test app-by-app.
- **Merge is irreversible and wide (~38 tables).** Build the owned-table registry first; dry-run a merge into a
  branch DB before running on prod. Audit-log everything.
- **`handle_new_auth_user` trigger** still force-creates an identity per new auth user — keep it, but in Phase 2
  it should create the identity only if the new login isn't being attached to an existing FBID.
- **Dead code:** delete `current_core_identity_id()` (references missing `flowbond_auth_accounts`) to avoid confusion.
- **Confirm** no other app outside this monorepo (Mountain Dogs, Xelva standalone) writes identities a different way.
