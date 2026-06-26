-- ============================================================================
-- Sani Templo — self-serve onboarding: a shareable link where a teammate logs
-- in with FlowBond ID, fills a questionnaire (perfil), and lands as a PENDING
-- applicant with a suggested role + areas. An admin reviews the answers and
-- approves (role + feature grants). Extends 0002/0003 (same RLS + RPC pattern).
-- ============================================================================

alter table sani.team_members
  add column if not exists profile            jsonb  not null default '{}'::jsonb,
  add column if not exists suggested_role     text,
  add column if not exists suggested_features text[] not null default '{}',
  add column if not exists applied_at         timestamptz;

-- ── claim(): admin-invited members auto-activate on first login; self-serve
--    applicants (applied_at set) stay 'invited' until an admin approves them. ──
create or replace function sani.claim()
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare v_uid uuid := auth.uid(); v_email text; m sani.team_members;
begin
  if v_uid is null then raise exception 'no session' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into m from sani.team_members where user_id = v_uid limit 1;
  if m.id is null and v_email is not null then
    update sani.team_members
       set user_id = v_uid,
           status = case when status = 'invited' and applied_at is null then 'active' else status end,
           activated_at = case when status = 'invited' and applied_at is null
                               then coalesce(activated_at, now()) else activated_at end
     where lower(email) = lower(v_email) and user_id is null
    returning * into m;
  end if;
  if m.id is null then return jsonb_build_object('member', null); end if;
  perform sani._audit(m, 'login', null, '{}'::jsonb);
  return sani.me();
end; $$;

-- ── list_members(): include the questionnaire profile + application fields ────
create or replace function sani.list_members()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members; result jsonb;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) into result from (
    select tm.id, tm.email, tm.name, tm.role, tm.status, tm.created_at, tm.activated_at,
           tm.profile, tm.suggested_role, tm.suggested_features, tm.applied_at,
           (tm.applied_at is not null and tm.status = 'invited') as is_applicant,
           coalesce((select array_agg(g.feature order by g.feature) from sani.grants g where g.member_id = tm.id), '{}') as features,
           inv.email as invited_by_email
    from sani.team_members tm
    left join sani.team_members inv on inv.id = tm.invited_by
  ) t;
  return result;
end; $$;

-- ── apply_to_team(): self-serve. Any authenticated FlowBond ID can submit/edit
--    their own questionnaire. NEVER sets role/grants — only a suggestion. ──────
create or replace function sani.apply_to_team(
  p_profile jsonb, p_suggested_role text default 'member', p_suggested_features text[] default '{}')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare v_uid uuid := auth.uid(); v_email text; v_name text; m sani.team_members;
begin
  if v_uid is null then raise exception 'no session' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'no email'; end if;
  v_name := nullif(p_profile->>'name', '');
  select * into m from sani.team_members where user_id = v_uid or lower(email) = lower(v_email) limit 1;
  if m.id is null then
    insert into sani.team_members (user_id, email, name, role, status, profile, suggested_role, suggested_features, applied_at)
    values (v_uid, lower(v_email), v_name, 'member', 'invited', coalesce(p_profile, '{}'::jsonb),
            coalesce(nullif(p_suggested_role, ''), 'member'), coalesce(p_suggested_features, '{}'), now())
    returning * into m;
  else
    update sani.team_members set
      user_id = coalesce(user_id, v_uid),
      name = coalesce(v_name, name),
      profile = coalesce(p_profile, '{}'::jsonb),
      suggested_role = coalesce(nullif(p_suggested_role, ''), suggested_role),
      suggested_features = coalesce(p_suggested_features, suggested_features),
      applied_at = coalesce(applied_at, now())
    where id = m.id
    returning * into m;
  end if;
  perform sani._audit(m, 'apply_to_team', m.id::text, jsonb_build_object('suggested_role', p_suggested_role));
  return sani.me();
end; $$;

-- ── approve_applicant(): admin one-click — set role, activate, grant features ─
create or replace function sani.approve_applicant(p_member_id uuid, p_role text default 'member', p_features text[] default '{}')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; f text;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  if p_role not in ('member','admin','super_admin') then raise exception 'invalid role'; end if;
  if p_role <> 'member' and caller.role <> 'super_admin' then
    raise exception 'only super_admin can assign elevated roles' using errcode = '42501';
  end if;
  update sani.team_members
     set role = p_role, status = 'active', activated_at = coalesce(activated_at, now())
   where id = p_member_id;
  if not found then raise exception 'member not found'; end if;
  foreach f in array coalesce(p_features, '{}') loop
    if f in ('bookings','audit','logistics') then
      insert into sani.grants (member_id, feature, granted_by) values (p_member_id, f, caller.id)
      on conflict (member_id, feature) do nothing;
    end if;
  end loop;
  perform sani._audit(caller, 'approve_applicant', p_member_id::text,
                      jsonb_build_object('role', p_role, 'features', p_features));
  return sani.list_members();
end; $$;

-- ── privilege hardening: re-revoke PUBLIC, grant the new/replaced RPCs ────────
revoke execute on all functions in schema sani from public;
grant execute on function sani.me()                                   to authenticated, service_role;
grant execute on function sani.claim()                                to authenticated, service_role;
grant execute on function sani.list_members()                         to authenticated, service_role;
grant execute on function sani.apply_to_team(jsonb, text, text[])     to authenticated, service_role;
grant execute on function sani.approve_applicant(uuid, text, text[])  to authenticated, service_role;
