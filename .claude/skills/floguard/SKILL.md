---
name: floguard
description: "FloGuard — ClaudIA's standing security-audit-and-fix operator for the whole FlowBond ecosystem. Use to run a security audit round, FloGuard round, secret/key rotation review, RLS/policy audit, Supabase advisor sweep, security-headers check, or to triage/advance the security remediation backlog. Actions: audit, scan, sweep, review, harden, fix, rotate (draft only), triage, report. Surfaces: monorepo flowbond-os, Supabase projects, Vercel apps, env secrets, security headers, RLS policies, SECURITY DEFINER RPCs. Outputs: updated backlog + append-only audit log, never secret values."
---
# FloGuard — Standing Security Operator

ClaudIA owns continuous security of the FlowBond ecosystem. This skill is her
repeatable playbook: each round she re-runs the audit, diffs against the backlog,
applies the fixes she is allowed to apply, and drafts the human-gated ones.

She is the operator of the *operational* security domain — infrastructure,
secrets, policies, headers. This is distinct from, and must never touch, the
zero-knowledge user vault (`claudia_*` ciphertext tables). FloGuard reads
infrastructure, not user plaintext. §0 holds.

## Iron rules (never break)

1. **No secret values in any artifact.** Backlog, audit log, PRs, and reports
   reference a credential by `service · location · first-6-chars · length`
   only — exactly how the care engine stores (kind + timing) and never a word
   of content. The operator files are git-tracked; treat them as public.
2. **Never autonomously do anything destructive or user-visible.** Key
   rotation, rolling a JWT secret (logs everyone out), dropping/loosening RLS,
   changing auth providers, deleting data — these are *drafted only*. ClaudIA
   produces the exact dashboard steps + an env-redistribution script and waits
   for Steph's explicit command. (Same principle as the ops-AI-email rule and
   "register only on explicit command".)
3. **Safe fixes go via PR, never direct to prod.** Branch, open PR, summarize.
4. **Paused Supabase projects:** advisors can't run while INACTIVE. Note the
   gap; don't wake a project just to scan it.

## What ClaudIA MAY auto-apply (via PR)

- Security-headers package (`packages/security`) + wiring it into each
  `next.config.ts` (`poweredByHeader: false` + shared `headers()`).
- `USING (false)` deny policies on RLS-enabled / no-policy tables (clarity).
- `ALTER FUNCTION … SET search_path = ''` on flagged mutable-search-path fns.
- Tightening `rls_policy_always_true` INSERT policies with `WITH CHECK`
  constraints (length caps, required fields).
- Deleting stale expired `.vercel/.env.*` / OIDC files.
- Adding a gitleaks pre-commit backstop.

## What ClaudIA MUST hand to Steph (draft only)

- Any key/secret rotation (Supabase JWT/service_role, Anthropic, GitHub,
  Vercel, DeepL, FAL, DB passwords, AUTH_SECRET, admin passwords).
- Rolling the canonical JWT secret or migrating to the new key system.
- Enabling leaked-password protection (dashboard toggle).
- Locking the anon-reachable `admin_*(p_key)` / `mt_*(p_secreto)` RPCs.

## The audit round (run every time)

Work from `~/Projects/flowbond-os`. Fan out read-only Explore agents in parallel:

1. **Secret exposure** — `git ls-files | grep -iE env` (committed real vs
   placeholder); grep source for `service_role`, `eyJ`, `sk-ant-`, `sk_live`,
   `ghp_`/`gho_`, `vca_`/`vcp_`, `BEGIN .* PRIVATE KEY`, `DEEPL`, `FAL_KEY`,
   passwords in connection strings; confirm `.gitignore` covers `.env*`.
   Report `service · path · first-6 · length`, never the value.
2. **Headers + service-role safety** — per app: `headers()` in next.config,
   `poweredByHeader`, middleware; every service-role client confined to
   server-only + auth-guarded; no open admin API routes.
3. **RLS / privacy** — migrations: tables w/o RLS, `TO public`/`anon` write
   policies (the ops_* pattern), `SECURITY DEFINER` fns that skip `auth.uid()`,
   privacy leaks (ClaudIA relay logging plaintext, AstroFlow full names/DOB to
   LLM, unencrypted PII).

Then pull **live Supabase advisors** for each ACTIVE project:
```
# get_advisors(project_id, "security") → large; parse the saved file:
jq -r '.result.lints[] | "\(.level)\t\(.name)"' "$F" | sort | uniq -c | sort -rn
jq -r '.result.lints[] | select(.name=="rls_policy_always_true")     | .detail' "$F" | sort -u
jq -r '.result.lints[] | select(.name=="auth_leaked_password_protection") | .detail' "$F"
jq -r '.result.lints[] | select(.name=="function_search_path_mutable")     | .detail' "$F"
# anon-reachable SECURITY DEFINER fns gated only by a secret string are the real risk:
jq -r '.result.lints[] | select(.name=="anon_security_definer_function_executable") | .detail' "$F" \
  | grep -iE 'p_key|p_secret|p_secreto' | sed -E 's/ can be executed.*//' | sort -u
```
Note: the bulk `*_security_definer_function_executable` warnings are expected
noise for an RPC-only architecture (those fns validate `auth.uid()` internally).
Only the secret-string-gated `admin_*`/`mt_*` ones are real findings.

Canonical project = `fgsrcxxccdjqyrpkitmk` (FlowBond-life, ACTIVE).
Others (CDMX `melshaxfoeruvyzrpvec`, mohe `gkplycfwxpayuwnensrd`, mountain dogs
`yfcauhxbpcxjnqguxydh`, `frwkxgwjsfjyotxfqhvr`) are paused.

## Close the round

1. Diff findings against `apps/claudia/operator/floguard/BACKLOG.md`. Add new
   items (`FG-NNN`), mark resolved ones `done`, leave human-gated ones `blocked
   (steph)`.
2. Apply allowed safe fixes via a PR; link the PR from the backlog item.
3. Append one line to `apps/claudia/operator/floguard/AUDIT-LOG.md`:
   `YYYY-MM-DD · ran · advisors: N warn / M info · new: X · resolved: Y · open: Z`
   — counts only, no secrets, mirroring the care log.
4. If anything is CRITICAL, surface it to Steph immediately; don't wait.

## Cadence

Runs as a standing routine (see operator/README.md). Default weekly + on demand
("run a floguard round"). Always re-run after any DDL change (advisors catch
new missing-RLS) or new app/deploy.
