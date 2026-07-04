-- ClaudIA care engine — pg_cron schedule (master spec §7).
-- Apply on the same branch as 0001_claudia.sql, after the migration.
--
-- The proactive loop runs every 15 minutes. claudia_due_nudges() is SECURITY
-- DEFINER and does all the work (thresholds, quiet hours, dedupe, opt-in), so
-- pg_cron can call it directly — no service round-trip needed for the inserts.
-- Clients receive nudges via Supabase Realtime on claudia_nudges (or polling
-- claudia_my_nudges); the warm copy is rendered client-side from `kind`.

create extension if not exists pg_cron;

-- Idempotent (re)schedule.
select cron.unschedule('claudia-watch')
  where exists (select 1 from cron.job where jobname = 'claudia-watch');

select cron.schedule(
  'claudia-watch',
  '*/15 * * * *',
  $$ select claudia_due_nudges(); $$
);

-- Optional: if you prefer to drive the edge function (e.g. to add push delivery),
-- schedule an HTTP call with pg_net instead of the direct RPC above:
--   select cron.schedule('claudia-watch', '*/15 * * * *', $$
--     select net.http_post(
--       url    => 'https://<project-ref>.functions.supabase.co/claudia-watch',
--       headers=> jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key', true))
--     );
--   $$);
