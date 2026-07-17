-- Dreams — "ask AstralFlow what to build next."
--
-- A community roadmap-signal surface: anyone signed in can post a dream (a
-- feature or experience they wish AstralFlow had), the wall shows all dreams
-- with upvotes, and people vote what they want most. This is how the people
-- who use AstralFlow tell us — and me — what to build. FlowMe can also ideate
-- fresh dreams (that path is in /api/dreams, not here).
--
-- RPC-only, matching the rest of astroflow: RLS is locked and every read/write
-- goes through a SECURITY DEFINER function keyed on current_fbid().

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists astroflow.dreams (
  id          uuid primary key default gen_random_uuid(),
  fbid        uuid not null,                       -- author (astroflow identity)
  title       text not null check (length(btrim(title)) between 2 and 140),
  body        text not null default '' check (length(body) <= 2000),
  source      text not null default 'human' check (source in ('human','flowme')),
  status      text not null default 'dreaming'
              check (status in ('dreaming','considering','building','shipped','archived')),
  created_at  timestamptz not null default now()
);
create index if not exists dreams_created_idx on astroflow.dreams (created_at desc);
create index if not exists dreams_fbid_idx on astroflow.dreams (fbid);

create table if not exists astroflow.dream_votes (
  dream_id  uuid not null references astroflow.dreams(id) on delete cascade,
  fbid      uuid not null,
  created_at timestamptz not null default now(),
  primary key (dream_id, fbid)
);

alter table astroflow.dreams enable row level security;
alter table astroflow.dream_votes enable row level security;
-- No policies: all access is through the SECURITY DEFINER RPCs below.

-- ── submit a dream ──────────────────────────────────────────────────────────
create or replace function astroflow.submit_dream(p_title text, p_body text default '')
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); d astroflow.dreams;
begin
  if me is null then raise exception 'not signed in'; end if;
  if length(btrim(p_title)) < 2 then raise exception 'A dream needs a few words'; end if;
  insert into astroflow.dreams (fbid, title, body)
    values (me, btrim(p_title), coalesce(btrim(p_body), ''))
    returning * into d;
  -- your own dream starts with your vote
  insert into astroflow.dream_votes (dream_id, fbid) values (d.id, me)
    on conflict do nothing;
  return to_jsonb(d);
end;
$function$;

-- ── the dream wall (community roadmap) ──────────────────────────────────────
-- Public within the app: any signed-in user sees every non-archived dream, its
-- vote count, whether they voted, and the author's minimal public identity.
create or replace function astroflow.dream_wall(p_sort text default 'top', p_limit int default 50)
returns table(
  id uuid, title text, body text, status text, source text, created_at timestamptz,
  votes bigint, i_voted boolean, mine boolean,
  author_handle text, author_name text, author_color text
)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select d.id, d.title, d.body, d.status, d.source, d.created_at,
    (select count(*) from astroflow.dream_votes v where v.dream_id = d.id) as votes,
    exists (select 1 from astroflow.dream_votes v
            where v.dream_id = d.id and v.fbid = astroflow.current_fbid()) as i_voted,
    d.fbid = astroflow.current_fbid() as mine,
    p.handle, p.display_name, p.avatar_color
  from astroflow.dreams d
  left join astroflow.profiles p on p.fbid = d.fbid
  where astroflow.current_fbid() is not null
    and d.status <> 'archived'
  order by
    case when coalesce(p_sort,'top') = 'new' then d.created_at end desc nulls last,
    (select count(*) from astroflow.dream_votes v where v.dream_id = d.id) desc,
    d.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$function$;

-- ── vote / unvote (toggle) ──────────────────────────────────────────────────
create or replace function astroflow.toggle_dream_vote(p_dream uuid)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); had boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  select exists (select 1 from astroflow.dream_votes
                 where dream_id = p_dream and fbid = me) into had;
  if had then
    delete from astroflow.dream_votes where dream_id = p_dream and fbid = me;
  else
    insert into astroflow.dream_votes (dream_id, fbid) values (p_dream, me)
      on conflict do nothing;
  end if;
  return jsonb_build_object(
    'i_voted', not had,
    'votes', (select count(*) from astroflow.dream_votes where dream_id = p_dream));
end;
$function$;

-- ── withdraw your own dream ─────────────────────────────────────────────────
create or replace function astroflow.withdraw_dream(p_dream uuid)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from astroflow.dreams where id = p_dream and fbid = me; -- own only
end;
$function$;

grant execute on function astroflow.submit_dream(text, text) to authenticated;
grant execute on function astroflow.dream_wall(text, int) to authenticated;
grant execute on function astroflow.toggle_dream_vote(uuid) to authenticated;
grant execute on function astroflow.withdraw_dream(uuid) to authenticated;
