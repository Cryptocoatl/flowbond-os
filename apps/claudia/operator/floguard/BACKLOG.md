# FloGuard Backlog — ClaudIA's security task list

Living remediation tracker for the FlowBond ecosystem. ClaudIA advances this
every round (see `/.claude/skills/floguard`). **No secret values here** —
credentials are referenced by `service · location · first-6 · length`.

**Status:** `open` · `in-progress` · `blocked (steph)` (human-gated) · `done`
**Owner:** `claudia-auto` (may PR a fix) · `steph-manual` (dashboard/destructive)

Seeded from the round on **2026-06-24**. Last updated **2026-07-20**.

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
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param — **expanded 2026-07-20: now 21 fns** (was 5): `admin_bookings`, `admin_event_summary`, `admin_event_timeline`, `mt__is_admin`, `mt_admin_designs`, `mt_admin_inspiracion`, `mt_admin_ok`, `mt_admin_requests`, `mt_admin_set_inspiracion`, `mt_admin_set_request`, `mt_agregar_codigo`, `mt_guardar_pod`, `mt_listar`, `mt_listar_inspiracion`, `mt_listar_pods`, `mt_pod`, `mt_pods_de`, `mt_solicitar_acceso`, `mt_subir_inspiracion`, `mt_verificar_codigo`, `mt_verificar_codigo` | claudia-auto + steph-manual | open | Verify gating secrets are strong; rotate; add rate-limit; or move behind authenticated role. 21 RPCs now surfaced vs 5 originally — new mt_* fns added since seed round. |
| FG-006 | `ADMIN_PASSWORD="Pass4u"` (flowcdmx) — guessable | steph-manual | blocked (steph) | Replace with 32-byte random. |
| FG-007 | `ADMIN_SESSION_SECRET` `flowcdmx-2026…36` — predictable | steph-manual | blocked (steph) | Regenerate random. |
| FG-008 | DB password `FlowBond-11:11` in services/api `DATABASE_URL` | steph-manual | blocked (steph) | Roll DB password (Supabase → Settings → Database). |
| FG-009 | DB password `FlowNation1440` in flowcdmx POSTGRES_* | steph-manual | blocked (steph) | Roll on `melshaxfoeruvyzrpvec`. |
| FG-010 | NextAuth `AUTH_SECRET` `pRL/tCa…44` (mohe-web) | steph-manual | blocked (steph) | `openssl rand -base64 32`. |
| FG-011 | GitHub OAuth `AUTH_GITHUB_ID/SECRET` (mohe-web) | steph-manual | blocked (steph) | Regenerate client secret. |
| FG-012 | CDMX project creds: `sb_secret_…35` + JWT secret `5ZXi…88` (`melshaxfoeruvyzrpvec`, paused) | steph-manual | blocked (steph) | Rotate when project next active. |
| FG-056 | `apps/admin/middleware.ts` line 6: hardcoded JWT fallback `'mtt-admin-secret-change-in-production-2026'` — used if `AUTH_SECRET` env var is unset | steph-manual | blocked (steph) | Set `AUTH_SECRET` in all environments for `apps/admin` (Vercel env + local .env); remove fallback from code or throw instead of defaulting. |

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
| FG-022 | Mutable `search_path` on 9 public functions — **expanded 2026-07-20** (was 1): `flowbond_role_rank`, `ff_uid`, `ff_is_admin`, `vpa__is_service`, `_tevo_jwt_email`, `tulum_holders_sealed`, `tulum_snapshot_freeze_guard`, `tulum_wallets_permanent`, `ff_ledger_no_mutate` | claudia-auto | in-progress | All 9 fns now covered by guarded DO block in `migration 006` (expanded 2026-07-20). DRY-RUN — apply when ready. |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `migration 006`. Safe (RPCs are definer-owned). DRY-RUN — apply. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |
| FG-054 | **9 `security_definer_view` ERRORs** (NEW 2026-07-20): `public.v_ff_funding_progress`, `public.app_vpa_offerings_public`, `public.app_vpa_specialists_public`, `public.app_vpa_categories_public`, `public.app_vpa_workshops_public`, `public.app_vpa_products_public`, `public.app_vpa_services_public`, `public.app_vpa_testimonials_public`, `public.app_vpa_settings_public` | steph-manual | blocked (steph) | `ALTER VIEW … SET (security_invoker = on)` drafted in `migration 009_floguard_definer_views.sql`. ⚠️ Pre-flight required: verify anon/authenticated roles have SELECT on underlying tables — converting to invoker can break views. Apply manually after verification. |
| FG-055 | **2 public storage buckets allow file listing** (NEW 2026-07-20): `studio-audio` (policy `sa_obj_read`) and `tevo-assets` (policy `tevo assets public read`) — exposes full asset inventory to anon callers | steph-manual | blocked (steph) | Review intent: if assets are private, tighten SELECT policy to individual file reads (remove bucket-list permission). If listing is intentional (e.g. CDN pattern), accept + document. Dashboard → Storage → Policies. |

## 🧱 Security headers

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)** | claudia-auto | in-progress | ✅ `packages/security` built. ✅ `apps/web` wired 2026-07-20 (this PR). Remaining: all other apps need wiring app-by-app. Do NOT touch `apps/claudia` without Steph (deploy-sensitive, claudia-m1 branch). |

## 🌐 Availability / deploy-integrity

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-050 | **INCIDENT (resolved):** `flowbond.life` + `www` served Vercel platform-level 404. Root cause: domains attached to stale duplicate project `flow-bond-layer0` (`framework:null`, broken prod build) instead of healthy `flowbond-live`. | claudia-auto | done | Detached both domains from `flow-bond-layer0`, reattached to `flowbond-live` via REST API. Verified 200 + real landing. 2026-06-28. |
| FG-051 | No availability monitoring existed — FloGuard only watched secrets/RLS/headers, not "is the front door up". | claudia-auto | done | Shipped `uptime-sentinel.sh`: auto-discovers every verified custom domain across all team projects, flags Vercel platform `ORPHAN-404` (the FG-050 failure mode), 5xx, unreachable, and app-404 on a front door. Auth-gated apps (401/403/login-302) do NOT false-alarm. First run: 48 domains, 0 failing. |
| FG-052 | Duplicate/orphan Vercel projects (`flow-bond-layer0`, `flowbond-app`, `flowbond-live`) are landmines — any can silently steal the flowbond.life domain. | claudia-auto | done | Paused all 3 via `POST /v1/projects/<id>/pause` (503 DEPLOYMENT_PAUSED, reversible via /unpause) on 2026-06-29. |
| FG-053 | Sentinel is on-demand only; drift can recur between runs. | claudia-auto | done | Scheduled via launchd (`~/Library/LaunchAgents/life.flowbond.floguard.uptime.plist`, every 1800s) → `uptime-runner.sh`. |

## 🧹 Hygiene

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-040 | Live secrets sit in plaintext `.env.local` across ~20 dirs (git-clean, but disk/backup/cloud-sync risk) | steph-manual | blocked (steph) | Confirm FileVault on; ensure ~/Projects & ~/Downloads not cloud-synced; prefer Vercel env as prod source of truth. |
| FG-041 | `.vercel/.env.*.local` (claudia, fbid, flowgarden ×2) + `flowcdmx/.env.vercel-current` | steph-manual | blocked (steph) | ⚠️ Re-triaged: these hold **live** secrets (service_role, anthropic, db pw), not just the expired OIDC token — NOT auto-deleted. Delete only after rotation, by hand. |
| FG-042 | No secret-scanning backstop on commit | claudia-auto | done | ✅ Added `.githooks/pre-commit` (gitleaks protect --staged) + `.gitleaks.toml` config (2026-07-20 PR). Activate per clone: `git config core.hooksPath .githooks`. |

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); only FG-005 is a real finding among them.
- `migration 006` and `009` are DRY-RUN; apply manually via Supabase dashboard SQL editor or CLI.
- Duplicate migration prefix `006_` (`006_floguard_hardening.sql` + `006_tianguis_escrow.sql`) — rename one if using sequential migration tooling.
