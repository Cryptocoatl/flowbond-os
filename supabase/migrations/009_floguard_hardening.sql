-- ════════════════════════════════════════════════════════════════════════
--  009_floguard_hardening.sql  —  FloGuard safe DB fixes (canonical project
--  fgsrcxxccdjqyrpkitmk). Authored by ClaudIA's FloGuard operator.
--
--  Supersedes DRY-RUN in 006_floguard_hardening.sql (never applied).
--  Idempotent + guarded; safe to re-run.
--
--  Covers:
--    FG-022  public.flowbond_role_rank mutable search_path → pin
--    FG-026  public.vpa__is_service mutable search_path    → pin
--    FG-023  banoseco_donations / banoseco_deposits RLS     → deny policies
--
--  Excluded (human-gated, see BACKLOG.md): key rotations, JWT roll,
--  leaked-password toggle (FG-021), anon admin RPCs (FG-005),
--  SECURITY DEFINER views (FG-025 — verify before recreating as INVOKER).
-- ════════════════════════════════════════════════════════════════════════

-- ── FG-022 · pin search_path on flowbond_role_rank ────────────────────────
-- Mutable search_path is a privilege-escalation vector. Pin all overloads.
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

-- ── FG-026 · pin search_path on vpa__is_service ───────────────────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'vpa__is_service'
  loop
    execute format('alter function %s set search_path = ''''', r.sig);
  end loop;
end $$;

-- ── FG-023 · explicit deny on banoseco write tables ───────────────────────
-- RLS is enabled with no policies. Writes flow through SECURITY DEFINER RPCs
-- that bypass RLS. Restrictive policies make the deny intent explicit.
drop policy if exists banoseco_donations_deny on public.banoseco_donations;
create policy banoseco_donations_deny on public.banoseco_donations
  as restrictive for all to public using (false) with check (false);

drop policy if exists banoseco_deposits_deny on public.banoseco_deposits;
create policy banoseco_deposits_deny on public.banoseco_deposits
  as restrictive for all to public using (false) with check (false);
