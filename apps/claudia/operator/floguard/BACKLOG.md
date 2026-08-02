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

## 🔐 Data-exposure round (added 2026-08-02)

| ID | Finding | Owner | Status | Action |
|----|---------|-------|--------|--------|
| FG-060 | **CRITICAL (resolved):** `studio-audio` was a **public** bucket holding the Issa Codex stems — Moon's cloned voice, 67 objects / 262 MB. Any object was downloadable unauthenticated by path; the role-less `sa_obj_read` policy let any holder of the publishable key **list** the whole bucket. The finished master (`studio-audio-master`) was already private+signed; only the stems were left open. | claudia-auto | done | Shipped signed-URL stem delivery to `audio.flowme.one` (CF Pages) **first**, verified live, then flipped the bucket private and rewrote `sa_obj_read`/`sa_obj_write`/`sa_obj_update` to `authenticated + studio_audio_can_read_master(name)` (mirrors the master). Verified: uncached anon fetch now 400; originator reads true; stranger false. Cached copies expire via `max-age=3600`. 2026-08-02. |
| FG-061 | `sa_obj_write` / `sa_obj_update` allowed **any authenticated user** to insert/overwrite any object in `studio-audio` (bucket-id check only, no ownership predicate). | claudia-auto | done | Scoped to project members/originator in the same migration as FG-060. |
| FG-062 | **HIGH:** Holy Honey data-room access code is a shared 4-digit value hardcoded as a fallback in `src/app/holy-honey/server.ts:23` **and** written literally into the committed `README.md`, together with the viewer allow-list. Verified live: the published code unlocks the partnership data room (`{"ok":true,"viewer":"Steph"}`). Repo is private, so not world-readable — but every repo collaborator holds the keys to the partnership documents, and 4 digits @ 5/10min is brute-forceable. | claudia-auto | done | **Replaced the shared PIN with per-person identity** rather than rotating it. email → Supabase one-time code (8 digits, matching `mailer_otp_length` and the FBID hub) → real FBID; allow-list re-checked server-side *after* auth, so a valid FlowBond login alone does not open the room. Viewers are rows in `holy_honey_viewers` (add/remove = row change, not redeploy); sessions and every audit row now carry email + fbid. Step 1 replies "sent" regardless of membership, so the gate is not enumerable. README scrubbed; `HH_ACCESS_CODE`/`HH_AUTHORIZED_VIEWERS` obsolete — delete from Vercel env. Verified live: old PIN → 400, unknown address → generic sent + logged `not on allow-list`, allow-listed address → `recovery_token` minted. 2026-08-02. **Steph still owes:** add Earl/Mariano/Sydney by email (their addresses were never in the repo, so they could not be seeded). |
| FG-063 | `tevo-assets` (public bucket) carried a role-less broad SELECT policy enabling full enumeration. | claudia-auto | done | Dropped `tevo assets public read`; public object URLs still resolve, listing no longer possible. Bucket currently holds 0 objects. |
| FG-064 | **BrandMark's Supabase (`sjhtsdbcxmszqyusurmq`) is in a separate account** outside the ClaudIA PAT — never covered by any FloGuard round. Black-box probe with the publishable key: `tax_settings` is anon-readable (1 row, config only); 7 further tables (`promo_leads`, `rfq_submissions`, `questionnaire_responses`, `mockup_purchases`, `promo_mockup_*`, `global_margins`) return 200 to anon but are **currently empty**, so whether their policies are permissive cannot be settled black-box — they will hold customer PII once the funnel runs. | steph-manual | blocked (steph) | Need a PAT/service key for the BrandMark Supabase account to run advisors + the RLS matrix. Until then this project is an unaudited surface. |
| FG-065 | `public.spatial_ref_sys` — RLS off **and** `anon` holds INSERT/UPDATE/DELETE/TRUNCATE. Only table in the canonical DB with anon write and no RLS. No PII; an anon client can truncate it and break every PostGIS query. | steph-manual | blocked (supabase) | **Attempted and could not be fixed from our connection.** The grants were made *by* `supabase_admin`; the Management API query runs as `postgres`, and Postgres only lets the grantor revoke — so `REVOKE ... FROM anon, authenticated` executes without error and changes nothing (verified: ACL still `anon=arwdDxtm/supabase_admin`). Options: raise with Supabase support, or move PostGIS out of `public` (FG-068) which retires the table from the exposed schema. Impact is availability-only (no PII); an anon client could truncate it and break PostGIS queries. |
| FG-066 | `fbid_backup_20260604` — 10 tables, RLS off, holding 12 users' identity data (auth snapshots, wallet connections). **Not** API-reachable (schema not in `db_schema`, no anon grants) so not an exposure, but an unnecessary second copy of identity PII from June. | steph-manual | blocked (steph) | Confirm superseded, then drop the schema. |
| FG-067 | Moon (`Kelsey — Moon`, sole member of `issa-codex-audiobook`) has `fbid = null` — she never claimed her seat, so she cannot read the already-private master, and after FG-060 cannot read the stems either. Her claim token exists and is unused. | steph-manual | blocked (steph) | Claim link written to `~/.claudia/handoff/moon-claim-link.json` (chmod 600, outside git). Send it to Moon; she claims once and both buckets open for her. |

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
