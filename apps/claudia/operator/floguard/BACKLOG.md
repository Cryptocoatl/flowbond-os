# FloGuard Backlog — ClaudIA's security task list

Living remediation tracker for the FlowBond ecosystem. ClaudIA advances this
every round (see `/.claude/skills/floguard`). **No secret values here** —
credentials are referenced by `service · location · first-6 · length`.

**Status:** `open` · `in-progress` · `blocked (steph)` (human-gated) · `done`
**Owner:** `claudia-auto` (may PR a fix) · `steph-manual` (dashboard/destructive)

Seeded from the round on **2026-06-24**. Last updated **2026-07-13** (round 3).

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
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param: `admin_bookings(p_key)`, `admin_event_summary(p_key)`, `admin_event_timeline(p_key,p_code)`, `mt_agregar_codigo(p_secreto)`, `mt_listar(p_secreto)` on canonical project | claudia-auto + steph-manual | open | Verify the gating secret is strong (not a `Pass4u`-class value); rotate it; add rate-limit; or move behind an authenticated role instead of a param. ClaudIA: pull fn bodies + draft fix. |
| FG-006 | `ADMIN_PASSWORD="Pass4u"` (flowcdmx) — guessable | steph-manual | blocked (steph) | Replace with 32-byte random. |
| FG-007 | `ADMIN_SESSION_SECRET` `flowcdmx-2026…36` — predictable | steph-manual | blocked (steph) | Regenerate random. |
| FG-008 | DB password `FlowBond-11:11` in services/api `DATABASE_URL` | steph-manual | blocked (steph) | Roll DB password (Supabase → Settings → Database). |
| FG-009 | DB password `FlowNation1440` in flowcdmx POSTGRES_* | steph-manual | blocked (steph) | Roll on `melshaxfoeruvyzrpvec`. |
| FG-010 | NextAuth `AUTH_SECRET` `pRL/tCa…44` (mohe-web) | steph-manual | blocked (steph) | `openssl rand -base64 32`. |
| FG-011 | GitHub OAuth `AUTH_GITHUB_ID/SECRET` (mohe-web) | steph-manual | blocked (steph) | Regenerate client secret. |
| FG-012 | CDMX project creds: `sb_secret_…35` + JWT secret `5ZXi…88` (`melshaxfoeruvyzrpvec`, paused) | steph-manual | blocked (steph) | Rotate when project next active. |
| FG-043 | `apps/admin/middleware.ts:6` — hardcoded fallback JWT secret `'mtt-admin-secret-change-in-production-2026'` used when `AUTH_SECRET` env var is unset; value is public in git | steph-manual | blocked (steph) | Remove the fallback literal; require the env var (throw/exit if missing). Rotate the secret if it has ever been used in prod. |
| FG-044 | `apps/grantflow/middleware.ts:7,41` — `SUPABASE_SERVICE_ROLE_KEY` imported and used in Edge middleware, running on every inbound request | steph-manual | blocked (steph) | Move entitlement check to a protected API route (server-side, not Edge) or use an RLS-compatible approach without service_role in the request path. |

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
| FG-020 | 7 `rls_policy_always_true` INSERT policies (anon/auth) on lead-capture tables: `marketing.waitlist`, `public.waitlist`, `flownation_waitlist`, `investor_events`, `moon_temple_respuestas`, `phoenix_claims`, `xelva_project_applications` | claudia-auto | open | RLS can't rate-limit → app/edge turnstile + column CHECK constraints. Schemas not in-repo; template + verify-columns query shipped in `supabase/migrations/006_floguard_hardening.sql`. Fill columns then apply. |
| FG-021 | `auth_leaked_password_protection` disabled (canonical) | steph-manual | blocked (steph) | Toggle on (Auth → HaveIBeenPwned). |
| FG-022 | `public.flowbond_role_rank` mutable search_path | claudia-auto | in-progress | Pinned via `ALTER FUNCTION … SET search_path = ''` loop in `supabase/migrations/009_floguard_hardening.sql`. Apply migration to resolve. |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `supabase/migrations/009_floguard_hardening.sql`. Apply migration to resolve. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |
| FG-025 | 8 `security_definer_view` ERRORs (new round 3): `public.app_vpa_{specialists,categories,workshops,products,services,testimonials,settings,offerings}_public` — views run with owner privileges, bypassing RLS on underlying tables | steph-manual | blocked (steph) | Verify underlying tables hold only published/public data (current WHERE filter is `status='published'`). If confirmed safe: recreate as `SECURITY INVOKER` (`CREATE OR REPLACE VIEW … WITH (security_invoker=on)`). Confirm with Steph before applying — changes execution context for all view reads. |
| FG-026 | `public.vpa__is_service` mutable search_path (new round 3) | claudia-auto | in-progress | Pinned via `ALTER FUNCTION … SET search_path = ''` loop in `supabase/migrations/009_floguard_hardening.sql`. Apply migration to resolve. |
| FG-027 | 119 `rls_enabled_no_policy` tables (INFO advisors; up from 72 in round 1 — 47 new tables). Schemas include fbgame, grantflow, muse, and others. | claudia-auto | open | Expected for RPC-only architecture (default-deny is the correct posture). No action needed unless a table is meant to have direct client access. Track growth each round. |

## 🧱 Security headers

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)** | claudia-auto | in-progress | ✅ Built `packages/security` (`@flowbond/security`). Round 3: wired 9 apps (web, ops, admin, astroflow, banoseco, flow3, grantflow, flowstudio, flowgarden) via PR `floguard/2026-07-13-round3` — delivers X-Frame-Options DENY + HSTS + nosniff + Referrer-Policy + Permissions-Policy + `poweredByHeader:false`. CSP not yet enabled (opt-in, per-app). Remaining: claudia (PR → claudia-m1), deck, fbid, flowedit-dashboard, reciprociudad. |
| FG-046 | `apps/voces/vercel.json` missing HSTS + Permissions-Policy + X-DNS-Prefetch-Control; X-Frame-Options set to SAMEORIGIN (weaker than DENY) | claudia-auto | in-progress | Added HSTS + Permissions-Policy + X-DNS-Prefetch-Control in PR `floguard/2026-07-13-round3`. X-Frame-Options left as SAMEORIGIN pending confirmation that no voces-in-voces embedding exists. |

## 🌐 Availability / deploy-integrity

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-050 | **INCIDENT (resolved):** `flowbond.life` + `www` served Vercel platform-level 404. Root cause: domains attached to stale duplicate project `flow-bond-layer0` (`framework:null`, broken prod build) instead of healthy `flowbond-live`. | claudia-auto | done | Detached both domains from `flow-bond-layer0`, reattached to `flowbond-live` via REST API. Verified 200 + real landing. 2026-06-28. |
| FG-051 | No availability monitoring existed — FloGuard only watched secrets/RLS/headers, not “is the front door up”. | claudia-auto | done | Shipped `uptime-sentinel.sh`: auto-discovers every verified custom domain across all team projects, flags Vercel platform `ORPHAN-404` (the FG-050 failure mode), 5xx, unreachable, and app-404 on a front door. Auth-gated apps (401/403/login-302) do NOT false-alarm. First run: 48 domains, 0 failing. |
| FG-052 | Duplicate/orphan Vercel projects (`flow-bond-layer0`, `flowbond-app`, `flowbond-live`) are landmines — any can silently steal the flowbond.life domain. | claudia-auto | done | **PAUSED** all 3 via `POST /v1/projects/<id>/pause` (503 DEPLOYMENT_PAUSED, reversible via /unpause) on 2026-06-29 — none held a custom domain. Audited first: all source preserved in git. Keeper = **flowbond-web** = flowbond.life. |
| FG-053 | Sentinel is on-demand only; drift can recur between runs. | claudia-auto | done | Scheduled via **launchd** (`~/Library/LaunchAgents/life.flowbond.floguard.uptime.plist`, every 1800s, RunAtLoad). 2026-06-28. |

## 🧹 Hygiene

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-040 | Live secrets sit in plaintext `.env.local` across ~20 dirs (git-clean, but disk/backup/cloud-sync risk) | steph-manual | blocked (steph) | Confirm FileVault on; ensure ~/Projects & ~/Downloads not cloud-synced; prefer Vercel env as prod source of truth. |
| FG-041 | `.vercel/.env.*.local` (claudia, fbid, flowgarden ×2) + `flowcdmx/.env.vercel-current` | steph-manual | blocked (steph) | ⚠️ Re-triaged: these hold **live** secrets (service_role, anthropic, db pw), not just the expired OIDC token — NOT auto-deleted. `.vercel/*` are regenerable via `vercel env pull`; `flowcdmx/.env.vercel-current` may be the only copy of some values until FG-006..009 rotate. Delete only after rotation, by hand. |
| FG-042 | No secret-scanning backstop on commit | claudia-auto | open | Add gitleaks pre-commit hook. PR. |
| FG-045 | Two migration files share the `006_` prefix: `006_tianguis_escrow.sql` + `006_floguard_hardening.sql` — non-deterministic order in migration runners | claudia-auto | open | Rename/move `006_floguard_hardening.sql` out of `supabase/migrations/` (it was a DRY-RUN template, never applied; superseded by `009_floguard_hardening.sql`). Confirm no tooling auto-applies migrations before deleting. |

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); only FG-005 is a real finding.
- New anon_security_definer functions (round 3): `flowchords_publish` (intentionally anon — rate-limited, p_key is musical key not secret), `tulumcoin_grant_admin` / `tulumcoin_set_contract` / `vpa_update_settings` / `mt_verificar_codigo` / `tulumcoin_my_admin_role` — all verified to check `auth.uid()` internally; categorized as expected architecture noise.
