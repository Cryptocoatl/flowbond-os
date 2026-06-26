-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0010_flowbond_channels.sql · channel identities (always-on node)
--
--  Lets the always-on ClaudIA node know WHICH member an incoming message
--  (WhatsApp / Telegram / Signal / Matrix / Instagram) belongs to, so it can
--  serve only members and gate by their SafeFlow tier. A member links a channel
--  by generating a one-time code in their dashboard and sending it to the bot
--  from that platform; the node (service role) redeems the code → binds the
--  platform id to the FBID.
--
--  Plane note: this is authz/identity mapping (WHO), not content — it does NOT
--  weaken §0. The always-on node is the operational tier (private, not zero-
--  knowledge); the sealed vault stays device-keyed.
--
--  Depends on 0001 (flowbond_users). Apply to a DEV BRANCH; validate; merge.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.flowbond_channel_links (
  platform    text not null check (platform in ('telegram','whatsapp','signal','matrix','instagram','discord')),
  platform_id text not null,                              -- the sender id on that platform
  user_id     uuid not null references public.flowbond_users(id) on delete cascade,
  display     text,                                       -- human label ("@handle", phone tail…)
  created_at  timestamptz not null default now(),
  primary key (platform, platform_id)
);
create index if not exists flowbond_channel_links_user_idx on public.flowbond_channel_links(user_id);

create table if not exists public.flowbond_channel_codes (
  code       text primary key,
  user_id    uuid not null references public.flowbond_users(id) on delete cascade,
  platform   text,                                        -- optional hint; null = any
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists flowbond_channel_codes_user_idx on public.flowbond_channel_codes(user_id);

alter table public.flowbond_channel_links enable row level security;
drop policy if exists flowbond_channel_links_read on public.flowbond_channel_links;
create policy flowbond_channel_links_read on public.flowbond_channel_links
  for select using (user_id = auth.uid());

alter table public.flowbond_channel_codes enable row level security;
drop policy if exists flowbond_channel_codes_owner on public.flowbond_channel_codes;
create policy flowbond_channel_codes_owner on public.flowbond_channel_codes
  for select using (user_id = auth.uid());

-- ── member-facing RPCs (authenticated) ─────────────────────────────────────
-- mint a one-time link code to send to the bot from a platform
create or replace function public.claudia_new_channel_code(p_platform text default null)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
  insert into public.flowbond_channel_codes(code, user_id, platform) values (c, auth.uid(), nullif(p_platform,''));
  return c;
end $$;

create or replace function public.claudia_my_channels()
returns table(platform text, platform_id text, display text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select platform, platform_id, display, created_at
  from public.flowbond_channel_links where user_id = auth.uid()
  order by created_at desc;
$$;

create or replace function public.claudia_unlink_channel(p_platform text, p_platform_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.flowbond_channel_links
   where platform = p_platform and platform_id = p_platform_id and user_id = auth.uid();
end $$;

-- ── node-facing RPCs (SERVICE ROLE only — the always-on node) ───────────────
-- redeem a code sent from a platform → bind platform_id to the code's FBID
create or replace function public.claudia_redeem_channel_code(
  p_code text, p_platform text, p_platform_id text, p_display text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.flowbond_channel_codes
   where code = upper(p_code) and not used and expires_at > now()
   for update;
  if uid is null then raise exception 'code-invalid'; end if;

  insert into public.flowbond_channel_links(platform, platform_id, user_id, display)
  values (p_platform, p_platform_id, uid, p_display)
  on conflict (platform, platform_id) do update set user_id = excluded.user_id, display = excluded.display;

  update public.flowbond_channel_codes set used = true where code = upper(p_code);
  return uid;
end $$;

-- resolve an incoming platform sender → the FBID (or null if not a member)
create or replace function public.claudia_channel_user(p_platform text, p_platform_id text)
returns uuid language sql security definer set search_path = public as $$
  select user_id from public.flowbond_channel_links
  where platform = p_platform and platform_id = p_platform_id;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  -- member-facing → authenticated
  foreach fn in array array[
    'claudia_new_channel_code(text)',
    'claudia_my_channels()',
    'claudia_unlink_channel(text,text)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
  -- node-facing → service_role only
  foreach fn in array array[
    'claudia_redeem_channel_code(text,text,text,text)',
    'claudia_channel_user(text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;
