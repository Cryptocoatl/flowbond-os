-- ============================================================================
-- Secure per-FBID memory: cached chart-facts + a private memory the AI can grow.
--   • facts      — derived reading facts (aspects, vedic, mayan, gene keys,
--                  strongest spot) computed once and reused, so the reading API
--                  and the model don't redo the heavy derivation every call.
--   • facts_hash — invalidates the cache automatically when the chart changes.
--   • memory     — FlowMe's private, append-only notes/themes about THIS user.
--
-- Keyed by FBID (= public.flowbond_users.id = auth.uid()). RLS makes it
-- strictly OWNER-ONLY: the only one who can ever read or write a row is the
-- user it belongs to. The server reads it through the user's own authenticated
-- session, so there is no path for one user to reach another's memory, and no
-- path from any chat prompt to anything but the caller's own row.
-- ============================================================================
create table if not exists astroflow.profile_memory (
  fbid       uuid primary key references public.flowbond_users(id) on delete cascade,
  facts      jsonb not null default '{}'::jsonb,
  facts_hash text,
  facts_at   timestamptz,
  memory     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table astroflow.profile_memory enable row level security;

drop policy if exists pm_select on astroflow.profile_memory;
create policy pm_select on astroflow.profile_memory for select
  using (fbid = astroflow.current_fbid());

drop policy if exists pm_insert on astroflow.profile_memory;
create policy pm_insert on astroflow.profile_memory for insert
  with check (fbid = astroflow.current_fbid());

drop policy if exists pm_update on astroflow.profile_memory;
create policy pm_update on astroflow.profile_memory for update
  using (fbid = astroflow.current_fbid())
  with check (fbid = astroflow.current_fbid());

drop policy if exists pm_delete on astroflow.profile_memory;
create policy pm_delete on astroflow.profile_memory for delete
  using (fbid = astroflow.current_fbid());

grant select, insert, update, delete on astroflow.profile_memory to authenticated;
