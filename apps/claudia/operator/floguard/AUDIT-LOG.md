# FloGuard Audit Log

Append-only. One line per round. Counts and metadata only — never a secret,
never user plaintext. Mirrors the care-log ethos: the record proves the work
happened without holding a word of what was found in detail.

Format: `YYYY-MM-DD · ran · advisors: <warn> warn / <info> info · new: X · resolved: Y · open: Z · notes`

---

2026-06-24 · ran · advisors(fgsrcxxccdjqyrpkitmk): 219 warn / 72 info · new: 24 · resolved: 0 · open: 24 · seed round. 0 ERROR. Real WARNs: 7 always-true RLS INSERT policies, 5 secret-string-gated anon admin RPCs, leaked-password-protection off, 1 mutable search_path. Git clean (no committed secrets). Headers: zero coverage all apps. Backlog seeded FG-001..FG-042.
2026-06-28 · incident+ran · availability dimension added · new: 4 · resolved: 2 · open: 2 · flowbond.life/​www returned Vercel platform 404 (domains orphaned on broken duplicate project flow-bond-layer0). FIXED: detached → reattached to healthy flowbond-live (200, real landing). Shipped uptime-sentinel.sh (auto-discovers all verified custom domains, flags ORPHAN-404/5xx/unreachable). First sweep: 48 domains, 0 failing. FG-050/051 done; FG-052 (kill duplicate projects) + FG-053 (schedule the sentinel) open.
2026-07-30 · SCAN FAILED · Supabase MCP did not expose tools (execute_sql / get_advisors) in the scheduled session — server listed as enabledInChat but tools absent from registry after repeated ToolSearch attempts. advisors: NOT RUN · sql-check: NOT RUN · new: 0 · resolved: 0 · open: unchanged · ACTION NEEDED: verify Supabase MCP auth/token in session settings and re-run manually.
2026-08-10 · ran · advisors(fgsrcxxccdjqyrpkitmk): 17 error / 968 warn / 227 info · new: 8 (FG-060 SDV-views-ERROR, FG-061 search-path-20-fns, FG-067 dup-006-prefix, FG-068 claudia_vault_mark+flowchords anon-SECURITY-DEFINER, FG-069 227-no-policy-tables, FG-070 hardcoded-admin-JWT-CRITICAL, FG-071 origo-server-only) · resolved: 2 tentative (FG-020 always-true-policies gone, FG-021 leaked-pw-protection gone from advisors) · open: 10 · CRITICAL: FG-070 hardcoded JWT fallback removed in PR (admin middleware); FG-068 claudia_vault_mark anon-reachable ZK vault fn flagged to Steph. PR includes migration 009 (search_path pin + muse deny policies). Auto-fixed: FG-061 (migration 009 DRY-RUN), FG-070 code fix.
