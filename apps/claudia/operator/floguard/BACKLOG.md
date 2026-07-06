# FloGuard Security Backlog

Items are added by FloGuard on each audit run. Severity: CRITICAL · HIGH · WARN · INFO.
States: open · done · blocked (steph).

---

## FG-001 · CRITICAL · open → blocked (steph)
**Plaintext admin credentials hardcoded in `apps/admin/src/lib/auth.ts`**

Lines 9-10 commit `ADMIN_USER = 'Admin'` and `ADMIN_PASS = 'MTTadmin2026'` in
plaintext. Any reader of this repository can authenticate to the Mountain Dogs
admin panel with these credentials.

**Manual steps (Steph):**
1. In Vercel dashboard for the `admin` project, add env vars:
   `ADMIN_USER` = a new username of your choosing
   `ADMIN_PASS` = a new strong password (suggest `openssl rand -base64 24`)
2. Update `apps/admin/src/lib/auth.ts` to read from env:
   ```ts
   const ADMIN_USER = process.env.ADMIN_USER ?? (() => { throw new Error('ADMIN_USER must be set') })()
   const ADMIN_PASS = process.env.ADMIN_PASS ?? (() => { throw new Error('ADMIN_PASS must be set') })()
   ```
3. Rotate in Vercel, redeploy, verify login works.
4. Consider git history rewrite (`git filter-repo`) to remove the committed values — optional but recommended.

---

## FG-002 · CRITICAL · partially fixed by PR floguard/2026-07-06-security-audit
**Default JWT secret matches public `.env.example` value in `apps/admin`**

`AUTH_SECRET` had a fallback of `'mtt-admin-secret-change-in-production-2026'` which
is also the value in `.env.example`. This PR removes the fallback (throws if unset)
but the **old value is in git history and must be rotated**.

**Manual steps (Steph):**
1. Generate a new secret: `openssl rand -base64 32`
2. Set `AUTH_SECRET=<new-value>` in Vercel for the `admin` project.
3. Redeploy — all existing sessions will be invalidated (expected).

---

## FG-003 · HIGH · open → blocked (steph)
**Plaintext seed password committed in `supabase/migrations/005_flowedit_auth.sql`**

Line 48: comment `-- password = 'Pass4u' for all` alongside bcrypt hashes and real
`@flownation.world` email addresses. The plaintext password is permanently in git history.

**Manual steps (Steph):**
1. Log in to Supabase dashboard for project `fgsrcxxccdjqyrpkitmk`.
2. Update `flowedit_users` passwords via SQL:
   ```sql
   UPDATE flowedit_users SET password_hash = crypt('<new-password>', gen_salt('bf'))
   WHERE id IN ('usr_steph', 'usr_michelle');
   ```
3. Remove or redact the comment in a new migration:
   ```sql
   -- 006_flowedit_auth_comment_redact.sql
   -- Removes plaintext password comment from migration history documentation.
   -- (No schema change; comment was in 005 source only.)
   ```
4. Optional: git history rewrite to remove `-- password = 'Pass4u'` from the file.

---

## FG-004 · HIGH · fixed by PR floguard/2026-07-06-security-audit
**No security headers across 13 Next.js apps**

Zero apps had X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or
Permissions-Policy headers. This PR adds the baseline safe set to all 13
non-claudia apps via `headers()` in each `next.config.ts`.
`apps/claudia` is excluded (deploy-sensitive — wire manually after Steph review).

---

## FG-005 · INFO · open → blocked (steph)
**Dead `current_core_identity_id()` SECURITY DEFINER function with unpinned search_path**

Carried from SECURITY-AUDIT-fbid.md finding #2 (2026-06-04). The function is
SECURITY DEFINER with unpinned `search_path`, references the archived
`flowbond_core_identities` table, and has 0 code callers. Recommend DROP.

**Manual steps (Steph):**
```sql
DROP FUNCTION IF EXISTS public.current_core_identity_id();
-- Verify: SELECT proname FROM pg_proc WHERE proname = 'current_core_identity_id';
```

---

## FG-006 · INFO · open → blocked (steph)
**anon EXECUTE grants on points/mission RPCs — code review needed**

Carried from SECURITY-AUDIT-fbid.md finding #7 (2026-06-04). Functions
`add_points`, `complete_mission`, `process_referral_conversion` are callable by
`anon`. Verify each checks `auth.uid()` internally and cannot be called by
unauthenticated users to mint points. If not: tighten to `authenticated`/`service_role`.

---

## FG-007 · INFO · open
**Migration 001 not in `supabase/migrations/`**

The directory starts at `002_flowgarden_init.sql`. The base schema
(`flowbond_users`, `flowbond_core_identities`, `flowbond_auth_accounts`,
`events`, `missions`, `products`, etc.) was applied directly against the project
and never committed. Low-priority documentation gap; affects reproducibility of
a fresh database from migrations.

**Action:** Reconstruct migration 001 via `pg_dump --schema-only` on project
`fgsrcxxccdjqyrpkitmk` and commit as `001_baseline.sql`.

---

## FG-008 · INFO · open
**Supabase MCP unavailable during this run — live advisors not pulled**

The `get_advisors` tool was not accessible in this scheduled session. All findings
are static-analysis only (migration files + source code). The live Supabase advisor
scan (`rls_policy_always_true`, `auth_leaked_password_protection`,
`function_search_path_mutable`, `anon_security_definer_function_executable`) was skipped.

**Action:** Re-run with Supabase MCP active, or run `security/flowguard-scan.sql`
manually against project `fgsrcxxccdjqyrpkitmk` and compare against this backlog.

---

## Confirmed intentional (suppress noise)

- `flowedit_content_overrides` anon SELECT (status='live') — FlowEdit SDK requires it.
- `flowscrow_signatures/witnesses/comments` anon SELECT — vault status page by design.
- `astroflow.guest_invite(text)` anon EXECUTE — personalized invite bearer link.
- `flowscrow_vault_*` anon EXECUTE — vault public surface.
- All Claudia RPCs — properly scoped to `auth.uid()`, pinned `search_path`, correct grants.
- All FlowScrow write RPCs — role-enforced, pinned `search_path`, no self-confirmation.
- All FlowGarden tables — owner-only RLS (`user_id = auth.uid()`), all 11 tables covered.
