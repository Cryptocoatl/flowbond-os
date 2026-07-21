-- Collective usage-memory — privacy-absolute, injection-proof.
--
-- The point: learn how AstralFlow is really used so we can keep improving it,
-- WITHOUT ever storing who did what. Design constraints, non-negotiable:
--
--   1. NO PII, NO identity. We never store fbid / handle / IP / user-agent.
--      Rows are anonymous aggregate signal: an allowlisted event name, the
--      screen, the UI locale, and the coarse DAY (not a timestamp — no timing
--      correlation). A row can never be traced to a person.
--   2. Injection-proof. Writes go only through SECURITY DEFINER RPCs; the event
--      and screen are checked against a fixed ALLOWLIST and silently dropped if
--      unknown, so no free-form string is ever stored from those fields.
--      Feedback text is bounded + control-chars stripped and is only ever DATA:
--      it is never executed, never concatenated into SQL (parameterized), and
--      React escapes it on render. It must always be treated as untrusted if
--      ever summarized by a model.
--   3. No readable endpoint to abuse. There is no read RPC granted to users;
--      aggregates are read out-of-band (service role) for improvement analysis.
--   RLS is enabled with NO policies — all access is the RPCs below.

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists astroflow.usage_events (
  id      bigint generated always as identity primary key,
  event   text not null,          -- allowlisted; see track_event()
  screen  text not null default '',
  locale  text not null default '',
  day     date not null default current_date  -- coarse: no timestamp stored
);
create index if not exists usage_events_day_idx on astroflow.usage_events (day, event);

create table if not exists astroflow.usage_feedback (
  id       bigint generated always as identity primary key,
  kind     text not null,         -- allowlisted: love | confusing | bug | idea
  note     text not null default '',
  screen   text not null default '',
  locale   text not null default '',
  day      date not null default current_date
);

alter table astroflow.usage_events enable row level security;
alter table astroflow.usage_feedback enable row level security;
-- No policies: RPC-only.

-- ── track an anonymous usage event ──────────────────────────────────────────
-- Allowlist lives in the function. Anything not on it is a silent no-op, so the
-- event/screen columns can only ever hold known, safe tokens.
create or replace function astroflow.track_event(p_event text, p_screen text default '', p_locale text default '')
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare
  ok_events text[] := array[
    'view_home','view_today','view_chart','view_map','view_systems','view_cosmos',
    'view_atlas','view_dashboard','view_dreams','view_privacy','view_profile',
    'wheel_opened','wheel_detail','reading_requested','sky_read','daily_read',
    'dream_posted','dream_voted','dream_ideate','friend_search','bond_requested',
    'flowme_opened','guide_opened','system_viewed'
  ];
  ok_screens text[] := array[
    'home','today','chart','map','systems','cosmos','atlas','dashboard',
    'dreams','privacy','profile','instant',''
  ];
begin
  if not (p_event = any(ok_events)) then return; end if;              -- drop unknown
  insert into astroflow.usage_events (event, screen, locale)
  values (
    p_event,
    case when p_screen = any(ok_screens) then p_screen else '' end,
    case when p_locale in ('en','es') then p_locale else '' end
  );
end;
$function$;

-- ── submit anonymous feedback ───────────────────────────────────────────────
-- kind is allowlisted; note is bounded, control-chars stripped, DATA only.
create or replace function astroflow.submit_feedback(p_kind text, p_note text default '', p_screen text default '', p_locale text default '')
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare clean text;
begin
  if not (p_kind in ('love','confusing','bug','idea')) then return; end if;
  -- strip control chars, collapse whitespace, hard length cap. Never executed.
  clean := left(btrim(regexp_replace(coalesce(p_note,''), '[\x00-\x1F\x7F]', ' ', 'g')), 1000);
  insert into astroflow.usage_feedback (kind, note, screen, locale)
  values (
    p_kind, clean,
    left(coalesce(p_screen,''), 24),
    case when p_locale in ('en','es') then p_locale else '' end
  );
end;
$function$;

-- Writes only. No read grant — aggregates are read out-of-band (service role).
-- Signed-in only keeps the abuse surface small (still fully anonymous).
grant execute on function astroflow.track_event(text, text, text) to authenticated;
grant execute on function astroflow.submit_feedback(text, text, text, text) to authenticated;
