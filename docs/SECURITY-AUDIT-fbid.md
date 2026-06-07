# FBID Security Audit — 2026-06-04

Scope: the FBID identity surface on Supabase project `fgsrcxxccdjqyrpkitmk`
(identity tables, RLS, `SECURITY DEFINER` functions, wallet/handoff/nonce flow,
redirect allowlist). Read-only audit; one hardening migration applied.

## Findings & status

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | **High** | 5 `SECURITY DEFINER` functions had **unpinned `search_path`** (privilege-escalation vector): `handle_new_auth_user` (auth trigger), `add_points`, `complete_mission`, `process_referral_conversion`, `refresh_og_stats` | **FIXED** — pinned to `public, auth` via migration `20260604150000` (no body change, reversible) |
| 2 | Low | `current_core_identity_id()` is `SECURITY DEFINER`, unpinned, and references the archived `flowbond_core_identities` — **dead** (0 code callers) | **Recommend DROP** (left in place; needs explicit sign-off to delete) |
| 3 | Pass | RLS coverage | **All `public` tables have RLS enabled** (0 without) |
| 4 | Pass | FBID invariant | FK `flowbond_users.id → auth.users.id`; `flowbond_identities.auth_user_id → flowbond_users` + unique; `flowbond_users_wallet_unique` |
| 5 | Pass | Wallet nonce | Single-use enforced **server-side** (`fbid_auth_nonces` + `claim_auth_nonce`); replay rejected (tested) |
| 6 | Pass | Redirect handoff | Exact origin+path allowlist; off-allowlist rejected (tested); token single-use, short-TTL, server-redeemed |
| 7 | **Review** | Several points/mission `SECURITY DEFINER` functions (`add_points`, `complete_mission`, `process_referral_conversion`) grant `EXECUTE` to **anon** | Verify each checks `auth.uid()` internally / is not callable anonymously to mint points. Code-review follow-up (not a schema fix) |
| 8 | Pass | Service-role key | Used only server-side (hub admin client, webhook routes); never shipped to the browser |
| 9 | Info | Competing identity tables | Archived to `legacy_archive` (off the public REST surface); backup in `fbid_backup_20260604` |

## Locked invariants (assert in CI — task 17)
- `flowbond_app_connections.user_id == flowbond_users.id == auth.users.id` for every connection.
- One wallet identifier → at most one FBID (`flowbond_users_wallet_unique`).
- `flowbond_identities` rows always tied to a real FBID (FK + unique).
- Handoff token & wallet nonce are single-use; off-allowlist redirects refused.

## Recommended follow-ups
1. Drop the dead `current_core_identity_id()` (and any other `flowbond_core_*` helper functions) once confirmed unused ecosystem-wide.
2. Review item #7: ensure points/mission RPCs can't be abused by `anon`; tighten `EXECUTE` grants to `authenticated`/`service_role` where appropriate.
3. Land the CI verification harness (FBID invariant + security regressions) so this posture can't silently drift.
