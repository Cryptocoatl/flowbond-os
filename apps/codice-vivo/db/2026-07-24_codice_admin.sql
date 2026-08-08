-- ============================================================================
-- Códice Vivo — Admin OS schema  (canonical Supabase: fgsrcxxccdjqyrpkitmk)
-- Pattern A: app-prefixed · RLS on · SECURITY DEFINER RPCs · append-only log.
-- Auth: self-contained HANDLE + ACCESS-CODE gate (no Supabase Auth). The CF
--       Function verifies handle+code (code_hash = sha256(code + AUTH_SECRET)),
--       then issues an HMAC-signed session token. Actor in the audit trail is
--       the handle (e.g. '@moenchi88').
--
-- APPLY DRY-RUN FIRST:  BEGIN;  \i this file  ...inspect...  ROLLBACK;
-- then re-run inside  BEGIN; ... COMMIT;  once verified.
-- ============================================================================

-- ---------- admins / allowlist (handle-keyed) ---------------------------------
create table if not exists public.codice_admins (
  handle       text primary key,                 -- e.g. '@moenchi88'
  code_hash    text not null,                     -- sha256(access_code + AUTH_SECRET), hex
  display_name text,
  role         text not null default 'editor'
                 check (role in ('super_admin','editor')),
  active       boolean not null default true,
  added_by     text,
  created_at   timestamptz not null default now(),
  last_login   timestamptz
);

-- ---------- copy / string overrides (data-key -> value) ------------------------
-- key convention:  "<section>.<field>.<lang>"  e.g. "hero.lede.es"
create table if not exists public.codice_overrides (
  key                text primary key,
  value              text,
  published          boolean not null default true,
  -- governance lock: transparency numbers + named-partner claims stay OFF the
  -- public page until a super_admin releases them (needs signed agreements).
  governance_locked  boolean not null default false,
  released_by        text,
  released_at        timestamptz,
  updated_by         text,
  updated_at         timestamptz not null default now()
);

-- ---------- structured additions (new sections / stages / entries) -------------
create table if not exists public.codice_sections (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null
                 check (kind in ('chapter','roadmap_stage','ally','fold','custom')),
  position     integer not null default 0,
  payload      jsonb not null default '{}'::jsonb,             -- bilingual fields inside
  published    boolean not null default true,
  deleted      boolean not null default false,
  created_by   text,
  updated_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- vision-slot / atmosphere media (R2-backed) -------------------------
create table if not exists public.codice_media (
  id                uuid primary key default gen_random_uuid(),
  slot              text not null,                             -- e.g. dome_interior_01
  r2_key            text not null,
  url               text not null,
  content_rule_ack  boolean not null default false,           -- §2 no-iconography affirmation
  published         boolean not null default true,
  uploaded_by       text,
  created_at        timestamptz not null default now()
);

-- ---------- append-only activity log ------------------------------------------
create table if not exists public.codice_activity_log (
  id            bigint generated always as identity primary key,
  actor         text,                     -- handle
  action        text not null,            -- save_override | add_section | upload_media | release_governance | revert | login ...
  target        text,
  before_val    jsonb,
  after_val     jsonb,
  created_at    timestamptz not null default now()
);

-- ---------- append-only internal ClaudIA chat ---------------------------------
create table if not exists public.codice_chat (
  id            bigint generated always as identity primary key,
  thread        text not null default 'main',
  role          text not null check (role in ('user','assistant','system','tool')),
  actor         text,                     -- handle
  content       text,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

-- ---------- append-only guard (block UPDATE/DELETE on log + chat) --------------
create or replace function public.codice_append_only() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'codice: % is append-only', tg_table_name; end $$;

drop trigger if exists codice_log_append_only  on public.codice_activity_log;
create trigger codice_log_append_only  before update or delete on public.codice_activity_log
  for each row execute function public.codice_append_only();
drop trigger if exists codice_chat_append_only on public.codice_chat;
create trigger codice_chat_append_only before update or delete on public.codice_chat
  for each row execute function public.codice_append_only();

-- ---------- keep updated_at fresh ---------------------------------------------
create or replace function public.codice_touch() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists codice_sections_touch on public.codice_sections;
create trigger codice_sections_touch before update on public.codice_sections
  for each row execute function public.codice_touch();

-- ============================================================================
-- RLS: deny-all to anon/authenticated. Public reads go through codice_site()
-- only; writes go through service_role (bypasses RLS) via the CF Function.
-- ============================================================================
alter table public.codice_admins        enable row level security;
alter table public.codice_overrides     enable row level security;
alter table public.codice_sections      enable row level security;
alter table public.codice_media         enable row level security;
alter table public.codice_activity_log  enable row level security;
alter table public.codice_chat          enable row level security;
-- (no policies on purpose: anon/authenticated get nothing directly)

-- ============================================================================
-- RPCs (SECURITY DEFINER)
-- ============================================================================

-- Public read: only PUBLISHED, non-governance-locked overrides + published
-- sections + latest published media per slot. Safe for anon.
create or replace function public.codice_site()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'overrides', coalesce((
      select jsonb_object_agg(key, value) from public.codice_overrides
      where published and not governance_locked and value is not null), '{}'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'position',position,'payload',payload)
                       order by position, created_at)
      from public.codice_sections where published and not deleted), '[]'::jsonb),
    'media', coalesce((
      select jsonb_object_agg(slot, url) from (
        select distinct on (slot) slot, url from public.codice_media
        where published order by slot, created_at desc) m), '{}'::jsonb)
  );
$$;
grant execute on function public.codice_site() to anon, authenticated;

-- Save a copy/string override (+ audit log). governance_locked keys never
-- publish until released.
create or replace function public.codice_save_override(
  p_actor text, p_key text, p_value text, p_locked boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_before jsonb;
begin
  select to_jsonb(o.*) into v_before from public.codice_overrides o where key=p_key;
  insert into public.codice_overrides(key,value,updated_by,updated_at,governance_locked)
  values (p_key,p_value,p_actor,now(),coalesce(p_locked,false))
  on conflict (key) do update set value=excluded.value, updated_by=excluded.updated_by,
    updated_at=now(), governance_locked=coalesce(p_locked,public.codice_overrides.governance_locked);
  insert into public.codice_activity_log(actor,action,target,before_val,after_val)
  values (p_actor,'save_override',p_key,v_before,jsonb_build_object('value',p_value,'locked',coalesce(p_locked,false)));
end $$;

-- Release a governance-locked value to the public page (super_admin only —
-- enforced in the Function; logged here).
create or replace function public.codice_release_governance(p_actor text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.codice_overrides set governance_locked=false, released_by=p_actor, released_at=now() where key=p_key;
  insert into public.codice_activity_log(actor,action,target,after_val)
  values (p_actor,'release_governance',p_key,jsonb_build_object('released',true));
end $$;

-- Add / update a structured section (+ audit log).
create or replace function public.codice_upsert_section(
  p_actor text, p_id uuid, p_kind text, p_position int, p_payload jsonb, p_published boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into public.codice_sections(kind,position,payload,published,created_by,updated_by)
    values (p_kind,p_position,p_payload,p_published,p_actor,p_actor) returning id into v_id;
    insert into public.codice_activity_log(actor,action,target,after_val) values (p_actor,'add_section',v_id::text,p_payload);
  else
    update public.codice_sections set kind=p_kind,position=p_position,payload=p_payload,
      published=p_published,updated_by=p_actor where id=p_id returning id into v_id;
    insert into public.codice_activity_log(actor,action,target,after_val) values (p_actor,'update_section',v_id::text,p_payload);
  end if;
  return v_id;
end $$;

-- Register an uploaded media asset (R2 url) for a vision slot (+ audit log).
create or replace function public.codice_add_media(
  p_actor text, p_slot text, p_r2_key text, p_url text, p_ack boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.codice_media(slot,r2_key,url,content_rule_ack,uploaded_by)
  values (p_slot,p_r2_key,p_url,coalesce(p_ack,false),p_actor) returning id into v_id;
  insert into public.codice_activity_log(actor,action,target,after_val)
  values (p_actor,'upload_media',p_slot,jsonb_build_object('url',p_url,'ack',p_ack));
  return v_id;
end $$;

-- Free-form log hook (revert, login, anything).
create or replace function public.codice_log(
  p_actor text, p_action text, p_target text, p_before jsonb default null, p_after jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.codice_activity_log(actor,action,target,before_val,after_val)
  values (p_actor,p_action,p_target,p_before,p_after);
$$;

-- Append a chat message (internal ClaudIA thread).
create or replace function public.codice_chat_append(
  p_thread text, p_role text, p_actor text, p_content text, p_meta jsonb default null)
returns bigint language sql security definer set search_path = public as $$
  insert into public.codice_chat(thread,role,actor,content,meta)
  values (coalesce(p_thread,'main'),p_role,p_actor,p_content,p_meta) returning id;
$$;

-- Stamp last_login (called by the Function after a successful handle+code auth).
create or replace function public.codice_mark_login(p_handle text)
returns void language sql security definer set search_path = public as $$
  update public.codice_admins set last_login=now() where handle=p_handle;
$$;

-- Lock every mutation RPC from PUBLIC (anon/authenticated inherit PUBLIC's
-- default EXECUTE grant — revoking only from anon/authenticated is NOT enough).
-- Grant execute solely to service_role, which the CF Function uses.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.codice_save_override(text,text,text,boolean)',
    'public.codice_release_governance(text,text)',
    'public.codice_upsert_section(text,uuid,text,int,jsonb,boolean)',
    'public.codice_add_media(text,text,text,text,boolean)',
    'public.codice_log(text,text,text,jsonb,jsonb)',
    'public.codice_chat_append(text,text,text,text,jsonb)',
    'public.codice_mark_login(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- ---------- seed super_admin --------------------------------------------------
-- Done at go-live from the deploy script (code_hash computed with AUTH_SECRET):
--   insert into public.codice_admins(handle,code_hash,display_name,role,added_by)
--   values ('@moenchi88','<sha256(code+AUTH_SECRET)>','Moenchi','super_admin','steph')
--   on conflict (handle) do update set code_hash=excluded.code_hash, role='super_admin', active=true;
