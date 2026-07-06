# FloGuard Audit Log

One line per run. Format: `YYYY-MM-DD · ran · advisors: N warn / M info · new: X · resolved: Y · open: Z · notes`

---

2026-07-06 · ran · advisors: n/a (Supabase MCP unavailable) · new: 8 · resolved: 0 · open: 6 · notes: first run; FG-001 CRITICAL plaintext admin creds; FG-002 CRITICAL JWT secret fallback (partial fix in PR); FG-003 HIGH seed password in migration; FG-004 HIGH security headers (fixed in PR)
