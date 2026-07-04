# @flowbond/auth — FBID SDK

One identity for every FlowBond app, through a single source of truth at
**`fbid.flowbond.life`**. Apps never host their own login UI — they bounce to the
hub and receive a session back. Identity is the canonical **FBID**
(`public.flowbond_users.id` = `auth.uid()`), shared across the whole ecosystem.

## Integrate an app in 2 steps

### 1. Send unauthenticated users to the hub

In your login page (or an auth guard), redirect to the hub with your slug and
your own callback URL:

```ts
'use client'
import { hubRedirect } from '@flowbond/auth'

const origin = window.location.origin
window.location.assign(
  hubRedirect('yourslug', `${origin}/auth/callback`, '/dashboard'), // next is optional
)
```

### 2. Receive the session back

Add one route handler. It handles both landing shapes (`?code=` from magic
link/OAuth, `?token_hash=` from the hub handoff), sets the session on your
domain, and links identity via `activate_app('yourslug')`:

```ts
// app/auth/callback/route.ts
import { type NextRequest } from 'next/server'
import { handleAuthCallback } from '@flowbond/auth/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleAuthCallback({ request, slug: 'yourslug', defaultNext: '/' })
}
```

That's the whole integration. No login UI to build, no password handling, no
provider config in your app.

## Requirements / checklist

- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Optionally `NEXT_PUBLIC_FBID_URL`
  (defaults to `https://fbid.flowbond.life`; set to `http://localhost:3020` for
  local dev).
- **next.config:** add `transpilePackages: ['@flowbond/auth']`.
- **Allowlist:** add your callback URL to `src/redirect-allowlist.ts` here AND to
  the Supabase Auth → URL Configuration redirect allowlist (see below).
- **Slug:** your slug must be in the `activate_app` CHECK list (DB migration).
- **Separate repos** (not in this workspace, e.g. flowbond-life, xelva): copy the
  client helper into the app (see `flowbond-life/app/lib/fbid.ts`) and inline the
  callback logic — the package can't be imported across repos.

## API surface

Client-safe (`@flowbond/auth`):
- `hubRedirect(slug, appCallbackUrl, next?)` → hub login URL.
- `isAllowedRedirect(url)` → boolean exact-match guard.
- `allowedCallbackUrls()` → the list (handy for configuring Supabase).
- `ALLOWED_CALLBACKS`, `FBID_HUB_URL`.

Server-only (`@flowbond/auth/server`):
- `handleAuthCallback({ request, slug, defaultNext?, loginPath? })` → `NextResponse`.

The hub (`fbid.flowbond.life`) HTTP API:
- `GET /?app=<slug>&redirect=<callback>` — the unified login UI.
- `GET /api/handoff?app=<slug>&redirect=<callback>` — mints a one-time token and
  redirects back (used after password/OAuth auth at the hub).
- `GET /auth/callback` — the hub's own OAuth/recovery landing.

## Methods

Magic link, email+password (with set/reset), Google/Apple OAuth — all live at the
hub today. Wallet (Reown/Solana) and passkeys/WebAuthn are on the roadmap
(Phase 1b) and will work through the same handoff with no app changes.

## How the cross-domain handoff works

Apps are on different root domains, so a hub session can't be shared by cookie.
- **Magic link:** the hub calls `signInWithOtp({ emailRedirectTo: <your callback> })`
  — the email link lands directly on your app's callback (`?code=`).
- **Password / OAuth / wallet / passkey:** you authenticate at the hub, then the
  hub server mints a one-time `token_hash` (`admin.generateLink`) and redirects to
  your callback (`?token_hash=`), which redeems it with `verifyOtp` → session on
  your domain.

Security: the hub validates every `redirect` by **exact origin + path** against
the allowlist; tokens are single-use, short-lived, redeemed server-side.

## Identity, handle & privacy (`@flowbond/auth/identity`)

Every app reads the user's handle / profile / info from **FBID** — the
`flowbond_identities` record, 1:1 with the auth user, auto-created on first login.
Privacy is enforced **in the database** (RLS + the `get_profile` field-gate), so
these helpers can never return more than the caller's closeness allows.

```ts
import {
  getMyIdentity, getProfile, claimHandle, handleAvailable,
  setVisibility, setRelationship,
} from '@flowbond/auth/identity'

const me = await getMyIdentity(supabase)          // your own full record
if (await handleAvailable(supabase, 'cavino')) await claimHandle(supabase, 'cavino')
const them = await getProfile(supabase, 'cavino') // privacy-filtered, or null if invisible
```

**5-tier visibility** (`private → selected → close_friends → network → public`).
Every identity defaults to **`private`** (invisible to everyone but you). Open it
up per-field or wholesale, and grant specific people closeness:

```ts
await setVisibility(supabase, { default: 'private', fields: { display_name: 'public', bio: 'network' } })
await setRelationship(supabase, peerUserId, 'close_friends')
```

`public` is opt-in — for venues / public figures. Closeness nests: a `selected`
peer sees everything a `network` peer sees, and more. `public_profiles` lists
**only** identities whose default is `public`.
