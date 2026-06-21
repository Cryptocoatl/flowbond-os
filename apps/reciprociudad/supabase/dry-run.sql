-- Dry-run validation for 0001_reciprociudad.sql.
-- Runs the whole migration inside a transaction and ROLLS BACK — nothing is
-- persisted. Use this to confirm the DDL parses and the FK to
-- public.flowbond_users resolves before applying for real.
--
--   psql "$DATABASE_URL" -f supabase/dry-run.sql
--
-- Expect: no errors, then "ROLLBACK". If it errors, fix the migration and re-run.
BEGIN;

\i migrations/0001_reciprociudad.sql

-- Smoke checks (all inside the rolled-back tx):
SELECT reciprociudad.reciprociudad_join('dryrun@example.com', 'reciprociudad_join') AS lead_id;
SELECT count(*) AS iniciativas_published FROM reciprociudad.reciprociudad_iniciativas_published();

ROLLBACK;
