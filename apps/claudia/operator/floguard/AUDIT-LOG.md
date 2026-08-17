# FloGuard Audit Log

Append-only. One line per round. Counts and metadata only — never a secret,
never user plaintext. Mirrors the care-log ethos: the record proves the work
happened without holding a word of what was found in detail.

Format: `YYYY-MM-DD · ran · advisors: <warn> warn / <info> info · new: X · resolved: Y · open: Z · notes`

---

2026-06-24 · ran · advisors(fgsrcxxccdjqyrpkitmk): 219 warn / 72 info · new: 24 · resolved: 0 · open: 24 · seed round. 0 ERROR. Real WARNs: 7 always-true RLS INSERT policies, 5 secret-string-gated anon admin RPCs, leaked-password-protection off, 1 mutable search_path. Git clean (no committed secrets). Headers: zero coverage all apps. Backlog seeded FG-001..FG-042.
2026-06-28 · incident+ran · availability dimension added · new: 4 · resolved: 2 · open: 2 · flowbond.life/​www returned Vercel platform 404 (domains orphaned on broken duplicate project flow-bond-layer0). FIXED: detached → reattached to healthy flowbond-live (200, real landing). Shipped uptime-sentinel.sh (auto-discovers all verified custom domains, flags ORPHAN-404/5xx/unreachable). First sweep: 48 domains, 0 failing. FG-050/051 done; FG-052 (kill duplicate projects) + FG-053 (schedule the sentinel) open.
2026-07-30 · SCAN FAILED · Supabase MCP did not expose tools (execute_sql / get_advisors) in the scheduled session — server listed as enabledInChat but tools absent from registry after repeated ToolSearch attempts. advisors: NOT RUN · sql-check: NOT RUN · new: 0 · resolved: 0 · open: unchanged · ACTION NEEDED: verify Supabase MCP auth/token in session settings and re-run manually.
2026-08-17 · ran · advisors(fgsrcxxccdjqyrpkitmk): 1025 warn / 244 info / 17 error · new: 3 (FG-055 security_definer_view ×16, FG-056 extension_in_public ×2, FG-058 hardcoded admin JWT fallback) · resolved: 2 (FG-020 rls_policy_always_true cleared, FG-021 leaked-password protection enabled) · open: 5 · notes: FG-005 scope expanded to 18 p_key/p_secreto-gated anon RPCs including claudia_vault_mark; FG-022 expanded to 22 mutable-search_path functions; migration 006 updated but still DRY-RUN; zero apps wired to @flowbond/security.
