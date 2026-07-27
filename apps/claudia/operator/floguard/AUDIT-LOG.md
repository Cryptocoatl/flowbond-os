# FloGuard Audit Log

Append-only. One line per round. Counts and metadata only — never a secret,
never user plaintext. Mirrors the care-log ethos: the record proves the work
happened without holding a word of what was found in detail.

Format: `YYYY-MM-DD · ran · advisors: <warn> warn / <info> info · new: X · resolved: Y · open: Z · notes`

---

2026-06-24 · ran · advisors(fgsrcxxccdjqyrpkitmk): 219 warn / 72 info · new: 24 · resolved: 0 · open: 24 · seed round. 0 ERROR. Real WARNs: 7 always-true RLS INSERT policies, 5 secret-string-gated anon admin RPCs, leaked-password-protection off, 1 mutable search_path. Git clean (no committed secrets). Headers: zero coverage all apps. Backlog seeded FG-001..FG-042.
2026-06-28 · incident+ran · availability dimension added · new: 4 · resolved: 2 · open: 2 · flowbond.life/​www returned Vercel platform 404 (domains orphaned on broken duplicate project flow-bond-layer0). FIXED: detached → reattached to healthy flowbond-live (200, real landing). Shipped uptime-sentinel.sh (auto-discovers all verified custom domains, flags ORPHAN-404/5xx/unreachable). First sweep: 48 domains, 0 failing. FG-050/051 done; FG-052 (kill duplicate projects) + FG-053 (schedule the sentinel) open.
2026-07-27 · ran · advisors(fgsrcxxccdjqyrpkitmk): 651 warn / 188 info / 10 ERROR · new: 6 · resolved: 0 · open: 5 · 10 new ERRORs: 9 security_definer_view (v_ff_funding_progress + 8 app_vpa_*_public) + 1 rls_disabled spatial_ref_sys (PostGIS noise). 12 new mutable search_path fns → migration 007 PR (FG-026). Expanded anon admin RPC surface: mt_admin_*(8), tevo_admin_*(7+), tulumcoin/vpa p_key-gated (FG-027). 188 tables RLS-on/no-policy across astroflow/fbgame/grantflow/lvb (FG-028). 2 public buckets with broad listing (FG-029). pg_net+postgis in public schema (FG-031). SECURITY DEFINER views require human review before altering (FG-025). Gitleaks backstop + migration 007 shipped to PR.
