-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA / SafeFlow — 0007_flowbond_entitlements.sql · tier + feature gating
--
--  The entitlements plane for SafeFlow: "this FBID has tier T on app A". It sits
--  in the SAME authz spine as flowbond_grants (0002) — server-readable access
--  metadata, NO private content, does NOT weaken §0. Grants answer "may admin
--  app/page"; entitlements answer "which features/tier are unlocked".
--
--  v1 tiers: free / plus / pro (set by a superadmin or defaulted to free; a
--  billing source — Stripe/Mercado Pago via FlowShare — can write these later
--  without schema change). app_slug '*' = the account-wide tier; a per-app row
--  overrides it for that app.
--
--  Depends on 0002 (public.is_superadmin). Apply AFTER 0002.
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.flowbond_entitlements (
  user_id    uuid not null references public.flowbond_users(id) on delete cascade,
  app_slug   text not null default '*',                      -- '*' = account-wide
  tier       text not null default 'free' check (tier in ('free','plus','pro')),
  features   text[] not null default '{}',                   -- optional extra unlocks beyond the tier map
  granted_by uuid references public.flowbond_users(id),
  expires_at timestamptz,                                     -- null = no expiry
  updated_at timestamptz not null default now(),
  primary key (user_id, app_slug)
);
create index if not exists flowbond_entitlements_user_idx on public.flowbond_entitlements(user_id);

alter table public.flowbond_entitlements enable row level security;
drop policy if exists flowbond_entitlements_read on public.flowbond_entitlements;
create policy flowbond_entitlements_read on public.flowbond_entitlements
  for select using (user_id = auth.uid() or public.is_superadmin());
-- writes go through the SECURITY DEFINER RPC only (superadmin-gated)

-- ── effective entitlement: per-app row → account-wide '*' → default free ────
create or replace function public.claudia_my_entitlement(p_app_slug text default '*')
returns table(tier text, features text[], app_slug text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare e public.flowbond_entitlements;
begin
  -- prefer a live per-app row
  select * into e from public.flowbond_entitlements
   where user_id = auth.uid() and app_slug = p_app_slug
     and (expires_at is null or expires_at > now());
  if found then
    return query select e.tier, e.features, e.app_slug, e.expires_at; return;
  end if;
  -- else the account-wide row
  select * into e from public.flowbond_entitlements
   where user_id = auth.uid() and app_slug = '*'
     and (expires_at is null or expires_at > now());
  if found then
    return query select e.tier, e.features, e.app_slug, e.expires_at; return;
  end if;
  -- else default free
  return query select 'free'::text, '{}'::text[], '*'::text, null::timestamptz;
end $$;

-- ── superadmin sets a tier (the manual / future-billing entry point) ────────
create or replace function public.claudia_set_entitlement(
  p_user_id uuid, p_app_slug text, p_tier text,
  p_features text[] default '{}', p_expires timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'superadmin_required'; end if;
  if p_tier not in ('free','plus','pro') then raise exception 'bad-tier'; end if;
  insert into public.flowbond_entitlements(user_id, app_slug, tier, features, granted_by, expires_at, updated_at)
  values (p_user_id, coalesce(nullif(p_app_slug,''),'*'), p_tier, coalesce(p_features,'{}'), auth.uid(), p_expires, now())
  on conflict (user_id, app_slug) do update set
    tier = excluded.tier, features = excluded.features,
    granted_by = excluded.granted_by, expires_at = excluded.expires_at, updated_at = now();
end $$;

-- ── Grants ────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_my_entitlement(text)',
    'claudia_set_entitlement(uuid,text,text,text[],timestamptz)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
