-- 0011_openflow_events.sql
-- openflow analytics: anonymous journey events for the Jeff gated-book experience
-- Pattern A: RLS deny-by-default, all client access via SECURITY DEFINER RPC.
-- No PII: event name + free jsonb detail + truncated UA hint only.

create table if not exists openflow_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in
    ('gate_unlocked','gate_failed','welcome_viewed','chapter_viewed',
     'pdf_downloaded','closing_viewed')),
  detail jsonb not null default '{}'::jsonb,
  ua_hint text,
  created_at timestamptz not null default now()
);

alter table openflow_events enable row level security;
-- no policies: deny-by-default; access only via RPC

create or replace function openflow_log_event(p_event text, p_detail jsonb default '{}'::jsonb, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into openflow_events(event, detail, ua_hint)
  values (p_event, coalesce(p_detail, '{}'::jsonb), left(coalesce(p_ua, ''), 160));
end $$;

revoke all on function openflow_log_event(text, jsonb, text) from public;
grant execute on function openflow_log_event(text, jsonb, text) to anon, authenticated;
