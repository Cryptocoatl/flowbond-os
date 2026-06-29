# FloGuard Backlog

Canonical project: `fgsrcxxccdjqyrpkitmk`
First bootstrap: 2026-06-29

---

## ⚠️ CRITICAL

### FG-001 · bcrypt hash of known password committed to version control
- **Status:** `blocked (steph)`
- **Source:** `supabase/migrations/005_flowedit_auth.sql` seed block
- **Detail:** The migration seeds `flowedit_users` with a commented plaintext password and its bcrypt hash, both committed to git history. Anyone with repo access can mount an offline dictionary attack. The hash cannot be removed from history without a rewrite.
- **Manual steps:**
  1. Generate a fresh strong password (≥20 chars) for each admin account.
  2. Hash with bcrypt (cost 12): `node -e "require('bcryptjs').hash('NEW_PASSWORD',12).then(console.log)"`
  3. Apply via service_role: `UPDATE flowedit_users SET password_hash = '<new_hash>' WHERE id = 'usr_steph';` and the same for `usr_michelle`.
  4. Do NOT commit the new hashes to source control.
  5. Long-term: remove seed credentials from migrations; provision via a secrets manager or Supabase Vault instead.

---

## WARN / ERROR

### FG-002 · FLOWEDIT_JWT_SECRET falls back to hardcoded dev string · done (PR#1)
- **Status:** `done`
- **Source:** `services/api/src/routes/flowedit-auth.ts:10`
- **Detail:** If `FLOWEDIT_JWT_SECRET` is unset in production, tokens are signed with the public string `flowedit-dev-secret-change-in-prod`, allowing JWT forgery.
- **Fix applied:** startup guard throws in `NODE_ENV=production` when env var is absent.

### FG-003 · Supabase Auth leaked-password protection disabled
- **Status:** `blocked (steph)`
- **Source:** Supabase advisor `auth_leaked_password_protection`
- **Detail:** HaveIBeenPwned check is off; users can set breached passwords.
- **Manual steps:** Supabase Dashboard → Authentication → Password Settings → enable "Check for leaked passwords".

### FG-004 · Mutable search_path on two public functions · done (PR#1)
- **Status:** `done`
- **Source:** Supabase advisor `function_search_path_mutable`
- **Functions:** `public.vpa__is_service()`, `public.flowbond_role_rank(p_role text)`
- **Fix applied:** `supabase/migrations/006_search_path_fix.sql` — recreates both with `SET search_path = public`.

### FG-005 · SECURITY DEFINER views bypass RLS on underlying tables
- **Status:** `open`
- **Source:** Supabase advisor `security_definer_view` (ERROR)
- **Views:** `public.app_vpa_specialists_public`, `app_vpa_categories_public`, `app_vpa_workshops_public`, `app_vpa_products_public`, `app_vpa_services_public`, `app_vpa_testimonials_public`, `app_vpa_settings_public`
- **Detail:** SECURITY DEFINER views execute as the view owner and bypass row-level security on the underlying tables. Any caller who can SELECT from the view sees all rows regardless of RLS policies.
- **Manual steps:** For each view — (1) verify the underlying tables' RLS is correct and complete; (2) if safe, recreate the view WITHOUT SECURITY DEFINER; (3) test that public read access is preserved.

### FG-006 · Anon-callable SECURITY DEFINER admin RPCs gated only by secret-string param
- **Status:** `blocked (steph)`
- **Source:** Supabase advisor `anon_security_definer_function_executable`
- **Functions:**
  - `public.admin_bookings(p_key text)`
  - `public.admin_event_summary(p_key text)`
  - `public.admin_event_timeline(p_key text, p_code text)`
  - `public.mt_agregar_codigo(p_secreto text, p_nombre text)`
  - `public.mt_listar(p_secreto text)`
- **Detail:** These SECURITY DEFINER functions are callable by the `anon` role. Their only auth layer is a runtime secret passed as a plain-text argument. If the key leaks (client-side exposure, logs, error messages), any unauthenticated caller gets admin-scoped DB access that bypasses RLS.
- **Manual steps (choose one per function):**
  - Preferred: Restrict to `TO authenticated` or `TO service_role` if the caller always has a valid JWT.
  - Alternative: If key-gated pattern must be kept, rotate the secret values and store them in Supabase Vault; never hard-code in client bundles.

### FG-007 · Unconditional INSERT policies (always-true WITH CHECK)
- **Status:** `open`
- **Source:** Supabase advisor `rls_policy_always_true`
- **Tables & policies:**
  - `marketing.waitlist` — "anon insert only" (anon) — intentional for signup form
  - `public.flownation_waitlist` — "anon can insert flownation waitlist" (anon) — intentional
  - `public.investor_events` — "anon insert events" (anon) — review for spam risk
  - `public.moon_temple_respuestas` — "anon inserta respuestas moon temple" (anon + authenticated) — broader than needed; consider rate-limit or CAPTCHA
  - `public.phoenix_claims` — "phoenix_claims: authenticated insert" (authenticated) — any authenticated user; verify this is intentional
  - `public.waitlist` — "Anyone can join waitlist" (public) — intentional
  - `public.xelva_project_applications` — "public can apply" (public) — intentional
- **Action:** Audit `moon_temple_respuestas` and `phoenix_claims` for spam / abuse risk; add rate limiting or additional constraints if needed.

### FG-008 · No HTTP security headers on any Next.js app · done (PR#1)
- **Status:** `done`
- **Source:** In-repo audit — all four `next.config.ts` files
- **Apps:** `flowedit-dashboard`, `web`, `reciprociudad`, `flowgarden`
- **Fix applied:** Added `headers()` to each `next.config.ts` with `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Remaining:** CSP not yet applied (requires per-app tuning); track as follow-up.

### FG-009 · @flowbond/security package does not exist
- **Status:** `open`
- **Source:** In-repo audit — `packages/` directory
- **Detail:** No `@flowbond/security` package exists. Security headers are applied inline per FG-008 as a stopgap. A shared package would allow consistent CSP, HSTS, and nonce generation across all apps.
- **Action:** Create `packages/security` with a `withSecurity(nextConfig)` wrapper before the next major app launch.
