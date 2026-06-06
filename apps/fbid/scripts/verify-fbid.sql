-- FBID verification harness — run in CI against the canonical project
-- (fgsrcxxccdjqyrpkitmk). Exits non-zero (RAISES) on any regression.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/fbid/scripts/verify-fbid.sql
-- Pair with apps/fbid/scripts/wallet-smoke.mjs for endpoint (replay/allowlist) checks.

DO $$
DECLARE v int;
BEGIN
  -- 1. FBID invariant: every app connection ties to a real FBID = auth user
  SELECT count(*) INTO v FROM public.flowbond_app_connections c
    LEFT JOIN public.flowbond_users u ON u.id=c.user_id
    LEFT JOIN auth.users a ON a.id=u.id
    WHERE u.id IS NULL OR a.id IS NULL;
  ASSERT v=0, 'FBID invariant broken: '||v||' orphan app_connections';

  -- 2. flowbond_users.id == auth.users.id for all (no divergence)
  SELECT count(*) INTO v FROM public.flowbond_users u LEFT JOIN auth.users a ON a.id=u.id WHERE a.id IS NULL;
  ASSERT v=0, v||' flowbond_users without matching auth user';

  -- 3. One wallet -> one FBID (case-insensitive uniqueness)
  SELECT count(*) INTO v FROM (
    SELECT lower(wallet_address) w FROM public.flowbond_users
    WHERE wallet_address IS NOT NULL GROUP BY 1 HAVING count(*)>1) d;
  ASSERT v=0, v||' wallet addresses bound to multiple identities';

  -- 4. Ledger FK guard present
  ASSERT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='flowbond_identities_auth_user_fkey'), 'ledger FK guard missing';

  -- 5. Every public table has RLS enabled
  SELECT count(*) INTO v FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false;
  ASSERT v=0, v||' public tables without RLS';

  -- 6. No SECURITY DEFINER function has an unpinned search_path
  SELECT count(*) INTO v FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND (p.proconfig IS NULL OR NOT EXISTS(SELECT 1 FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%'));
  ASSERT v=0, v||' SECURITY DEFINER functions with unpinned search_path';

  -- 7. Points/mission RPCs are NOT callable by anon
  ASSERT NOT has_function_privilege('anon','public.add_points(uuid,integer,points_tx_type,text,uuid,uuid,uuid,uuid,text)','EXECUTE'), 'anon can call add_points';

  -- 8. Identity is 1:1 with users — every user has exactly one FBID profile.
  SELECT count(*) INTO v FROM public.flowbond_users u
    WHERE NOT EXISTS (SELECT 1 FROM public.flowbond_identities i WHERE i.auth_user_id=u.id);
  ASSERT v=0, v||' users without an FBID identity record';

  -- 9. Default visibility is super-private (the whole privacy promise).
  SELECT count(*) INTO v FROM information_schema.columns
    WHERE table_schema='public' AND table_name='flowbond_identities'
      AND column_name='default_visibility' AND column_default LIKE '''private''%';
  ASSERT v=1, 'flowbond_identities.default_visibility default is not ''private''';

  -- 10. Handles are case-insensitively unique.
  ASSERT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public'
    AND indexname='flowbond_identities_handle_lower_uniq'), 'case-insensitive handle index missing';

  -- 11. Closeness math: private=4 (self only), public=0 (anyone), self=4.
  ASSERT public.fbid_visibility_rank('private')=4 AND public.fbid_visibility_rank('public')=0
       AND public.fbid_visibility_rank('network')=1 AND public.fbid_visibility_rank('selected')=3,
       'fbid_visibility_rank ordering wrong';

  -- 12. Public browse leaks nothing non-public: every row in public_profiles is a public identity.
  SELECT count(*) INTO v FROM public.public_profiles p
    JOIN public.flowbond_identities i ON i.id=p.id
    WHERE i.default_visibility <> 'public';
  ASSERT v=0, v||' non-public identities exposed via public_profiles';

  -- 13. Base table is self-only: the old full-row "Public profiles readable" policy is gone.
  ASSERT NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='flowbond_identities' AND policyname='Public profiles readable'),
    'leaky full-row public SELECT policy still present on flowbond_identities';
  ASSERT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='flowbond_identities' AND policyname='fbid_identity_self_select'),
    'self-only SELECT policy missing on flowbond_identities';

  RAISE NOTICE 'ALL FBID INVARIANTS + SECURITY GUARANTEES HOLD';
END $$;
