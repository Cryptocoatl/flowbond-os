# FloGuard Backlog — ClaudIA's security task list

Living remediation tracker for the FlowBond ecosystem. ClaudIA advances this
every round (see `/.claude/skills/floguard`). **No secret values here** —
credentials are referenced by `service · location · first-6 · length`.

**Status:** `open` · `in-progress` · `blocked (steph)` (human-gated) · `done`
**Owner:** `claudia-auto` (may PR a fix) · `steph-manual` (dashboard/destructive)

Seeded from the round on **2026-06-24**. Last updated **2026-08-17**.

---

## 🔴 P1 — highest blast radius

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-001 | Canonical Supabase JWT secret powers `anon`+`service_role` across ~11 apps; key copied into ~10 on-disk `.env.local` | steph-manual | blocked (steph) | Roll JWT secret on `fgsrcxxccdjqyrpkitmk` **or** migrate to new publishable/secret key system (no forced logout); then redistribute. ClaudIA to draft env-redistribution script. |
| FG-002 | ≥3 distinct `ANTHROPIC_API_KEY` (`sk-ant-…136`) across grantflow, ops, claudia, astroflow, flow3, services/api, flowgarden | steph-manual | blocked (steph) | Issue per-app keys at console.anthropic.com, delete old, consolidate. |
| FG-003 | GitHub token `gho_F34…40` (apps/ops) + PAT `ghp_cmZ9…36` (mohe-web) | steph-manual | blocked (steph) | Revoke + reissue fine-grained scoped tokens. |
| FG-004 | Vercel tokens `vca_2Mb…83` (ops) + `vcp_0zO…87` (mohe-web) | steph-manual | blocked (steph) | Revoke + reissue. |

## 🟠 P2 — credentialed access / weak secrets / anon admin surface

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param — **SCOPE EXPANDED 2026-08-17**: original 5 + 13 new. Full set: `admin_bookings(p_key)`, `admin_event_summary(p_key)`, `admin_event_timeline(p_key,p_code)`, `mt_agregar_codigo(p_secreto)`, `mt_listar(p_secreto)` + NEW: `fs_add(p_secreto)`, `fs_list(p_secreto)`, `fs_set(p_secreto)`, `mt__is_admin(p_secreto)`, `mt_admin_cotizaciones(p_secreto)`, `mt_admin_cotizaciones_largo(p_secreto)`, `mt_admin_designs(p_secreto)`, `mt_admin_inspiracion(p_secreto)`, `mt_admin_ok(p_secreto)`, `mt_admin_requests(p_secreto)`, `mt_admin_set_cotizacion(p_secreto)`, `mt_admin_set_inspiracion(p_secreto)`, `mt_admin_set_request(p_secreto)`, `flowchords_publish(…,p_key,…)`, `tulumcoin_set_contract(p_key,…)`, **`claudia_vault_mark(p_key)`** (⚠️ ClaudIA ZK vault) | claudia-auto + steph-manual | open | Verify the gating secret is strong (not a `Pass4u`-class value); rotate it; add rate-limit; or move behind an authenticated role. **Priority**: `claudia_vault_mark` first. ClaudIA: pull fn bodies + draft fix. |
| FG-006 | `ADMIN_PASSWORD="Pass4u"` (flowcdmx) — guessable | steph-manual | blocked (steph) | Replace with 32-byte random. |
| FG-007 | `ADMIN_SESSION_SECRET` `flowcdmx-2026…36` — predictable | steph-manual | blocked (steph) | Regenerate random. |
| FG-008 | DB password `FlowBond-11:11` in services/api `DATABASE_URL` | steph-manual | blocked (steph) | Roll DB password (Supabase → Settings → Database). |
| FG-009 | DB password `FlowNation1440` in flowcdmx POSTGRES_* | steph-manual | blocked (steph) | Roll on `melshaxfoeruvyzrpvec`. |
| FG-010 | NextAuth `AUTH_SECRET` `pRL/tCa…44` (mohe-web) | steph-manual | blocked (steph) | `openssl rand -base64 32`. |
| FG-011 | GitHub OAuth `AUTH_GITHUB_ID/SECRET` (mohe-web) | steph-manual | blocked (steph) | Regenerate client secret. |
| FG-012 | CDMX project creds: `sb_secret_…35` + JWT secret `5ZXi…88` (`melshaxfoeruvyzrpvec`, paused) | steph-manual | blocked (steph) | Rotate when project next active. |

## 🟡 P3 — scoped single-service keys

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-013 | DeepL `068e89…:fx` (raiz-translation) | steph-manual | blocked (steph) | Rotate. |
| FG-014 | `FAL_KEY` (flowstudio) | steph-manual | blocked (steph) | Rotate. |
| FG-015 | OpenTopo key (TULUM LOT 9) | steph-manual | blocked (steph) | Rotate. |
| FG-016 | Brandmark publishable keys (`cmabpllztpznknymbatl`, `sjhtsdbcxmszqyusurmq`) | steph-manual | blocked (steph) | Public-class; rotate when convenient. |

## 🛡️ DB hardening (canonical advisors)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| ~~FG-020~~ | ~~7 `rls_policy_always_true` INSERT policies on lead-capture tables~~ | claudia-auto | **done** | Advisor now returns 0 matches as of 2026-08-17. Policies tightened (CHECK constraints applied or policies removed). |
| ~~FG-021~~ | ~~`auth_leaked_password_protection` disabled (canonical)~~ | steph-manual | **done** | Advisor now returns 0 matches as of 2026-08-17. Steph toggled on HaveIBeenPwned protection. |
| FG-022 | 22 functions with mutable `search_path` (up from 1 in FG-022 initial). Schemas: `public` (18 fns), `grantflow` (3 fns), `lvb` (1 fn). | claudia-auto | in-progress | Expanded to pin all 22 via updated DO block in `migration 006`. DRY-RUN — apply. |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `migration 006`. Safe (RPCs are definer-owned). DRY-RUN — apply. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |
| FG-055 | **NEW** 16 `SECURITY DEFINER` views (ERROR level): 11 `app_vpa_*_public`, `v_ff_funding_progress`, `mtt_admin_dashboard`, `mtt_commission_summary`, `mtt_partner_payouts`, `mtt_public_routes`, `brandmark_lead_pool`. These enforce the view-creator's RLS instead of the caller's. | steph-manual | open | Review each view: if intentionally public-catalog (app_vpa_*_public likely is), add a comment and confirm underlying table RLS prevents PII leak. Convert to `SECURITY INVOKER` where not intentional. Cannot auto-fix — per-view review required. Supabase docs: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view |
| FG-056 | **NEW** Extensions `pg_net` and `postgis` installed in `public` schema (WARN). Should be in `extensions` schema. | steph-manual | open | Move via Supabase dashboard (Extensions page) or: `CREATE EXTENSION pg_net SCHEMA extensions; DROP EXTENSION pg_net;` (requires superuser). Low urgency — public-schema extensions are a noise vector for search_path attacks. |

## 🧱 Security headers (zero coverage — all apps)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)** | claudia-auto | in-progress | ✅ Built `packages/security` (`@flowbond/security`: `securityHeaders()`, `withSecurity()`, `CSP_PRESETS` incl. webgl); typechecks clean. Zero apps wired as of 2026-08-17 (confirmed: none of the 16 next.config.* files use `withSecurity`). Per-app wiring is a one-liner (`export default withSecurity(cfg, {csp})` + add to `transpilePackages` + workspace dep) but must land on **each app's own branch** (claudia is deploy-sensitive on `claudia-m1`). Roll out app-by-app. |

## 🌐 Availability / deploy-integrity

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-050 | **INCIDENT (resolved):** `flowbond.life` + `www` served Vercel platform-level 404. Root cause: domains attached to stale duplicate project `flow-bond-layer0`. | claudia-auto | done | Detached → reattached to healthy `flowbond-live`. 2026-06-28. |
| FG-051 | No availability monitoring existed. | claudia-auto | done | Shipped `uptime-sentinel.sh`. 2026-06-28. |
| FG-052 | Duplicate/orphan Vercel projects were landmines. | claudia-auto | done | Paused all 3 orphan projects via REST API. 2026-06-29. |
| FG-053 | Sentinel was on-demand only. | claudia-auto | done | Scheduled via launchd (every 1800s). 2026-06-28. |

## 🧹 Hygiene

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-040 | Live secrets sit in plaintext `.env.local` across ~20 dirs (git-clean, but disk/backup/cloud-sync risk) | steph-manual | blocked (steph) | Confirm FileVault on; ensure ~/Projects & ~/Downloads not cloud-synced; prefer Vercel env as prod source of truth. |
| FG-041 | `.vercel/.env.*.local` (claudia, fbid, flowgarden ×2) + `flowcdmx/.env.vercel-current` hold live secrets | steph-manual | blocked (steph) | Delete only after rotation, by hand. |
| FG-042 | No secret-scanning backstop on commit | claudia-auto | open | Add gitleaks pre-commit hook. PR. |
| FG-058 | **NEW** `apps/admin/middleware.ts:6` hardcoded fallback JWT signing key: `process.env.AUTH_SECRET ?? 'mtt-admin-secret-change-in-production-2026'`. If `AUTH_SECRET` is unset in the deployment env, this known string is used to sign/verify admin session tokens — any attacker knowing the fallback can forge admin cookies. | steph-manual | open | Verify `AUTH_SECRET` is set in production Vercel env for the admin app. Remove the hardcoded fallback — throw at startup if missing. |

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); FG-005 covers only the p_key/p_secreto-gated ones.
- `rls_enabled_no_policy`: 244 tables across 11 schemas have RLS enabled but no explicit policy (implicit deny). The `banoseco_*` ones are covered by FG-023 (explicit deny migration). The rest are RPC-only tables where implicit deny is the intent — no action needed unless a table is found with a direct-client write path.
- `spatial_ref_sys` (PostGIS system table) shows as `rls_disabled_in_public` — expected noise, ignore.
