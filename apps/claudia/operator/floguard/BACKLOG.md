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
| FG-005 | Anon-reachable `SECURITY DEFINER` admin RPCs gated only by a string param: `admin_bookings(p_key)`, `admin_event_summary(p_key)`, `admin_event_timeline(p_key,p_code)`, `mt_agregar_codigo(p_secreto)`, `mt_listar(p_secreto)` on canonical project | claudia-auto + steph-manual | open | Verify the gating secret is strong (not a `Pass4u`-class value); rotate it; add rate-limit; or move behind an authenticated role instead of a param. ClaudIA: pull fn bodies + draft fix. |
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
| FG-022 | `public.flowbond_role_rank` mutable search_path | claudia-auto | in-progress | Pinned via guarded DO block in `migration 006` (all overloads). DRY-RUN — apply. |
| FG-023 | `banoseco_donations` / `banoseco_deposits` RLS-on, no policy | claudia-auto | in-progress | Explicit `restrictive … using(false)` deny policies in `migration 006`. Safe (RPCs are definer-owned). DRY-RUN — apply. |
| FG-024 | `flowedit` migration 005 ships bcrypt hashes for shared `Pass4u` password | steph-manual | blocked (steph) | Reset both admin passwords; stop seeding hashes in migrations. |

## 🧱 Security headers (zero coverage — all apps)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-030 | No CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS on any app; `flowme.one` leaks `x-powered-by`; **claudiaflow.life vault is iframe-able (clickjacking)** | claudia-auto | in-progress | ✅ Built `packages/security` (`@flowbond/security`: `securityHeaders()`, `withSecurity()`, `CSP_PRESETS` incl. webgl); typechecks clean. Per-app wiring is a one-liner (`export default withSecurity(cfg, {csp})` + add to `transpilePackages` + workspace dep) but must land on **each app's own branch** (claudia is deploy-sensitive on `claudia-m1` — wiring reverted on `flowscrow`). Roll out app-by-app, claudia first. |

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

---

### Notes
- `.gitignore` correctly covers `.env*` ecosystem-wide — **nothing leaked to git**. All rotations are precautionary (disk/backup vector).
- Rolling the canonical JWT secret (FG-001) regenerates `anon` too and logs out active sessions — coordinate, or use the new key system.
- The bulk `*_security_definer_function_executable` advisor warnings are expected for the RPC-only architecture (those fns validate `auth.uid()`); only FG-005 is a real finding.
