-- ════════════════════════════════════════════════════════════════════════
--  006_floguard_hardening.sql  —  FloGuard safe DB fixes (canonical project
--  fgsrcxxccdjqyrpkitmk). Authored by ClaudIA's FloGuard operator.
--
--  ⚠️ DRY-RUN — NOT auto-applied. Review, then apply manually (repo convention:
--     the user applies migrations). Idempotent + guarded; safe to re-run.
--
--  Covers backlog items:
--    FG-022  22 functions with mutable search_path → pin all to ''
--    FG-023  banoseco_donations / banoseco_deposits → explicit deny policies
--    FG-020  always-true anon INSERT policies        → guidance + template
--
--  Excluded (human-gated, see BACKLOG.md): all key rotations, JWT roll,
--  locking anon admin RPCs (FG-005), security_definer_view review (FG-055).
--  FG-020 resolved in advisors (0 always-true INSERT policies as of 2026-08-17).
--  FG-021 resolved (leaked-password protection now enabled).
-- ════════════════════════════════════════════════════════════════════════

-- ── FG-022 · pin search_path on all flagged functions ─────────────────────
-- Mutable search_path is a privilege-escalation vector. As of 2026-08-17,
-- 22 functions are flagged (up from 1). Pin all to '' idempotently.
-- Schemas: public, grantflow, lvb.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname in (
      'flowbond_role_rank',
      'vpa__is_service',
      'ff_uid',
      'ff_is_admin',
      'ff_ledger_no_mutate',
      '_tevo_jwt_email',
      'tulum_holders_sealed',
      'tulum_snapshot_freeze_guard',
      'tulum_wallets_permanent',
      '_lvb_jwt_email',
      'mtt_no_delete_commission',
      'mtt_touch',
      'mtt_new_code',
      'spine__titulo',
      'claudia_owns',
      'claudia_scope_ok',
      'portal888__append_only',
      'bmk_events_immutable'
    ))
    or (n.nspname = 'grantflow' and p.proname in (
      'audit_results_append_only',
      'audit_gate',
      'enforce_review_state'
    ))
    or (n.nspname = 'lvb' and p.proname = 'team_inbox')
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
