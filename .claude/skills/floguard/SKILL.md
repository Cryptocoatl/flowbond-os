# FloGuard — FlowBond Standing Security Operator

FloGuard is the scheduled security operator for the FlowBond monorepo. It runs
on a cron schedule and produces one PR (safe fixes only) + one audit-log line
per run.

## Canonical project
`fgsrcxxccdjqyrpkitmk` (us-east-2, "FlowBond-life")
The stale project `eoajujwpdkfuicnoxetk` must **never** be targeted.

## Run order

1. Read this SKILL.md and `apps/claudia/operator/floguard/BACKLOG.md`.
2. Pull live Supabase security advisors via `mcp__supabase__get_advisors` (project `fgsrcxxccdjqyrpkitmk`). Parse for real findings: `rls_policy_always_true`, `auth_leaked_password_protection`, `function_search_path_mutable`, `anon_security_definer_function_executable`. Treat bulk `*_security_definer_function_executable` warnings as expected noise for the RPC-only architecture.
3. Audit in-repo SQL migrations and each app's `next.config.*`/`middleware.ts` for: tables missing RLS, policies granted TO public/anon for writes, security-header coverage gaps.
4. Diff findings against BACKLOG.md: add new items as `FG-NNN`, mark fixed ones `done`, leave key rotations and other destructive items as `blocked (steph)`.
5. Open a PR with **only safe, non-destructive** auto-fixes. Do NOT modify `apps/claudia`.
6. Append one counts-only line to `apps/claudia/operator/floguard/AUDIT-LOG.md`.
7. Push notification if anything is CRITICAL or if the run failed.

## PR rules

- Branch: `floguard/YYYY-MM-DD-security-audit`
- DRAFT only for key rotations, JWT rolls, RLS loosenings.
- Auto-fix examples: wiring `withSecurity` into a next.config, adding deny RLS policies, pinning search_path, removing hardcoded fallback secrets (not the credential itself).
- CRITICAL findings go at the **top** of the PR description, never buried.

## IRON RULE

Never write any secret value into any file, commit message, PR, or log.
Reference a credential only as: `service · location · first-6-chars · length`

## Security header baseline

All Next.js apps should export security headers in `next.config.ts` via a
`headers()` function. Minimum safe set (no CSP required — add per-app later):

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-DNS-Prefetch-Control: on
```

Excluded from header wiring: `apps/claudia` (deploy-sensitive; Steph owns).

## Known-intentional noise (suppress in future runs)

- `flowedit_content_overrides` anon SELECT WHERE status='live' — SDK requires this.
- `flowscrow_signatures/witnesses/comments` anon SELECT — vault status page by design.
- `astroflow.guest_invite(text)` anon EXECUTE — personalized invite link by design.
- `flowscrow_vault_*` anon EXECUTE — vault public surface by design.
- Bulk `*_security_definer_function_executable` advisors — RPC-only architecture, expected.

## Backlog item states

- `open` — unresolved, not yet assigned
- `done` — fixed (note PR or migration)
- `blocked (steph)` — requires destructive/key-rotation action by the repo owner
