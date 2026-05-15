-- 003_rls_fix.sql
-- Fix broken RLS policies on 6 tables.
--
-- Problems fixed:
--   flowbond_auth_accounts  — was ALL for any auth.uid() IS NOT NULL (any authed user saw all rows)
--   flowbond_wallet_connections — same bug
--   flowbond_core_identities — referenced wrong table (flowbond_identities) instead of going through flowbond_auth_accounts
--   events  — exposed private events (is_public=false) to anon
--   missions — exposed inactive missions (is_active=false) to anon
--   products — already correct, kept as-is

-- ============================================================
-- Helper: the correct auth chain for the new tables is:
--   auth.uid() -> flowbond_auth_accounts (provider='supabase') -> identity_id -> flowbond_core_identities.id
-- ============================================================


-- ---- products -----------------------------------------------
-- Public catalog — intentional open read, no change needed.
-- (existing policy "products_public_read" is correct)


-- ---- events -------------------------------------------------
-- Only expose events that are explicitly public.
DROP POLICY IF EXISTS "events_public_read" ON events;

CREATE POLICY "events_public_read" ON events
  FOR SELECT
  USING (is_public = true);


-- ---- missions -----------------------------------------------
-- Only expose active missions.
DROP POLICY IF EXISTS "missions_public_read" ON missions;

CREATE POLICY "missions_public_read" ON missions
  FOR SELECT
  USING (is_active = true);


-- ---- flowbond_auth_accounts ---------------------------------
-- A Supabase-authenticated user may only see their own provider row.
-- Writes are handled by triggers / service_role only.
DROP POLICY IF EXISTS "flowbond_auth_accounts_own" ON flowbond_auth_accounts;

CREATE POLICY "flowbond_auth_accounts_own_read" ON flowbond_auth_accounts
  FOR SELECT
  TO authenticated
  USING (
    provider = 'supabase'
    AND provider_account_id = auth.uid()::text
  );


-- ---- flowbond_core_identities --------------------------------
-- Owner can read their own core identity.
-- Link is: auth.uid() -> flowbond_auth_accounts (supabase row) -> identity_id = this table's id.
-- Created by handle_new_auth_user trigger; no client INSERT/UPDATE/DELETE needed.
DROP POLICY IF EXISTS "flowbond_core_identities_own" ON flowbond_core_identities;

CREATE POLICY "flowbond_core_identities_own_read" ON flowbond_core_identities
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  );


-- ---- flowbond_wallet_connections ----------------------------
-- Owner-only full CRUD (users connect / disconnect their own wallets via app).
-- Same identity chain as above.
DROP POLICY IF EXISTS "flowbond_wallet_connections_own" ON flowbond_wallet_connections;

CREATE POLICY "flowbond_wallet_connections_own_select" ON flowbond_wallet_connections
  FOR SELECT
  TO authenticated
  USING (
    identity_id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  );

CREATE POLICY "flowbond_wallet_connections_own_insert" ON flowbond_wallet_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    identity_id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  );

CREATE POLICY "flowbond_wallet_connections_own_update" ON flowbond_wallet_connections
  FOR UPDATE
  TO authenticated
  USING (
    identity_id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  )
  WITH CHECK (
    identity_id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  );

CREATE POLICY "flowbond_wallet_connections_own_delete" ON flowbond_wallet_connections
  FOR DELETE
  TO authenticated
  USING (
    identity_id IN (
      SELECT identity_id
      FROM   flowbond_auth_accounts
      WHERE  provider            = 'supabase'
        AND  provider_account_id = auth.uid()::text
    )
  );
