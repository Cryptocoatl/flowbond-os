-- ════════════════════════════════════════════════════════════════════════
--  007_floguard_search_path.sql  —  FloGuard round 2026-07-27
--
--  Pin mutable search_path on 12 additional SECURITY DEFINER functions
--  flagged by Supabase security advisors (FG-026). Uses the same
--  idempotent DO-block pattern as migration 006 (FG-022). Safe to re-run.
--
--  ⚠️  DRY-RUN — NOT auto-applied. Review then apply manually via:
--       supabase db push  OR  paste in the SQL Editor on the project.
--
--  Excluded: public.flowbond_role_rank — already covered in migration 006.
--  Excluded: all key rotations, JWT roll, RLS changes (human-gated).
--
--  Fixes (FG-026):
--    public.ff_uid                         mutable search_path
--    public.ff_is_admin                    mutable search_path
--    public.vpa__is_service                mutable search_path
--    public._tevo_jwt_email                mutable search_path
--    public.tulum_holders_sealed           mutable search_path
--    public.tulum_snapshot_freeze_guard    mutable search_path
--    public.tulum_wallets_permanent        mutable search_path
--    public.ff_ledger_no_mutate            mutable search_path
--    public._lvb_jwt_email                 mutable search_path
--    grantflow.audit_results_append_only   mutable search_path
--    grantflow.audit_gate                  mutable search_path
--    grantflow.enforce_review_state        mutable search_path
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  r     record;
  funcs text[][] := ARRAY[
    ARRAY['public',    'ff_uid'],
    ARRAY['public',    'ff_is_admin'],
    ARRAY['public',    'vpa__is_service'],
    ARRAY['public',    '_tevo_jwt_email'],
    ARRAY['public',    'tulum_holders_sealed'],
    ARRAY['public',    'tulum_snapshot_freeze_guard'],
    ARRAY['public',    'tulum_wallets_permanent'],
    ARRAY['public',    'ff_ledger_no_mutate'],
    ARRAY['public',    '_lvb_jwt_email'],
    ARRAY['grantflow', 'audit_results_append_only'],
    ARRAY['grantflow', 'audit_gate'],
    ARRAY['grantflow', 'enforce_review_state']
  ];
  i     integer;
begin
  for i in 1..array_length(funcs, 1) loop
    for r in
      select p.oid::regprocedure as sig
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = funcs[i][1]
         and p.proname = funcs[i][2]
    loop
      execute format('alter function %s set search_path = ''''', r.sig);
    end loop;
  end loop;
end $$;
