# FloGuard Audit Log

Append-only. One line per round. Counts and metadata only — never a secret,
never user plaintext. Mirrors the care-log ethos: the record proves the work
happened without holding a word of what was found in detail.

Format: `YYYY-MM-DD · ran · advisors: <warn> warn / <info> info · new: X · resolved: Y · open: Z · notes`

---

2026-06-24 · ran · advisors(fgsrcxxccdjqyrpkitmk): 219 warn / 72 info · new: 24 · resolved: 0 · open: 24 · seed round. 0 ERROR. Real WARNs: 7 always-true RLS INSERT policies, 5 secret-string-gated anon admin RPCs, leaked-password-protection off, 1 mutable search_path. Git clean (no committed secrets). Headers: zero coverage all apps. Backlog seeded FG-001..FG-042.
2026-06-28 · incident+ran · availability dimension added · new: 4 · resolved: 2 · open: 2 · flowbond.life/​www returned Vercel platform 404 (domains orphaned on broken duplicate project flow-bond-layer0). FIXED: detached → reattached to healthy flowbond-live (200, real landing). Shipped uptime-sentinel.sh (auto-discovers all verified custom domains, flags ORPHAN-404/5xx/unreachable). First sweep: 48 domains, 0 failing. FG-050/051 done; FG-052 (kill duplicate projects) + FG-053 (schedule the sentinel) open.

2026-08-02 · ran · advisors(fgsrcxxccdjqyrpkitmk): 890 lints — 10 ERROR / 685 WARN / 195 INFO · new: 8 · resolved: 3 · open: 5 · post-ecosystem-audit remediation round. CRITICAL closed: public stems bucket holding a cloned voice (signed-URL delivery shipped + verified before the bucket was locked, so no member lost access). Storage write policies scoped. Discovered a Supabase account (BrandMark) never covered by any prior round — black-box probed, full audit blocked on credentials. RLS matrix: 455 tables; 194 "RLS on / no policy" are fail-closed, not exposures — only `public` is API-reachable and none grant anon. Git history clean across all branches (no committed secret values). Full inventory: docs/audit/2026-08-ecosystem-audit.md.

2026-08-06 · ran · advisors(fgsrcxxccdjqyrpkitmk): 976 lints — 16 ERROR / 756 WARN / 204 INFO · new: 9 · resolved: 0 · open: 9 · ronda de aislamiento + migración + privacidad pedida por Steph. **Hallazgo que la ronda del 2-ago pasó por alto**: aquella revisó «RLS activa sin política» (fail-closed) pero no las políticas `USING (true)` para `anon` — hay 35, y una de ellas (`flowscrow_signatures`) expone firmas de acuerdos con datos reales. Migración Vercel→CF incompleta: 11 hostnames aún servidos por Vercel (incluido fbid) + 8 copias viejas vivas en *.vercel.app (una de ellas, Voces, con el bug de precios ya corregido y /admin abierto). Cabeceras: sólo legatum completo. Git: sin secretos commiteados (sólo .env.example); ramas mezclan hasta 9 productos.

2026-08-06 · remediación · resolved: 2 (FG-071, FG-075) · parcial: 2 (FG-073, FG-078) · open: 5 · **fuga cerrada**: el vault de FlowScrow tenía DOS puertas abiertas, no una — las políticas `USING (true)` y los propios RPC `flowscrow_vault_*`, que resolvían el trato por título sin comprobar quién preguntaba; cerrar sólo la tabla no habría bastado. Ahora los cinco RPC exigen `flowscrow_is_signer()`; probado en transacción con rollback y verificado en vivo (anónimo y usuaria de otra app → 0 filas; firmante → 1 firma/18 tareas/13 eventos intactos). Copias huérfanas en Vercel: 3 convertidas en redirect (incluida la de Voces con /admin), 2 pendientes de borrado manual. DNS: 2 registros vestigiales borrados (uno apuntaba a un dominio ajeno) + brandmark unificado. Ramas: CLAUDE.md + PR #19/#20.
