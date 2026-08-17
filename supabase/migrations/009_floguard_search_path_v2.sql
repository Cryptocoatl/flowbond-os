-- ════════════════════════════════════════════════════════════════════════
--  009_floguard_search_path_v2.sql  —  FloGuard safe DB fixes, round 2
--  (canonical project fgsrcxxccdjqyrpkitmk)
--
--  ⚠️ DRY-RUN — NOT auto-applied. Review then apply manually.
--     Idempotent + guarded; safe to re-run.
--     Apply AFTER 006_floguard_hardening.sql (covers FG-022 / FG-023).
--
--  Covers backlog items:
--    FG-061  20 new mutable search_path functions (+ extends FG-022 scope)
--    FG-066b Explicit deny-by-default policies on muse.* tables (migrations
--            007 + 008 left RLS-on, no policies — this makes the intent explicit)
--
--  Excluded (human-gated): all key rotations, JWT roll, FG-060 security_definer
--  views (requires per-view analysis), FG-069 bulk no-policy tables.
-- ════════════════════════════════════════════════════════════════════════

-- ── FG-061 · pin search_path on new mutable-search-path functions ─────────
-- These functions were added since the June 2026 round and now appear in
-- the `function_search_path_mutable` advisor (privilege-escalation vector).
-- Pattern: iterate pg_proc by schema+name to handle all overloads safely.

do $$ declare r record; begin
  for r in
    select p.oid::regprocedure as sig
    from   pg_proc p
    join   pg_namespace n on n.oid = p.pronamespace
    where  (n.nspname, p.proname) in (
      ('grantflow', 'audit_gate'),
      ('grantflow', 'audit_results_append_only'),
      ('grantflow', 'enforce_review_state'),
      ('lvb',       'team_inbox'),
      ('public',    '_lvb_jwt_email'),
      ('public',    '_tevo_jwt_email'),
      ('public',    'claudia_owns'),
      ('public',    'claudia_scope_ok'),
      ('public',    'ff_is_admin'),
      ('public',    'ff_ledger_no_mutate'),
      ('public',    'ff_uid'),
      ('public',    'mtt_new_code'),
      ('public',    'mtt_no_delete_commission'),
      ('public',    'mtt_touch'),
      ('public',    'portal888__append_only'),
      ('public',    'spine__titulo'),
      ('public',    'tulum_holders_sealed'),
      ('public',    'tulum_snapshot_freeze_guard'),
      ('public',    'tulum_wallets_permanent'),
      ('public',    'vpa__is_service')
    )
  loop
    execute format('alter function %s set search_path = ''''', r.sig);
  end loop;
end $$;

-- ── FG-066b · explicit deny-by-default policies on muse schema ────────────
-- Migrations 007 + 008 created the muse.* tables with RLS enabled but no
-- policies. All access is gated via SECURITY DEFINER RPCs (which run as the
-- table owner and bypass RLS). These restrictive USING(false) policies make
-- that deny-by-default intent explicit and silence the `rls_enabled_no_policy`
-- advisor for the muse schema.

do $$ declare t text; begin
  for t in values
    ('governors'), ('muses'), ('grants'), ('amendments'), ('events'), ('pending')
  loop
    execute format(
      $q$ drop policy if exists muse_%1$s_deny on muse.%1$I;
          create policy muse_%1$s_deny on muse.%1$I
            as restrictive for all to public using (false) with check (false); $q$,
      t
    );
  end loop;
end $$;
