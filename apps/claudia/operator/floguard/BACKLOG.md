# FloGuard Backlog — ClaudIA's security task list

Living remediation tracker for the FlowBond ecosystem. ClaudIA advances this
every round (see `/.claude/skills/floguard`). **No secret values here** —
credentials are referenced by `service · location · first-6 · length`.

**Status:** `open` · `in-progress` · `blocked (steph)` (human-gated) · `done`
**Owner:** `claudia-auto` (may PR a fix) · `steph-manual` (dashboard/destructive)

Seeded from the round on **2026-06-24**. Last updated **2026-08-10**.

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
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param: `admin_bookings(p_key)`, `admin_event_summary(p_key)`, `admin_event_timeline(p_key,p_code)`, `mt_agregar_codigo(p_secreto)`, `mt_listar(p_secreto)` + expanded set (see FG-068) | claudia-auto + steph-manual | open | Verify the gating secret is strong; rotate it; add rate-limit; or move behind an authenticated role. ClaudIA: pull fn bodies + draft fix. |
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
| FG-020 | 7 `rls_policy_always_true` INSERT policies (anon/auth) on lead-capture tables | claudia-auto | **done** (tentative) | Advisor no longer reports this as of 2026-08-10 — policies appear to have been tightened or removed. Verify in dashboard. |
| FG-021 | `auth_leaked_password_protection` disabled (canonical) | steph-manual | **done** (tentative) | Advisor no longer reports this as of 2026-08-10 — toggle appears to have been enabled. Verify in Auth settings. |
| FG-022 | `public.flowbond_role_rank` mutable search_path | claudia-auto | in-progress | Pinned via guarded DO block in `migration 006` (all overloads). DRY-RUN — apply. Also now covered for 20 additional functions in `migration 009` (FG-061). |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `migration 006`. DRY-RUN — apply. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |

## 🔴 P1-adjacent — CRITICAL code finding (new 2026-08-10)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-070 | **Hardcoded fallback JWT signing secret** in `apps/admin/middleware.ts` (publicly visible in repo). If `AUTH_SECRET` env var is unset, any session token can be forged using the known string. | claudia-auto + steph-manual | **in-progress** | **ClaudIA:** Removed hardcoded fallback in PR (empty-string fallback → fail-closed; jose rejects empty key → redirect to /login). **Steph:** Must set `AUTH_SECRET` env var to a 32-byte random in Cloudflare/Vercel admin app env. Prior hardcoded string is now public and must be treated as compromised — do not use it even temporarily. `openssl rand -base64 32` |

## 🔴 ERROR-level advisor findings (new 2026-08-10)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-060 | `security_definer_view` (ERROR) — 16 views defined with SECURITY DEFINER: `app_vpa_*_public` (×10), `brandmark_lead_pool`, `mtt_admin_dashboard`, `mtt_commission_summary`, `mtt_partner_payouts`, `mtt_public_routes`, `v_ff_funding_progress`. SECURITY DEFINER views bypass RLS — any role with SELECT privilege on the view sees all rows the view author could see. Most concerning: `mtt_admin_*` views may expose admin-only data to authenticated users. | claudia-auto + steph-manual | open | Review each view's SELECT grant and filter clauses. Safe views (public catalog with no PII rows): acceptable as-is if explicitly confirmed. Admin-scope views: either add `WHERE auth.uid() = owner_col` filter or remove SECURITY DEFINER and use RLS instead. ClaudIA to pull view definitions via SQL next round; Steph to confirm which are intentionally public. |

## 🟠 New P2 — expanded anon admin surface (new 2026-08-10)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-068 | Additional anon-reachable `SECURITY DEFINER` functions with secret/key params beyond FG-005: `public.claudia_vault_mark(p_key text)` (ZK vault!), `public.flowchords_publish(…p_key text…)`. `claudia_vault_mark` is the most sensitive — it can mark vault steps complete via a string key, bypassing FBID auth. | steph-manual | open | Pull function bodies for claudia_vault_mark and flowchords_publish. If the p_key param is a shared admin secret (not a per-user derived key), move these behind `auth.uid()` authentication or strong HMAC. Especially urgent for the ZK vault function. |
| FG-069 | `rls_enabled_no_policy` — 227 tables across 10+ schemas (astroflow ×4, fbgame ×2, grantflow ×8, lvb ×5, muse ×6, origo ×7, raiz ×3, reciprociudad ×6, refirides ×4, sani ×9, tevo ×7, plus existing public.* tables). Up from ~30 in June. All are RPC-only deny-by-default by design; this is structural noise, but explicit deny policies silence advisors and make intent auditable. | claudia-auto | open | Migration 009 adds explicit deny policies for `muse.*` tables. Remaining schemas: schedule follow-up migration per schema (grantflow, origo, sani next — they hold sensitive data). |

## 🛡️ DB hardening — search_path (new 2026-08-10)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-061 | `function_search_path_mutable` — 20 new functions beyond FG-022: `grantflow.audit_gate`, `grantflow.audit_results_append_only`, `grantflow.enforce_review_state`, `lvb.team_inbox`, `public._lvb_jwt_email`, `public._tevo_jwt_email`, `public.claudia_owns`, `public.claudia_scope_ok`, `public.ff_is_admin`, `public.ff_ledger_no_mutate`, `public.ff_uid`, `public.mtt_new_code`, `public.mtt_no_delete_commission`, `public.mtt_touch`, `public.portal888__append_only`, `public.spine__titulo`, `public.tulum_holders_sealed`, `public.tulum_snapshot_freeze_guard`, `public.tulum_wallets_permanent`, `public.vpa__is_service` | claudia-auto | in-progress | `ALTER FUNCTION … SET search_path = ''` via `migration 009`. DRY-RUN — apply. |

## 🧱 Security headers (zero coverage — all apps)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)**. Zero apps wired with `withSecurity` as of 2026-08-10. | claudia-auto | in-progress | ✅ Built `packages/security` (`@flowbond/security`: `securityHeaders()`, `withSecurity()`, `CSP_PRESETS`). Per-app wiring is a one-liner but must land on each app's own branch. Roll out app-by-app, claudia first. (claudia is deploy-sensitive on `claudia-m1` — coordinate separately.) |

## 🌐 Availability / deploy-integrity

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-050 | **INCIDENT (resolved):** `flowbond.life` + `www` served Vercel platform-level 404. Root cause: domains attached to stale duplicate project `flow-bond-layer0`. | claudia-auto | done | Detached both domains from `flow-bond-layer0`, reattached to `flowbond-live` via REST API. Verified 200 + real landing. 2026-06-28. |
| FG-051 | No availability monitoring existed. | claudia-auto | done | Shipped `uptime-sentinel.sh`: auto-discovers every verified custom domain, flags ORPHAN-404/5xx/unreachable. First run: 48 domains, 0 failing. |
| FG-052 | Duplicate/orphan Vercel projects (`flow-bond-layer0`, `flowbond-app`, `flowbond-live`). | claudia-auto | done | **PAUSED** all 3 via `POST /v1/projects/<id>/pause` on 2026-06-29 — none held a custom domain. Source preserved in git. Keeper = `flowbond-web` = flowbond.life. |
| FG-053 | Sentinel is on-demand only. | claudia-auto | done | Scheduled via **launchd** (every 1800s, RunAtLoad) → `uptime-runner.sh` → writes `uptime-status.json` + `uptime-failures.log`, fires macOS notification on FAIL. |

## 🧹 Hygiene

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-040 | Live secrets sit in plaintext `.env.local` across ~20 dirs (git-clean, but disk/backup/cloud-sync risk) | steph-manual | blocked (steph) | Confirm FileVault on; ensure ~/Projects & ~/Downloads not cloud-synced; prefer Vercel env as prod source of truth. |
| FG-041 | `.vercel/.env.*.local` (claudia, fbid, flowgarden ×2) + `flowcdmx/.env.vercel-current` | steph-manual | blocked (steph) | ⚠️ Re-triaged: these hold **live** secrets (service_role, anthropic, db pw) — NOT auto-deleted. Delete only after rotation, by hand. |
| FG-042 | No secret-scanning backstop on commit | claudia-auto | open | Add gitleaks pre-commit hook. PR. |
| FG-067 | **Duplicate `006_` migration prefix** — `006_floguard_hardening.sql` and `006_tianguis_escrow.sql` share the same prefix in `supabase/migrations/`. A migration runner sorting by filename may fail, skip, or conflict on second application. | claudia-auto | open | Rename one file: suggest `006a_tianguis_escrow.sql` (since `006_floguard_hardening.sql` was authored as the primary hardening migration) or renumber the tianguis file to `006b_`. Must also update any Supabase migration state tracking. |
| FG-071 | `apps/flowstudio/lib/origo-read.ts` and `origo-register.ts` both access `SUPABASE_SERVICE_ROLE_KEY` as a fallback, with no `import 'server-only'` guard. Safe today (callers are API routes/server components) but a footgun if imported in a client component. | claudia-auto | open | Add `server-only` as a dep in `apps/flowstudio/package.json`, then add `import 'server-only'` at top of both files. Alternatively, remove the `SERVICE_ROLE_KEY` fallback entirely — the RPC is SECURITY DEFINER and anon-accessible, so the anon key suffices for both functions. |

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); only FG-005 / FG-068 are real findings.
- FG-020 and FG-021 are tentatively marked done based on advisor absence — verify in dashboard before closing definitively.
- FG-070 (hardcoded admin JWT secret): the fallback string is now public knowledge from the repo; `AUTH_SECRET` MUST be set to a fresh random value in production immediately.
