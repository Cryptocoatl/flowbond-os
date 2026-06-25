-- ════════════════════════════════════════════════════════════════════════
--  SafeFlow — 0008_flowbond_billing.sql · billing → tiers (plug-and-play)
--
--  Maps a payment provider's customer/subscription to an FBID, so a billing
--  webhook can keep flowbond_entitlements (0007) in sync automatically. This is
--  authz/billing metadata — NOT ZK content; §0 is unaffected.
--
--  The webhook writes with the SERVICE ROLE (bypasses RLS) after verifying the
--  provider signature server-side. Users can read only their own billing row.
--
--  Depends on 0007 (flowbond_entitlements). Apply AFTER 0007.
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.flowbond_billing_accounts (
  user_id            uuid not null references public.flowbond_users(id) on delete cascade,
  provider           text not null default 'stripe' check (provider in ('stripe','mercadopago')),
  customer_id        text not null,
  subscription_id    text,
  plan               text,                                  -- provider price/plan id
  tier               text not null default 'free' check (tier in ('free','plus','pro')),
  status             text,                                  -- active|past_due|canceled…
  current_period_end timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, provider)
);
create unique index if not exists flowbond_billing_customer_idx
  on public.flowbond_billing_accounts(provider, customer_id);

alter table public.flowbond_billing_accounts enable row level security;
drop policy if exists flowbond_billing_read on public.flowbond_billing_accounts;
create policy flowbond_billing_read on public.flowbond_billing_accounts
  for select using (user_id = auth.uid());
-- writes happen with the service role from the verified webhook (RLS bypassed).

-- Optional helper so a user's app can show "manage billing" state without
-- exposing the whole table.
create or replace function public.claudia_my_billing()
returns table(provider text, tier text, status text, current_period_end timestamptz)
language sql security definer set search_path = public as $$
  select provider, tier, status, current_period_end
  from public.flowbond_billing_accounts where user_id = auth.uid();
$$;

do $$
begin
  execute 'revoke all on function public.claudia_my_billing() from public';
  execute 'grant execute on function public.claudia_my_billing() to authenticated';
end $$;
