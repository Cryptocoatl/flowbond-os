-- Matchmaking — "open to" broadcast + Sparks (double-opt-in dating/connection).
--
-- Privacy model (consistent with the whole app):
--   • open_to is the ONLY thing you broadcast: which kinds of connection you're
--     open to (romance/friendship/coliving/business). It never exposes your chart.
--   • Discovery (open_matches) returns MINIMAL public fields only — handle,
--     display name, avatar — exactly like search_profiles. No chart, no birth data.
--   • A spark is a private one-way "I'm interested (for this intention)". Only the
--     two people involved can ever see a spark row (RLS).
--   • When two people spark each other, it becomes a real AstralBond (friendship +
--     mutual standard shares) — and ONLY THEN do their charts open to each other,
--     unlocking the deep compatibility analysis. Mutual consent first, always.
--
-- Everything server-side via current_fbid(); RPC-only writes (RLS blocks direct DML).

-- allowed intentions == the engine's relationship contexts
create or replace function astroflow.is_intention(x text)
returns boolean language sql immutable
set search_path to 'astroflow','public' as $$
  select x in ('romance','friendship','coliving','business')
$$;

-- ── open_to broadcast on the profile ────────────────────────────────────────
alter table astroflow.profiles
  add column if not exists open_to text[] not null default '{}';

create or replace function astroflow.set_open_to(intentions text[])
returns text[] language plpgsql security definer
set search_path to 'astroflow','public' as $$
declare me uuid := astroflow.current_fbid(); cleaned text[];
begin
  if me is null then raise exception 'not signed in'; end if;
  -- keep only valid, de-duplicated intentions
  select coalesce(array_agg(distinct v), '{}') into cleaned
  from unnest(coalesce(intentions,'{}')) v
  where astroflow.is_intention(v);
  update astroflow.profiles set open_to = cleaned where fbid = me;
  return cleaned;
end; $$;

create or replace function astroflow.my_open_to()
returns text[] language sql stable security definer
set search_path to 'astroflow','public' as $$
  select coalesce(open_to,'{}') from astroflow.profiles where fbid = astroflow.current_fbid();
$$;

-- ── sparks ──────────────────────────────────────────────────────────────────
create table if not exists astroflow.sparks (
  from_fbid  uuid not null references astroflow.profiles(fbid) on delete cascade,
  to_fbid    uuid not null references astroflow.profiles(fbid) on delete cascade,
  intention  text not null,
  created_at timestamptz not null default now(),
  primary key (from_fbid, to_fbid, intention),
  check (from_fbid <> to_fbid),
  check (astroflow.is_intention(intention))
);
alter table astroflow.sparks enable row level security;
-- Only the two parties may ever read a spark; writes are RPC-only (no policy).
drop policy if exists sparks_read on astroflow.sparks;
create policy sparks_read on astroflow.sparks for select
  using (astroflow.current_fbid() in (from_fbid, to_fbid));

-- ── discover people open to the same intention (MINIMAL info only) ───────────
create or replace function astroflow.open_matches(intention text)
returns table(handle text, display_name text, avatar_color text,
              i_sparked boolean, they_sparked boolean, is_friend boolean)
language sql stable security definer
set search_path to 'astroflow','public' as $$
  select p.handle, p.display_name, p.avatar_color,
    exists(select 1 from astroflow.sparks s where s.from_fbid = astroflow.current_fbid() and s.to_fbid = p.fbid and s.intention = open_matches.intention) as i_sparked,
    exists(select 1 from astroflow.sparks s where s.from_fbid = p.fbid and s.to_fbid = astroflow.current_fbid() and s.intention = open_matches.intention) as they_sparked,
    astroflow.are_friends(astroflow.current_fbid(), p.fbid) as is_friend
  from astroflow.profiles p
  where astroflow.current_fbid() is not null
    and astroflow.is_intention(open_matches.intention)
    and p.fbid <> astroflow.current_fbid()
    and p.open_to @> array[open_matches.intention]
    -- don't surface people you've already blocked/erased or already bonded with
    and not exists (select 1 from astroflow.bond_erasures b
                    where b.lo = least(astroflow.current_fbid(), p.fbid)
                      and b.hi = greatest(astroflow.current_fbid(), p.fbid))
  order by they_sparked desc, is_friend, p.display_name
  limit 60;
$$;

-- ── send a spark (mutual spark = instant AstralBond + charts open) ───────────
create or replace function astroflow.send_spark(target_handle text, intention text)
returns jsonb language plpgsql security definer
set search_path to 'astroflow','public' as $$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not astroflow.is_intention(intention) then raise exception 'bad intention'; end if;
  select fbid into target from astroflow.profiles where handle = target_handle;
  if target is null then raise exception 'No AstralFlow user @%', target_handle; end if;
  if target = me then raise exception 'That is you'; end if;
  if not exists (select 1 from astroflow.profiles where fbid = me) then
    raise exception 'Create your AstralFlow chart first'; end if;

  insert into astroflow.sparks(from_fbid, to_fbid, intention) values (me, target, intention)
    on conflict do nothing;

  -- reciprocal spark? → weave the bond, open the charts (both ways)
  if exists (select 1 from astroflow.sparks s
             where s.from_fbid = target and s.to_fbid = me and s.intention = send_spark.intention) then
    -- reuse an existing friendship row in EITHER direction; else create one
    if exists (select 1 from astroflow.friendships
               where (a_fbid = me and b_fbid = target) or (a_fbid = target and b_fbid = me)) then
      update astroflow.friendships set status = 'accepted'
        where (a_fbid = me and b_fbid = target) or (a_fbid = target and b_fbid = me);
    else
      insert into astroflow.friendships(a_fbid, b_fbid, status) values (me, target, 'accepted')
        on conflict (a_fbid, b_fbid) do update set status = 'accepted';
    end if;
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
      values (me, target, 'standard', (case when intention='romance' then 'romantic' else 'friendship' end)::astroflow.share_context),
             (target, me, 'standard', (case when intention='romance' then 'romantic' else 'friendship' end)::astroflow.share_context)
      on conflict do nothing;
    update astroflow.profiles set visibility = 'specific'
      where fbid in (me, target) and visibility = 'private';
    delete from astroflow.bond_erasures
      where lo = least(me, target) and hi = greatest(me, target);
    return jsonb_build_object('status','matched','handle',target_handle,'intention',intention);
  end if;

  return jsonb_build_object('status','sparked','handle',target_handle,'intention',intention);
end; $$;

create or replace function astroflow.withdraw_spark(target_handle text, intention text)
returns void language plpgsql security definer
set search_path to 'astroflow','public' as $$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into target from astroflow.profiles where handle = target_handle;
  delete from astroflow.sparks where from_fbid = me and to_fbid = target and sparks.intention = withdraw_spark.intention;
end; $$;

-- who sparked me (that I haven't sparked back) — the "someone likes you" inbox
create or replace function astroflow.my_incoming_sparks()
returns table(handle text, display_name text, avatar_color text, intention text)
language sql stable security definer
set search_path to 'astroflow','public' as $$
  select p.handle, p.display_name, p.avatar_color, s.intention
  from astroflow.sparks s
  join astroflow.profiles p on p.fbid = s.from_fbid
  where s.to_fbid = astroflow.current_fbid()
    and not exists (select 1 from astroflow.sparks mine
                    where mine.from_fbid = astroflow.current_fbid()
                      and mine.to_fbid = s.from_fbid and mine.intention = s.intention)
  order by s.created_at desc;
$$;

grant execute on function astroflow.is_intention(text)            to authenticated;
grant execute on function astroflow.set_open_to(text[])           to authenticated;
grant execute on function astroflow.my_open_to()                  to authenticated;
grant execute on function astroflow.open_matches(text)            to authenticated;
grant execute on function astroflow.send_spark(text,text)         to authenticated;
grant execute on function astroflow.withdraw_spark(text,text)     to authenticated;
grant execute on function astroflow.my_incoming_sparks()          to authenticated;
