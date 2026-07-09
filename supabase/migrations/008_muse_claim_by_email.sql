-- =============================================================================
-- 008 · MUSE — claim-by-email (issue a MUSE before the recipient has an FBID)
-- =============================================================================
-- A MUSE can only bind to a real FBID (public.flowbond_users.id). To issue a
-- MUSE to someone who hasn't signed into a FlowBond app yet, governance stores
-- a PENDING issuance keyed by email. The MUSE is minted automatically the first
-- time that email becomes an FBID (AFTER INSERT trigger on flowbond_users), or
-- on demand via muse.claim().
--
-- Refactor: the mint body moves into muse._mint_internal() (no auth check, takes
-- an explicit actor) so both the governor path (muse.mint) and the auto-claim
-- path can reuse it.
-- =============================================================================

-- ── internal mint (no authorization — callers must gate) ─────────────────────
create or replace function muse._mint_internal(
  p_owner_fbid uuid, p_slug text, p_name text,
  p_immutable jsonb, p_mutable jsonb, p_grants jsonb, p_actor uuid
) returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare v_muse muse.muses; v_imm jsonb; g jsonb;
begin
  if not exists (select 1 from public.flowbond_users where id = p_owner_fbid) then
    raise exception 'owner FBID % does not exist', p_owner_fbid using errcode = '23503';
  end if;
  v_imm := coalesce(p_immutable,'{}'::jsonb) || jsonb_build_object('soulbound', true, 'issued_to', p_owner_fbid);
  insert into muse.muses (slug, name, owner_fbid, immutable_terms, immutable_hash, mutable_terms, minted_by)
  values (p_slug, p_name, p_owner_fbid, v_imm, muse._hash(v_imm), coalesce(p_mutable,'{}'::jsonb), p_actor)
  returning * into v_muse;
  for g in select * from jsonb_array_elements(coalesce(p_grants,'[]'::jsonb)) loop
    insert into muse.grants (muse_id, kind, scope, detail, locked, granted_by)
    values (v_muse.id, g->>'kind', g->>'scope', coalesce(g->'detail','{}'::jsonb),
            coalesce((g->>'locked')::boolean, false), p_actor);
  end loop;
  insert into muse.amendments (muse_id, version, mutable_terms, patch, amended_by)
  values (v_muse.id, 1, v_muse.mutable_terms, '{}'::jsonb, p_actor);
  perform muse._log(v_muse.id, 'mint', p_actor, jsonb_build_object(
    'owner', p_owner_fbid, 'slug', p_slug, 'immutable_hash', v_muse.immutable_hash, 'grants', p_grants));
  return v_muse;
end; $$;

-- muse.mint() now = governor check + internal mint
create or replace function muse.mint(
  p_owner_fbid uuid, p_slug text, p_name text,
  p_immutable jsonb default '{}'::jsonb, p_mutable jsonb default '{}'::jsonb, p_grants jsonb default '[]'::jsonb
) returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor();
begin
  return muse._mint_internal(p_owner_fbid, p_slug, p_name, p_immutable, p_mutable, p_grants, v_actor);
end; $$;

-- ── pending issuances (keyed by email, awaiting an FBID) ─────────────────────
create table if not exists muse.pending (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  slug            text not null unique,
  name            text not null,
  immutable_terms jsonb not null default '{}'::jsonb,
  mutable_terms   jsonb not null default '{}'::jsonb,
  grants          jsonb not null default '[]'::jsonb,
  authorized_by   uuid references public.flowbond_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  claimed_muse_id uuid references muse.muses(id) on delete set null,
  claimed_at      timestamptz
);
create index if not exists pending_email_idx on muse.pending (lower(email)) where claimed_at is null;
alter table muse.pending enable row level security;  -- deny-by-default

-- ── issue: mint now if the email already has an FBID, else stage as pending ───
create or replace function muse.issue_to_email(
  p_email text, p_slug text, p_name text,
  p_immutable jsonb default '{}'::jsonb, p_mutable jsonb default '{}'::jsonb, p_grants jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor(); v_fbid uuid; v_muse muse.muses;
begin
  if exists (select 1 from muse.muses where slug = p_slug)
     or exists (select 1 from muse.pending where slug = p_slug and claimed_at is null) then
    raise exception 'slug % already in use', p_slug using errcode = '23505';
  end if;

  select id into v_fbid from public.flowbond_users where lower(email) = lower(p_email) limit 1;

  if v_fbid is not null then
    v_muse := muse._mint_internal(v_fbid, p_slug, p_name, p_immutable, p_mutable, p_grants, v_actor);
    return jsonb_build_object('status','minted','muse_id',v_muse.id,'slug',v_muse.slug,'owner_fbid',v_fbid);
  end if;

  insert into muse.pending (email, slug, name, immutable_terms, mutable_terms, grants, authorized_by)
  values (lower(p_email), p_slug, p_name, coalesce(p_immutable,'{}'::jsonb),
          coalesce(p_mutable,'{}'::jsonb), coalesce(p_grants,'[]'::jsonb), v_actor);
  return jsonb_build_object('status','pending','email',lower(p_email),'slug',p_slug);
end; $$;

-- ── claim: mint all pending MUSEs for (fbid,email). Internal — no auth gate. ──
create or replace function muse._claim_pending(p_fbid uuid, p_email text)
returns int language plpgsql security definer set search_path = muse, public as $$
declare r record; v_muse muse.muses; v_n int := 0;
begin
  if p_email is null then return 0; end if;
  for r in select * from muse.pending
           where lower(email) = lower(p_email) and claimed_at is null loop
    begin
      v_muse := muse._mint_internal(p_fbid, r.slug, r.name, r.immutable_terms,
                                    r.mutable_terms, r.grants, coalesce(r.authorized_by, p_fbid));
      update muse.pending set claimed_muse_id = v_muse.id, claimed_at = now() where id = r.id;
      v_n := v_n + 1;
    exception when unique_violation then
      -- slug already minted elsewhere; mark resolved without failing the batch
      update muse.pending set claimed_at = now() where id = r.id;
    end;
  end loop;
  return v_n;
end; $$;

-- signed-in user claims their own pending MUSEs
create or replace function muse.claim()
returns jsonb language plpgsql security definer set search_path = muse, public as $$
declare v_fbid uuid := auth.uid(); v_email text; v_n int;
begin
  if v_fbid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select email into v_email from public.flowbond_users where id = v_fbid;
  v_n := muse._claim_pending(v_fbid, v_email);
  return jsonb_build_object('claimed', v_n, 'muses', muse.me());
end; $$;

-- ── auto-claim on identity creation (defensive: never blocks signup) ─────────
create or replace function muse._on_new_identity()
returns trigger language plpgsql security definer set search_path = muse, public as $$
begin
  begin
    perform muse._claim_pending(new.id, new.email);
  exception when others then
    raise warning 'muse auto-claim failed for %: %', new.email, sqlerrm;
  end;
  return new;
end; $$;

drop trigger if exists trg_muse_autoclaim on public.flowbond_users;
create trigger trg_muse_autoclaim
  after insert on public.flowbond_users
  for each row execute function muse._on_new_identity();

-- ── grants ───────────────────────────────────────────────────────────────────
revoke execute on function muse._mint_internal(uuid, text, text, jsonb, jsonb, jsonb, uuid) from public;
grant execute on function muse.issue_to_email(text, text, text, jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function muse.claim()                                               to authenticated, service_role;
