# FloGuard Backlog — ClaudIA's security task list

Living remediation tracker for the FlowBond ecosystem. ClaudIA advances this
every round (see `/.claude/skills/floguard`). **No secret values here** —
credentials are referenced by `service · location · first-6 · length`.

**Status:** `open` · `in-progress` · `blocked (steph)` (human-gated) · `done`
**Owner:** `claudia-auto` (may PR a fix) · `steph-manual` (dashboard/destructive)

Seeded from the round on **2026-06-24**.

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
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param — **14 functions** (expanded 2026-08-03): `admin_bookings`, `admin_event_summary`, `admin_event_timeline`, `mt_agregar_codigo`, `mt_listar`, `flowchords_publish(p_key)`, `mt__is_admin`, `mt_admin_designs`, `mt_admin_inspiracion`, `mt_admin_ok`, `mt_admin_requests`, `mt_admin_set_inspiracion`, `mt_admin_set_request`, `tulumcoin_set_contract(p_key)` | claudia-auto + steph-manual | open | Verify the gating secret is strong (not a `Pass4u`-class value); rotate it; add rate-limit; or move behind an authenticated role instead of a param. ClaudIA: pull fn bodies + draft fix. |
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
| FG-020 | 7 `rls_policy_always_true` INSERT policies (anon/auth) on lead-capture tables: `marketing.waitlist`, `public.waitlist`, `flownation_waitlist`, `investor_events`, `moon_temple_respuestas`, `phoenix_claims`, `xelva_project_applications` | claudia-auto | open | RLS can't rate-limit → app/edge turnstile + column CHECK constraints. Schemas not in-repo; template + verify-columns query shipped in `supabase/migrations/006_floguard_hardening.sql`. Fill columns then apply. |
| FG-021 | `auth_leaked_password_protection` disabled (canonical) | steph-manual | blocked (steph) | Toggle on (Auth → HaveIBeenPwned). |
| FG-022 | `public.flowbond_role_rank` mutable search_path — **still open in live DB** (advisors confirm pin not yet applied; migration 006 authored but DRY-RUN) | claudia-auto | in-progress | Apply `supabase/migrations/006_floguard_hardening.sql` (guarded DO block, all overloads). |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy — **still open in live DB** | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `migration 006`. Safe (RPCs are definer-owned). Apply when ready. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |

## 🧱 Security headers (zero coverage — all apps)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)** | claudia-auto | in-progress | ✅ Built `packages/security`. ✅ **PR open 2026-08-03**: wired `withSecurity(config, {csp:false})` into 12 apps (web, admin, ops, deck, grantflow, banoseco, fbid, astroflow, flowedit-dashboard, flow3, reciprociudad, flowgarden). Skipped: claudia (deploy-sensitive), flowscrow (reverted), flowstudio (complex). CSP omitted in phase-1 to avoid breakage — track per-app CSP as follow-up. Remaining: claudia (needs claudia-m1 PR), flowscrow, flowstudio, CSP per-app. |

## 🌐 Availability / deploy-integrity (NEW dimension — added 2026-06-28)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-050 | **INCIDENT (resolved):** `flowbond.life` + `www` served Vercel platform-level 404. Root cause: domains attached to stale duplicate project `flow-bond-layer0` (`framework:null`, broken prod build) instead of healthy `flowbond-live`. | claudia-auto | done | Detached both domains from `flow-bond-layer0`, reattached to `flowbond-live` via REST API. Verified 200 + real landing. 2026-06-28. |
| FG-051 | No availability monitoring existed — FloGuard only watched secrets/RLS/headers, not "is the front door up". | claudia-auto | done | Shipped `uptime-sentinel.sh`: auto-discovers every verified custom domain across all team projects, flags Vercel platform `ORPHAN-404` (the FG-050 failure mode), 5xx, unreachable, and app-404 on a front door. Auth-gated apps (401/403/login-302) do NOT false-alarm. First run: 48 domains, 0 failing. |
| FG-052 | Duplicate/orphan Vercel projects (`flow-bond-layer0`, `flowbond-app`, `flowbond-live`) are landmines — any can silently steal the flowbond.life domain (each served a DIFFERENT page; caused the 404 then the wrong-landing on 2026-06-28/29). | claudia-auto | done | **PAUSED** all 3 via `POST /v1/projects/<id>/pause` (503 DEPLOYMENT_PAUSED, reversible via /unpause) on 2026-06-29 — none held a custom domain. Audited first: all source preserved in git (flowbond-live + flow-bond-layer0 ← FlowBond-HQ/FlowBond-Layer0; flowbond-app = empty CNA boilerplate; keeper flowbond-web ← flowbond-os/apps/web). Keeper carries all important info (positioning, chains, ZK, email-capture + join CTA, twitter, deck/docs links). Keeper = **flowbond-web** = flowbond.life. `flowbond-net`/`flowbond-stack` are DIFFERENT products (Living Network / org-audit), left alone. |
| FG-053 | Sentinel is on-demand only; drift can recur between runs. | claudia-auto | done | Scheduled via **launchd** (`~/Library/LaunchAgents/life.flowbond.floguard.uptime.plist`, every 1800s, RunAtLoad) → `uptime-runner.sh` → writes `uptime-status.json` + `uptime-failures.log`, fires a macOS notification ("⚠️ FloGuard: front door down") on any FAIL. Free; runs whenever the Mac is awake. 2026-06-28. |

## 🧹 Hygiene

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-040 | Live secrets sit in plaintext `.env.local` across ~20 dirs (git-clean, but disk/backup/cloud-sync risk) | steph-manual | blocked (steph) | Confirm FileVault on; ensure ~/Projects & ~/Downloads not cloud-synced; prefer Vercel env as prod source of truth. |
| FG-041 | `.vercel/.env.*.local` (claudia, fbid, flowgarden ×2) + `flowcdmx/.env.vercel-current` | steph-manual | blocked (steph) | ⚠️ Re-triaged: these hold **live** secrets (service_role, anthropic, db pw), not just the expired OIDC token — NOT auto-deleted. `.vercel/*` are regenerable via `vercel env pull`; `flowcdmx/.env.vercel-current` may be the only copy of some values until FG-006..009 rotate. Delete only after rotation, by hand. |
| FG-042 | No secret-scanning backstop on commit | claudia-auto | open | Add gitleaks pre-commit hook. PR. |

## 🔴 P1 — NEW (2026-08-03)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-058 | **CRITICAL: Admin middleware hardcoded fallback JWT secret** — `apps/admin/middleware.ts:6` fell back to the static literal `mtt-admin-secret-change-in-production-2026` when `AUTH_SECRET` env-var was unset, allowing any caller who knows that string to forge valid admin session tokens. | claudia-auto | **done** | ✅ Fixed in PR 2026-08-03: removed fallback; middleware now returns 302→/login if `AUTH_SECRET` is absent. Verify `AUTH_SECRET` is set in the admin Vercel project. |

## 🟠 P2 — NEW (2026-08-03)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-059 | **flowgarden dual-middleware ambiguity** — repo contains both `apps/flowgarden/middleware.ts` (root, session-refresh only) and `apps/flowgarden/src/middleware.ts` (full auth gate with public-path exclusions). In an `app/` router layout the root file takes precedence, silently shadowing the auth gate in `src/`. | claudia-auto | open | Investigate which file Next.js resolves; remove the shadowed one or consolidate. |

## 🟡 P3 — NEW (2026-08-03)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-055 | 15 `SECURITY DEFINER` views on canonical project (Supabase advisor: `security_definer_view`): `v_ff_funding_progress`, `app_vpa_offerings_public`, `app_vpa_categories_public`, `app_vpa_workshops_public`, `app_vpa_products_public`, `app_vpa_services_public`, `app_vpa_specialists_public`, `app_vpa_testimonials_public`, `app_vpa_settings_public`, `app_vpa_slug_aliases_public`, `app_vpa_specialist_categories_public`, `mtt_public_routes`, `mtt_admin_dashboard`, `mtt_commission_summary`, `mtt_partner_payouts` | steph-manual | open | Audit each view: if it reads data without filtering by `auth.uid()`, convert to `SECURITY INVOKER` so callers are bound by RLS. `mtt_admin_dashboard` / `mtt_commission_summary` / `mtt_partner_payouts` look especially sensitive. |
| FG-056 | 16 additional functions with mutable `search_path` on canonical project (beyond FG-022's `flowbond_role_rank`): `ff_uid`, `ff_is_admin`, `vpa__is_service`, `_tevo_jwt_email`, `tulum_holders_sealed`, `tulum_snapshot_freeze_guard`, `tulum_wallets_permanent`, `mtt_no_delete_commission`, `mtt_touch`, `grantflow.audit_results_append_only`, `grantflow.audit_gate`, `grantflow.enforce_review_state`, `mtt_new_code`, `ff_ledger_no_mutate`, `lvb.team_inbox`, `_lvb_jwt_email` | claudia-auto | open | Extend `006_floguard_hardening.sql` or draft a new migration that applies `SET search_path = ''` (or the appropriate pinned schema) to each function. |
| FG-057 | Extensions `pg_net` and `postgis` installed in the `public` schema | steph-manual | blocked (steph) | Supabase dashboard → Database → Extensions: move to a dedicated schema (e.g. `extensions`). Note: PostGIS moves may need app query adjustments (PostGIS functions are schema-qualified). |

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); only FG-005 is a real finding.
