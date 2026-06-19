-- Remember a user's UI language on their profile so it follows them across
-- devices (the af_lang cookie handles the current device; this is the durable
-- per-identity preference). LanguageSwitcher calls set_my_lang best-effort.
alter table astroflow.profiles
  add column if not exists lang text not null default 'en';

create or replace function astroflow.set_my_lang(lang text)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); p_lang text := lang;
begin
  if me is null then return; end if;               -- no-op for signed-out callers
  if p_lang is null or p_lang not in ('en','es') then return; end if;
  update astroflow.profiles set lang = p_lang where fbid = me;
end; $function$;

grant execute on function astroflow.set_my_lang(text) to authenticated;
