-- TEP · Tu Estratega Patrimonial — lead capture
-- Applied to the canonical project (fgsrcxxccdjqyrpkitmk) on 2026-07-15.
-- This file is the repo record of that applied state: written idempotently so
-- re-running it on canonical is a no-op and a fresh project reproduces it exactly.
--
-- Security posture (deliberate, do not "fix" by adding policies):
--   RLS is ON and there are NO policies. That denies anon/authenticated every
--   row — a lead is a real person's name, email and financial motive, and no
--   browser-held key may ever read it back. The only write path is
--   tep_submit_lead (SECURITY DEFINER); the only read path is service_role,
--   which bypasses RLS. Adding a SELECT policy here would expose the lead list
--   to anyone holding the publishable key.

create table if not exists public.tep_leads (
  id               uuid primary key default gen_random_uuid(),
  -- Nullable: the form is public and does not require an FBID. Kept so a lead
  -- can later be reconciled to a person without a schema change.
  flowbond_user_id uuid references public.flowbond_users (id),
  nombre           text not null,
  correo           text not null,
  motivo           text not null,
  origen           text not null default 'tep-site',
  created_at       timestamptz not null default now()
);

comment on table public.tep_leads is
  'TEP lead requests from tep.flowme.one. Contains personal data (LFPDPPP). '
  'Inserted only via tep_submit_lead(); readable only by service_role.';

-- The panel reads newest-first.
create index if not exists tep_leads_created_at_idx
  on public.tep_leads using btree (created_at desc);

alter table public.tep_leads enable row level security;

-- Validation lives here, not in the browser: the form is public, so the client
-- is not a trust boundary. `motivo` must stay in lockstep with MOTIVOS in
-- src/lib/content.ts — changing one without the other breaks submission.
create or replace function public.tep_submit_lead(
  p_nombre text,
  p_correo text,
  p_motivo text
) returns uuid
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_correo text := lower(btrim(coalesce(p_correo, '')));
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if length(v_nombre) < 2 or length(v_nombre) > 120 then
    raise exception 'invalid_input' using hint = 'nombre';
  end if;

  if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_correo) > 200 then
    raise exception 'invalid_input' using hint = 'correo';
  end if;

  if v_motivo not in ('sucesion', 'estructura', 'venta', 'segunda-opinion', 'otro') then
    raise exception 'invalid_input' using hint = 'motivo';
  end if;

  insert into public.tep_leads (nombre, correo, motivo)
  values (v_nombre, v_correo, v_motivo)
  returning id into v_id;

  return v_id;
end
$function$;

-- The form is public: anon must be able to submit, and nothing more.
grant execute on function public.tep_submit_lead(text, text, text) to anon, authenticated;
