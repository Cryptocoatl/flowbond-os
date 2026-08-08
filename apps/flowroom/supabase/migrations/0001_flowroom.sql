-- ============================================================================
-- FlowRoom — 0001 initial schema
-- Project: fgsrcxxccdjqyrpkitmk  (public schema, Pattern A)
--
-- RUN AS A DRY RUN FIRST:
--   ~/.claudia/supabase-sql.sh fgsrcxxccdjqyrpkitmk -f 0001_flowroom.sql
-- with the BEGIN/ROLLBACK wrapper in 0001_flowroom.dryrun.sql. Review the
-- output, then re-run this file (which commits implicitly per statement).
--
-- Design notes
--   * No `citext` extension on this project — emails are stored lowercased
--     in `text` with a unique index. Normalisation happens in the RPCs.
--   * `anon` is never granted anything. The gate runs in the Worker on
--     service_role, so an unauthenticated browser has no DB surface at all.
--   * Every function REVOKEs from PUBLIC before granting. Postgres grants
--     EXECUTE to PUBLIC by default; granting to `authenticated` does not
--     remove it. (Verified trap — see reference_supabase_grant_traps.)
--   * FORCE ROW LEVEL SECURITY is deliberately NOT used, so SECURITY DEFINER
--     functions owned by postgres can write. All writes go through them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.flowroom_rooms (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  client_name   text,
  theme         jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft','live','archived')),
  owner_user_id uuid not null references public.flowbond_users(id) on delete restrict,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.flowroom_members (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.flowroom_rooms(id) on delete cascade,
  email         text not null,
  user_id       uuid references public.flowbond_users(id) on delete set null,
  role          text not null check (role in ('owner','guest','viewer')),
  invited_by    uuid references public.flowbond_users(id) on delete set null,
  invite_note   text,
  first_seen_at timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Email uniqueness per room, case-insensitive, without the citext extension.
create unique index if not exists flowroom_members_room_email_uidx
  on public.flowroom_members (room_id, lower(email));
create index if not exists flowroom_members_user_idx
  on public.flowroom_members (user_id) where user_id is not null;

create table if not exists public.flowroom_blocks (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.flowroom_rooms(id) on delete cascade,
  section_key text not null,
  block_key   text not null,
  ordinal     int  not null,
  kind        text not null,
  payload     jsonb not null,
  annotatable boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (room_id, block_key)
);
create index if not exists flowroom_blocks_room_ord_idx
  on public.flowroom_blocks (room_id, ordinal);

create table if not exists public.flowroom_marks (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.flowroom_rooms(id) on delete cascade,
  block_id   uuid not null references public.flowroom_blocks(id) on delete cascade,
  user_id    uuid not null references public.flowbond_users(id) on delete cascade,
  mark       text not null check (mark in
               ('agreed','question','already_have','different_timeline','not_this')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, user_id)
);
create index if not exists flowroom_marks_room_idx on public.flowroom_marks (room_id);

create table if not exists public.flowroom_comments (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.flowroom_rooms(id) on delete cascade,
  block_id    uuid not null references public.flowroom_blocks(id) on delete cascade,
  parent_id   uuid references public.flowroom_comments(id) on delete cascade,
  user_id     uuid not null references public.flowbond_users(id) on delete cascade,
  body        text not null check (length(btrim(body)) between 1 and 8000),
  resolved_at timestamptz,
  resolved_by uuid references public.flowbond_users(id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists flowroom_comments_block_idx
  on public.flowroom_comments (block_id, created_at);
create index if not exists flowroom_comments_room_idx
  on public.flowroom_comments (room_id, created_at desc);

create table if not exists public.flowroom_attachments (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.flowroom_rooms(id) on delete cascade,
  comment_id  uuid not null references public.flowroom_comments(id) on delete cascade,
  r2_key      text not null,
  filename    text,
  mime        text,
  bytes       bigint check (bytes >= 0),
  uploaded_by uuid references public.flowbond_users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists flowroom_attachments_comment_idx
  on public.flowroom_attachments (comment_id);

-- Append-only. Never updated, never deleted.
create table if not exists public.flowroom_activity (
  id               bigserial primary key,
  room_id          uuid not null references public.flowroom_rooms(id) on delete cascade,
  user_id          uuid references public.flowbond_users(id) on delete set null,
  event            text not null check (event in
                     ('viewed','section_read','marked','commented','invited','uploaded','entered')),
  target_block_key text,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists flowroom_activity_room_idx
  on public.flowroom_activity (room_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Membership helper. SECURITY DEFINER so the policy on flowroom_members can
-- consult flowroom_members without recursing through its own policy.
-- ----------------------------------------------------------------------------

create or replace function public.flowroom_role(p_room_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.flowroom_members m
  where m.room_id = p_room_id
    and m.user_id = auth.uid()
  limit 1;
$$;

comment on function public.flowroom_role(uuid) is
  'Role of the calling user in a room, or NULL if not a member. Definer to avoid RLS recursion.';

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.flowroom_rooms       enable row level security;
alter table public.flowroom_members     enable row level security;
alter table public.flowroom_blocks      enable row level security;
alter table public.flowroom_marks       enable row level security;
alter table public.flowroom_comments    enable row level security;
alter table public.flowroom_attachments enable row level security;
alter table public.flowroom_activity    enable row level security;

drop policy if exists flowroom_rooms_read on public.flowroom_rooms;
create policy flowroom_rooms_read on public.flowroom_rooms
  for select to authenticated
  using (public.flowroom_role(id) is not null);

drop policy if exists flowroom_members_read on public.flowroom_members;
create policy flowroom_members_read on public.flowroom_members
  for select to authenticated
  using (public.flowroom_role(room_id) is not null);

drop policy if exists flowroom_blocks_read on public.flowroom_blocks;
create policy flowroom_blocks_read on public.flowroom_blocks
  for select to authenticated
  using (public.flowroom_role(room_id) is not null);

-- Marks and comments are visible to every member: this is a conversation,
-- not a survey. Writable only by their author, and only via the RPCs.
drop policy if exists flowroom_marks_read on public.flowroom_marks;
create policy flowroom_marks_read on public.flowroom_marks
  for select to authenticated
  using (public.flowroom_role(room_id) is not null);

drop policy if exists flowroom_comments_read on public.flowroom_comments;
create policy flowroom_comments_read on public.flowroom_comments
  for select to authenticated
  using (public.flowroom_role(room_id) is not null);

drop policy if exists flowroom_attachments_read on public.flowroom_attachments;
create policy flowroom_attachments_read on public.flowroom_attachments
  for select to authenticated
  using (public.flowroom_role(room_id) is not null);

-- Activity is owner-only. It is the analytics surface, not shared reading.
drop policy if exists flowroom_activity_read on public.flowroom_activity;
create policy flowroom_activity_read on public.flowroom_activity
  for select to authenticated
  using (public.flowroom_role(room_id) = 'owner');

-- No INSERT/UPDATE/DELETE policies anywhere, on purpose. Every mutation goes
-- through a SECURITY DEFINER RPC below, which is the only place the rules live.

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------

-- Bind the authenticated user to their seeded membership rows, stamp presence,
-- and register the app connection. Called once per session on room entry.
create or replace function public.flowroom_enter(p_slug text)
returns table (room_id uuid, role text)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_room  uuid;
  v_role  text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- flowbond_users.email can be null for wallet-first accounts, so fall back
  -- to the auth record. Definer rights make auth.users readable here.
  select lower(btrim(coalesce(u.email, au.email))) into v_email
  from auth.users au
  left join public.flowbond_users u on u.id = au.id
  where au.id = v_uid;

  if v_email is null then
    return;
  end if;

  select r.id into v_room from public.flowroom_rooms r where r.slug = p_slug;
  if v_room is null then
    return;  -- unknown slug reveals nothing
  end if;

  -- Claim any membership seeded against this email but not yet bound to a user.
  update public.flowroom_members m
     set user_id = v_uid
   where m.room_id = v_room
     and m.user_id is null
     and lower(m.email) = v_email;

  select m.role into v_role
  from public.flowroom_members m
  where m.room_id = v_room and m.user_id = v_uid;

  if v_role is null then
    return;  -- not a member: same empty result as an unknown slug
  end if;

  update public.flowroom_members m
     set first_seen_at = coalesce(m.first_seen_at, now()),
         last_seen_at  = now()
   where m.room_id = v_room and m.user_id = v_uid;

  insert into public.flowbond_app_connections (user_id, app_slug, status, first_activated_at, last_active_at)
  values (v_uid, 'flowroom', 'active', now(), now())
  on conflict (user_id, app_slug) do update set last_active_at = now();

  insert into public.flowroom_activity (room_id, user_id, event, meta)
  values (v_room, v_uid, 'entered', jsonb_build_object('slug', p_slug));

  room_id := v_room;
  role    := v_role;
  return next;
end;
$$;

create or replace function public.flowroom_set_mark(p_block_id uuid, p_mark text)
returns public.flowroom_marks
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_key  text;
  v_ann  boolean;
  v_out  public.flowroom_marks;
begin
  select b.room_id, b.block_key, b.annotatable
    into v_room, v_key, v_ann
  from public.flowroom_blocks b where b.id = p_block_id;

  if v_room is null or public.flowroom_role(v_room) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_ann then
    raise exception 'block is not annotatable' using errcode = '22023';
  end if;

  insert into public.flowroom_marks (room_id, block_id, user_id, mark)
  values (v_room, p_block_id, v_uid, p_mark)
  on conflict (block_id, user_id)
    do update set mark = excluded.mark, updated_at = now()
  returning * into v_out;

  insert into public.flowroom_activity (room_id, user_id, event, target_block_key, meta)
  values (v_room, v_uid, 'marked', v_key, jsonb_build_object('mark', p_mark));

  return v_out;
end;
$$;

create or replace function public.flowroom_clear_mark(p_block_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  delete from public.flowroom_marks m
   where m.block_id = p_block_id and m.user_id = v_uid;
end;
$$;

create or replace function public.flowroom_add_comment(
  p_block_id uuid, p_body text, p_parent_id uuid default null
) returns public.flowroom_comments
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_key  text;
  v_out  public.flowroom_comments;
begin
  select b.room_id, b.block_key into v_room, v_key
  from public.flowroom_blocks b where b.id = p_block_id;

  if v_room is null or public.flowroom_role(v_room) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- A reply must live on the same block as its parent.
  if p_parent_id is not null then
    perform 1 from public.flowroom_comments c
     where c.id = p_parent_id and c.block_id = p_block_id;
    if not found then
      raise exception 'parent comment not on this block' using errcode = '22023';
    end if;
  end if;

  insert into public.flowroom_comments (room_id, block_id, parent_id, user_id, body)
  values (v_room, p_block_id, p_parent_id, v_uid, btrim(p_body))
  returning * into v_out;

  insert into public.flowroom_activity (room_id, user_id, event, target_block_key, meta)
  values (v_room, v_uid, 'commented', v_key, jsonb_build_object('comment_id', v_out.id));

  return v_out;
end;
$$;

-- Soft delete only, and only your own.
create or replace function public.flowroom_delete_comment(p_comment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  update public.flowroom_comments c
     set deleted_at = now()
   where c.id = p_comment_id and c.user_id = v_uid and c.deleted_at is null;
end;
$$;

-- Owner resolves any thread; anyone resolves their own.
create or replace function public.flowroom_resolve_comment(p_comment_id uuid, p_resolved boolean default true)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_author uuid;
begin
  select c.room_id, c.user_id into v_room, v_author
  from public.flowroom_comments c where c.id = p_comment_id;

  if v_room is null
     or (public.flowroom_role(v_room) <> 'owner' and v_author <> v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.flowroom_comments c
     set resolved_at = case when p_resolved then now() else null end,
         resolved_by = case when p_resolved then v_uid else null end
   where c.id = p_comment_id;
end;
$$;

-- Only owner and guest may invite, and only as `viewer`. Capped at 10.
create or replace function public.flowroom_invite_member(
  p_room_id uuid, p_email text, p_note text default null
) returns public.flowroom_members
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text := public.flowroom_role(p_room_id);
  v_email text := lower(btrim(p_email));
  v_count int;
  v_out   public.flowroom_members;
begin
  if v_role is null or v_role not in ('owner','guest') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  select count(*) into v_count
  from public.flowroom_members m
  where m.room_id = p_room_id and m.invited_by is not null;
  if v_count >= 10 then
    raise exception 'invite cap reached' using errcode = '54000';
  end if;

  insert into public.flowroom_members (room_id, email, role, invited_by, invite_note)
  values (p_room_id, v_email, 'viewer', v_uid, p_note)
  on conflict (room_id, lower(email)) do nothing
  returning * into v_out;

  if v_out.id is null then
    select * into v_out from public.flowroom_members m
     where m.room_id = p_room_id and lower(m.email) = v_email;
    return v_out;  -- already invited; idempotent, and reveals nothing new
  end if;

  insert into public.flowroom_activity (room_id, user_id, event, meta)
  values (p_room_id, v_uid, 'invited', jsonb_build_object('email', v_email));

  return v_out;
end;
$$;

-- Reading progress. Deliberately cheap and idempotent-ish: the console
-- aggregates, so a duplicate row costs nothing and losing one costs signal.
create or replace function public.flowroom_log_activity(
  p_room_id uuid, p_event text, p_block_key text default null, p_meta jsonb default '{}'::jsonb
) returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if public.flowroom_role(p_room_id) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_event not in ('viewed','section_read') then
    raise exception 'event not writable from the client' using errcode = '22023';
  end if;

  insert into public.flowroom_activity (room_id, user_id, event, target_block_key, meta)
  values (p_room_id, v_uid, p_event, p_block_key, coalesce(p_meta, '{}'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- Grants. REVOKE FROM PUBLIC FIRST — always. Granting to `authenticated`
-- does not remove the implicit PUBLIC grant that `anon` inherits.
-- ----------------------------------------------------------------------------

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'flowroom\_%'
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated, service_role', fn.sig);
  end loop;
end;
$$;

-- Tables: authenticated reads through RLS only; anon gets nothing at all.
revoke all on public.flowroom_rooms, public.flowroom_members, public.flowroom_blocks,
               public.flowroom_marks, public.flowroom_comments,
               public.flowroom_attachments, public.flowroom_activity
  from public, anon;

grant select on public.flowroom_rooms, public.flowroom_members, public.flowroom_blocks,
                public.flowroom_marks, public.flowroom_comments,
                public.flowroom_attachments, public.flowroom_activity
  to authenticated;

grant all on public.flowroom_rooms, public.flowroom_members, public.flowroom_blocks,
             public.flowroom_marks, public.flowroom_comments,
             public.flowroom_attachments, public.flowroom_activity
  to service_role;
grant usage, select on sequence public.flowroom_activity_id_seq to service_role;

-- ----------------------------------------------------------------------------
-- Realtime: marks and comments stream to the console in under 2s.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.flowroom_marks;
    alter publication supabase_realtime add table public.flowroom_comments;
  end if;
exception when duplicate_object then
  null;
end;
$$;

alter table public.flowroom_marks    replica identity full;
alter table public.flowroom_comments replica identity full;
