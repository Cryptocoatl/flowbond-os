# FloGuard Audit Log

Append-only. One line per round. Counts and metadata only — never a secret,
never user plaintext. Mirrors the care-log ethos: the record proves the work
happened without holding a word of what was found in detail.

Format: `YYYY-MM-DD · ran · advisors: <warn> warn / <info> info · new: X · resolved: Y · open: Z · notes`

---

2026-06-24 · ran · advisors(fgsrcxxccdjqyrpkitmk): 219 warn / 72 info · new: 24 · resolved: 0 · open: 24 · seed round. 0 ERROR. Real WARNs: 7 always-true RLS INSERT policies, 5 secret-string-gated anon admin RPCs, leaked-password-protection off, 1 mutable search_path. Git clean (no committed secrets). Headers: zero coverage all apps. Backlog seeded FG-001..FG-042.
2026-06-28 · incident+ran · availability dimension added · new: 4 · resolved: 2 · open: 2 · flowbond.life/​www returned Vercel platform 404 (domains orphaned on broken duplicate project flow-bond-layer0). FIXED: detached → reattached to healthy flowbond-live (200, real landing). Shipped uptime-sentinel.sh (auto-discovers all verified custom domains, flags ORPHAN-404/5xx/unreachable). First sweep: 48 domains, 0 failing. FG-050/051 done; FG-052 (kill duplicate projects) + FG-053 (schedule the sentinel) open.
2026-07-13 · ran · advisors(fgsrcxxccdjqyrpkitmk): 449 warn / 8 error / 119 info · new: 7 · resolved: 0 · open: 10 · 8 new ERROR security_definer_view (app_vpa_* public catalog views — verified read-only published-only filter, no sensitive data visible; requires SECURITY INVOKER migration, blocked steph FG-025). 2 mutable search_path fns: vpa__is_service added (FG-026), flowbond_role_rank already tracked (FG-022). New anon_security_definer fns verified auth.uid()-gated (expected architecture noise). Migration 009 (search_path pins + banoseco deny policies) + withSecurity wired to 9 apps + voces headers → PR floguard/2026-07-13-round3. FG-043 (admin middleware hardcoded secret) + FG-044 (grantflow service_role in Edge) added as blocked(steph).
