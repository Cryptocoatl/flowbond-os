# FBID Hub — Remaining Manual / Infra Steps

These are the steps that require credentials, consoles, or DNS — things code can't
do. Everything else (DB backbone, SDK, hub routes, wallet endpoints) is already built.

> **Identity root:** `fgsrcxxccdjqyrpkitmk` (FlowBond-life, us-east-2, ACTIVE).
> The ref `eoajujwpdkfuicnoxetk` ("Singapore") in some specs is **stale/incorrect** —
> it does not exist in the Supabase account. Do not use it.

---

## 1. Supabase Auth config (Site URL + redirect allowlist)

Needed for **magic link & OAuth** to redirect correctly. (Password + the wallet
handoff already work without this.)

**Automated:** export a Supabase **personal access token** and run the script:
```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxx          # https://supabase.com/dashboard/account/tokens
npx tsx apps/fbid/scripts/configure-fbid-auth.ts        # PATCHes config, then GETs to assert
```
The script sets `site_url` + the full `uri_allow_list` and (if creds are present)
enables Google/Apple. It prints the resulting config so you can confirm it stuck.

**Manual fallback** (Dashboard → Authentication → URL Configuration):
- Site URL: `https://fbid.flowbond.life`
- Redirect URLs (add all):
  ```
  https://fbid.flowbond.life/auth/callback
  https://fbid.flowbond.life/auth/set-password
  https://astro.flowbond.life/auth/callback
  https://flowgarden.life/auth/callback
  https://flowbond.life/api/auth/callback
  https://danz-now.vercel.app/auth/callback
  https://xelva.live/auth/callback
  https://dev.flowbond.life/auth/callback
  http://localhost:3020/auth/callback
  http://localhost:3011/auth/callback
  http://localhost:3002/auth/callback
  http://localhost:3000/api/auth/callback
  http://localhost:3003/auth/callback
  http://localhost:3030/auth/callback
  ```

## 2. Google OAuth (one shared client)

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web).
2. **Authorized redirect URI:** `https://fgsrcxxccdjqyrpkitmk.supabase.co/auth/v1/callback`
3. **Authorized JS origin:** `https://fbid.flowbond.life`
4. Copy Client ID + secret into env (consumed by the config script):
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
5. Re-run `configure-fbid-auth.ts` (or set in Dashboard → Auth → Providers → Google).

## 3. Apple "Sign in with Apple"

Artifacts (all from the Apple Developer portal):
1. **App ID** with the *Sign in with Apple* capability.
2. **Services ID** — this is the OAuth `client_id` (e.g. `life.flowbond.signin`).
   - Web Domain: `flowbond.life`
   - Return URL: `https://fgsrcxxccdjqyrpkitmk.supabase.co/auth/v1/callback`
3. **Domain association:** download Apple's `apple-developer-domain-association.txt`
   and host it at `https://flowbond.life/.well-known/apple-developer-domain-association.txt`.
   Verify it resolves **before** testing Apple login.
4. **Sign in with Apple Key** → download the `.p8`, note its **Key ID** and your **Team ID**.
5. Generate the **client secret** (an ES256 JWT — Apple doesn't give you a static one):
   ```bash
   export APPLE_TEAM_ID=XXXXXXXXXX
   export APPLE_KEY_ID=YYYYYYYYYY
   export APPLE_SERVICES_ID=life.flowbond.signin
   export APPLE_PRIVATE_KEY="$(cat AuthKey_YYYYYYYYYY.p8)"
   npx tsx apps/fbid/scripts/apple-client-secret.ts          # prints the JWT
   ```
   Put the output in env as `APPLE_CLIENT_SECRET` and the Services ID as
   `APPLE_CLIENT_ID`, then run `configure-fbid-auth.ts`.
6. ⏰ **Apple secret expires — regenerate before 2026-12-03** (6-month max). Re-run the
   script and update `APPLE_CLIENT_SECRET`. (Set a calendar reminder.)

> Apple returns the email **only on first consent** and may use a **private-relay**
> address. The FBID linking contract (`docs/identity-linking.md`) handles both.

## 4. DNS + Vercel for the hub

- New Vercel project → root `apps/fbid` (monorepo). Build: `next build`. Output: Next.js.
- Env on Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (and Google/Apple/Reown vars).
- DNS: `fbid.flowbond.life` → Vercel (CNAME / A per Vercel's instructions).
- Each consumer app sets `NEXT_PUBLIC_FBID_URL=https://fbid.flowbond.life`
  (locally it's `http://localhost:3020`).

## 5. Wallet (Reown) — for hub wallet login

- `NEXT_PUBLIC_REOWN_PROJECT_ID=...` (WalletConnect/Reown Cloud) in the hub env.
