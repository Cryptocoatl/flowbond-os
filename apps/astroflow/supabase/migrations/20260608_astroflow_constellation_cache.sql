-- Per-viewer cache of a woven constellation's computed reading context, so the
-- synastry/group facts a viewer is permitted to see are stored once and reused
-- across usecases (map page, reading) instead of rebuilt each time.
-- Per-VIEWER (not per-map) is the privacy-safe shape: each row holds only the
-- facts THAT viewer was allowed to compute, and RLS locks every row to its
-- owner — no viewer can read another's cached view.
create table if not exists astroflow.constellation_cache (
  map_id       uuid not null references astroflow.flow_maps(id) on delete cascade,
  viewer_fbid  uuid not null references public.flowbond_users(id) on delete cascade,
  facts        jsonb not null,
  members_hash text not null,
  at           timestamptz not null default now(),
  primary key (map_id, viewer_fbid)
);

-- viewer_fbid is the RLS filter column + an FK, but the PK (map_id, viewer_fbid)
-- doesn't index it as a left-prefix. Index it so RLS checks and the
-- on-delete-cascade from flowbond_users stay fast.
create index if not exists constellation_cache_viewer_idx
  on astroflow.constellation_cache (viewer_fbid);

alter table astroflow.constellation_cache enable row level security;

drop policy if exists cc_select on astroflow.constellation_cache;
create policy cc_select on astroflow.constellation_cache for select
  using (viewer_fbid = astroflow.current_fbid());

drop policy if exists cc_insert on astroflow.constellation_cache;
create policy cc_insert on astroflow.constellation_cache for insert
  with check (viewer_fbid = astroflow.current_fbid());

drop policy if exists cc_update on astroflow.constellation_cache;
create policy cc_update on astroflow.constellation_cache for update
  using (viewer_fbid = astroflow.current_fbid())
  with check (viewer_fbid = astroflow.current_fbid());

drop policy if exists cc_delete on astroflow.constellation_cache;
create policy cc_delete on astroflow.constellation_cache for delete
  using (viewer_fbid = astroflow.current_fbid());

grant select, insert, update, delete on astroflow.constellation_cache to authenticated;
