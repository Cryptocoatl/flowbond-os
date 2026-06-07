-- FlowCredits — ecosystem-wide credit economy for FlowBond OS
-- Earn across apps (FlowGarden, DANZ, missions…), spend on creation (FLOW3
-- video/game/world generation) and memberships. One ledger, one identity
-- (auth.uid = public.flowbond_users.id).
--
-- Tables live in `public` (PostgREST-exposed); all writes flow through RPCs:
--   fc_balance()                          → current user's balance
--   fc_claim_welcome()                    → one-time welcome grant (idempotent)
--   fc_spend(amount, reason, app, ref)    → atomic spend, raises insufficient_credits
--   fc_earn(user, amount, reason, app)    → service_role only (game servers, missions)

-- ============================================================
-- LEDGER (append-only)
-- ============================================================
create table if not exists public.flowcredits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  kind text not null check (kind in ('earn', 'spend', 'grant', 'membership', 'adjust')),
  reason text not null,
  app_slug text not null default 'flow3',
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists flowcredits_ledger_user_idx
  on public.flowcredits_ledger (user_id, created_at desc);

-- one welcome grant per user, ever
create unique index if not exists flowcredits_welcome_once
  on public.flowcredits_ledger (user_id)
  where (reason = 'welcome');

alter table public.flowcredits_ledger enable row level security;

drop policy if exists "read own ledger" on public.flowcredits_ledger;
create policy "read own ledger" on public.flowcredits_ledger
  for select using (auth.uid() = user_id);
-- no insert/update/delete policies: writes only via security-definer RPCs

-- ============================================================
-- RPCS
-- ============================================================
create or replace function public.fc_balance()
returns integer
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::int
  from public.flowcredits_ledger
  where user_id = auth.uid();
$$;

create or replace function public.fc_claim_welcome()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.flowcredits_ledger (user_id, delta, kind, reason, app_slug)
  values (v_user, 500, 'grant', 'welcome', 'flow3')
  on conflict do nothing;

  return public.fc_balance();
end;
$$;

create or replace function public.fc_spend(
  p_amount integer,
  p_reason text,
  p_app_slug text default 'flow3',
  p_ref_id uuid default null
)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  -- serialize concurrent spends per user
  perform pg_advisory_xact_lock(hashtext('flowcredits:' || v_user::text));

  select coalesce(sum(delta), 0) into v_balance
  from public.flowcredits_ledger
  where user_id = v_user;

  if v_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  insert into public.flowcredits_ledger (user_id, delta, kind, reason, app_slug, ref_id)
  values (v_user, -p_amount, 'spend', p_reason, p_app_slug, p_ref_id);

  return v_balance - p_amount;
end;
$$;

-- Earning is server-to-server only (game backends, mission engines, memberships).
create or replace function public.fc_earn(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_app_slug text,
  p_kind text default 'earn',
  p_ref_id uuid default null
)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  insert into public.flowcredits_ledger (user_id, delta, kind, reason, app_slug, ref_id)
  values (p_user_id, p_amount, p_kind, p_reason, p_app_slug, p_ref_id);

  select coalesce(sum(delta), 0) into v_balance
  from public.flowcredits_ledger
  where user_id = p_user_id;

  return v_balance;
end;
$$;

revoke execute on function public.fc_earn(uuid, integer, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.fc_earn(uuid, integer, text, text, text, uuid) to service_role;

grant execute on function public.fc_balance() to authenticated;
grant execute on function public.fc_claim_welcome() to authenticated;
grant execute on function public.fc_spend(integer, text, text, uuid) to authenticated;

-- ============================================================
-- FLOW3 CREATIONS
-- ============================================================
create table if not exists public.flow3_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('video', 'game', 'world', 'dream')),
  prompt text not null,
  title text,
  status text not null default 'dreaming'
    check (status in ('dreaming', 'rendering', 'complete', 'failed')),
  cost integer not null default 0,
  output_url text,
  thumbnail_url text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flow3_creations_user_idx
  on public.flow3_creations (user_id, created_at desc);

alter table public.flow3_creations enable row level security;

drop policy if exists "own creations select" on public.flow3_creations;
create policy "own creations select" on public.flow3_creations
  for select using (auth.uid() = user_id);

drop policy if exists "own creations insert" on public.flow3_creations;
create policy "own creations insert" on public.flow3_creations
  for insert with check (auth.uid() = user_id);

drop policy if exists "own creations update" on public.flow3_creations;
create policy "own creations update" on public.flow3_creations
  for update using (auth.uid() = user_id);

drop policy if exists "own creations delete" on public.flow3_creations;
create policy "own creations delete" on public.flow3_creations
  for delete using (auth.uid() = user_id);
