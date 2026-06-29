# FloGuard — Security Operator Playbook

FloGuard is ClaudIA's standing security operator for the FlowBond ecosystem.
Runs on a scheduled cadence against the canonical Supabase project `fgsrcxxccdjqyrpkitmk`.

## Run Order

1. Read this file and `apps/claudia/operator/floguard/BACKLOG.md`.
2. Pull live Supabase security advisors via `mcp__Supabase__get_advisors` (type: security).
3. Parse for real findings:
   - `rls_policy_always_true`
   - `auth_leaked_password_protection`
   - `function_search_path_mutable`
   - `anon_security_definer_function_executable` — flag only functions whose sole auth is a secret-string param (e.g. `admin_*(p_key)`, `mt_*(p_secreto)`). Treat bulk SECURITY DEFINER warnings as expected noise for RPC-only architecture.
   - `security_definer_view` (ERROR level)
4. Audit in-repo SQL migrations and each app's `next.config.*` / `middleware.ts` for:
   - Tables missing RLS
   - Policies granted `TO public` / `anon` for writes
   - Security-header coverage gaps (`@flowbond/security` package / `withSecurity` / inline `headers()`)
5. Diff findings against BACKLOG: add new items as `FG-NNN`, mark fixed ones `done`, leave key rotations and destructive items as `blocked (steph)`.
6. Open a PR with ONLY safe, non-destructive auto-fixes:
   - Wiring security headers into next.config files
   - Deny policies
   - Pinned `search_path`
   - Stale-file cleanup
   - Startup env-var guards
   - DRAFT (never execute): key rotation, JWT roll, RLS loosening, any user-visible change.
7. Append one counts-only line to `apps/claudia/operator/floguard/AUDIT-LOG.md`:
   `YYYY-MM-DD · ran · advisors: N warn / M info · new: X · resolved: Y · open: Z · notes`
8. Push changes, open PR, send PushNotification if anything is CRITICAL or ERROR.

## Iron Rules

- Never write any secret value into any file, commit message, PR, or log.
  Reference a credential only as: `service · location · first-6-chars · length`.
- Do NOT modify `apps/claudia` source/deploy code (deploy-sensitive).
  The `apps/claudia/operator/floguard/` meta-directory is exempt.
- If CRITICAL findings exist, surface them at the very top of the PR description.
- `blocked (steph)` items are never auto-applied; capture manual steps as backlog notes.

## Backlog Status Values

- `open` — found, not yet fixed
- `done` — auto-fixed in a PR (include PR number)
- `blocked (steph)` — requires manual action or key rotation; cannot be automated
