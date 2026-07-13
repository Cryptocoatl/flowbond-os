-- ⚠️  SUPERSEDED by 009_floguard_hardening.sql (2026-07-13, round 3).
--    DRY-RUN template only — never applied to any project.
--    FG-022 (flowbond_role_rank) + FG-023 (banoseco deny) live in 009.
--    FG-020 column-constraint guidance below is still valid (reference only).
--    Naming collision with 006_tianguis_escrow.sql tracked as FG-045.
-- ════════════════════════════════════════════════════════════════════════
--  006_floguard_hardening.sql  —  FloGuard safe DB fixes (canonical project
--  fgsrcxxccdjqyrpkitmk). Authored by ClaudIA's FloGuard operator.
--
--  ⚠️ DRY-RUN — NOT auto-applied. Review, then apply manually (repo convention:
--     the user applies migrations). Idempotent + guarded; safe to re-run.
--
--  Covers backlog items:
--    FG-022  flowbond_role_rank mutable search_path  → pin search_path
--    FG-023  banoseco_donations / banoseco_deposits  → explicit deny policies
--    FG-020  always-true anon INSERT policies         → guidance + template
--
--  Excluded (human-gated, see BACKLOG.md): all key rotations, JWT roll,
--  leaked-password toggle (FG-021, dashboard), locking anon admin RPCs (FG-005).
-- ════════════════════════════════════════════════════════════════════════

-- ── FG-022 · pin search_path on flowbond_role_rank ────────────────────────
-- Mutable search_path on a function is a privilege-escalation vector. Pin it
-- to empty for every overload, regardless of signature.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'flowbond_role_rank'
  loop
    execute format('alter function %s set search_path = ''''', r.sig);
  end loop;
end $$;

-- ── FG-023 · explicit deny on banoseco write tables ───────────────────────
-- RLS is enabled with no policies (writes happen only via SECURITY DEFINER
-- RPCs, which run as table owner and bypass RLS — so these denies do NOT
-- affect the game; they make the "no direct client access" intent explicit
-- instead of silently relying on default-deny.
drop policy if exists banoseco_donations_deny on public.banoseco_donations;
create policy banoseco_donations_deny on public.banoseco_donations
  as restrictive for all to public using (false) with check (false);

drop policy if exists banoseco_deposits_deny on public.banoseco_deposits;
create policy banoseco_deposits_deny on public.banoseco_deposits
  as restrictive for all to public using (false) with check (false);

-- ── FG-020 · tighten always-true anon INSERT policies ─────────────────────
-- These 7 lead-capture tables allow anon/authenticated INSERT with
-- WITH CHECK (true): marketing.waitlist, public.waitlist, flownation_waitlist,
-- investor_events, moon_temple_respuestas, phoenix_claims,
-- xelva_project_applications.
--
-- They are write-only to anon (no SELECT policy), so the risk is spam/cost,
-- not data leak. RLS cannot rate-limit — the real mitigation is app/edge-layer
-- (Cloudflare Turnstile / a captcha on the form) plus column CHECK constraints
-- to reject garbage. Their schemas are NOT in this repo, so fill in the real
-- column names before applying. Template (uncomment + adapt per table):
--
--   alter table public.waitlist
--     add constraint waitlist_email_sane
--     check (char_length(email) between 3 and 320 and email like '%@%');
--
--   alter table public.investor_events
--     add constraint investor_events_kind_sane
--     check (char_length(kind) <= 64);
--
-- Verify columns first:  select column_name, data_type
--   from information_schema.columns where table_name = '<t>' order by ordinal_position;
