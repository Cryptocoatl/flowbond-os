-- ============================================================================
-- Future Flight — 0003 referrals + admin console surface
-- Adds: referral management RPCs, application review RPC, admin overview
-- functions, and the missing SELECT policies. Admin = ff_is_admin() =
-- public.has_grant('future-flight', null, 'admin') (FBID grants RBAC).
-- A superadmin grants a show-runner with:
--   select public.grant_access('<their_fbid>', 'future-flight', null, 'admin');
-- ============================================================================
set search_path = public;

-- ── missing SELECT policies (writes still RPC-only) ─────────────────────────
-- Referral rows: visible to their owner and to admins.
drop policy if exists ff_ref_read on ff_referrals;
create policy ff_ref_read on ff_referrals for select
  using (owner_id = ff_uid() or ff_is_admin());

-- Application review trail: admins only.
drop policy if exists ff_appreview_admin on ff_application_reviews;
create policy ff_appreview_admin on ff_application_reviews for select
  using (ff_is_admin());

-- Sponsors / leads: admins (and sponsor owners) may read.
drop policy if exists ff_sponsors_read on ff_sponsors;
create policy ff_sponsors_read on ff_sponsors for select
  using (owner_id = ff_uid() or ff_is_admin());
drop policy if exists ff_sponsor_leads_admin on ff_sponsor_leads;
create policy ff_sponsor_leads_admin on ff_sponsor_leads for select
  using (ff_is_admin());

-- ── public: validate a referral code before applying ────────────────────────
create or replace function ff_referral_valid(p_code text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from ff_referrals r
    where r.code = btrim(p_code)
      and (r.max_uses is null or r.uses < r.max_uses)
  );
$$;

-- ── artist/host: my own referral codes + attribution ────────────────────────
create or replace function ff_my_referrals()
returns table(code text, uses int, max_uses int, reward_cents bigint, edition_slug text)
language sql stable security definer set search_path=public as $$
  select r.code, r.uses, r.max_uses, r.reward_cents, e.slug
  from ff_referrals r
  left join ff_editions e on e.id = r.edition_id
  where r.owner_id = ff_uid()
  order by r.created_at;
$$;

-- ── admin: create / re-own / cap a referral code ────────────────────────────
create or replace function ff_create_referral(
  p_code text,
  p_owner uuid    default null,
  p_edition uuid  default null,
  p_reward_cents bigint default 0,
  p_max_uses int  default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not ff_is_admin() then raise exception 'admin only'; end if;
  if p_code is null or length(btrim(p_code)) = 0 then raise exception 'code required'; end if;
  insert into ff_referrals(code, owner_id, edition_id, reward_cents, max_uses)
  values (btrim(p_code), p_owner, p_edition, coalesce(p_reward_cents,0), p_max_uses)
  on conflict (code) do update set
    owner_id     = coalesce(excluded.owner_id, ff_referrals.owner_id),
    edition_id   = coalesce(excluded.edition_id, ff_referrals.edition_id),
    reward_cents = excluded.reward_cents,
    max_uses     = excluded.max_uses
  returning id into v_id;
  return v_id;
end $$;

-- ── admin: applications overview with referral attribution ──────────────────
create or replace function ff_admin_applications(p_edition uuid default null)
returns table(
  application_id uuid, applicant uuid, applicant_email text, desired_tier ff_tier_code,
  status ff_app_status, score numeric, referral_code text, referral_owner uuid,
  submitted_at timestamptz, decided_at timestamptz)
language sql stable security definer set search_path=public as $$
  select a.id, a.user_id, u.email, a.desired_tier, a.status, a.score,
         r.code, r.owner_id, a.submitted_at, a.decided_at
  from ff_applications a
  join flowbond_users u on u.id = a.user_id
  left join ff_referrals r on r.id = a.referral_id
  where ff_is_admin()
    and (p_edition is null or a.edition_id = p_edition)
  order by a.submitted_at desc;
$$;

-- ── admin: review an application (append trail + set status/score) ──────────
create or replace function ff_review_application(
  p_app uuid, p_decision ff_app_status,
  p_score_delta numeric default null, p_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid := ff_uid();
begin
  if not ff_is_admin() then raise exception 'admin only'; end if;
  insert into ff_application_reviews(application_id, reviewer_id, score_delta, decision, notes)
  values (p_app, v_uid, p_score_delta, p_decision, p_notes);
  update ff_applications set
    status     = p_decision,
    score      = coalesce(score,0) + coalesce(p_score_delta,0),
    decided_at = case when p_decision in ('approved','rejected','waitlist','withdrawn')
                      then now() else decided_at end
  where id = p_app;
end $$;

-- ── admin: referral leaderboard ─────────────────────────────────────────────
create or replace function ff_admin_referral_stats(p_edition uuid default null)
returns table(code text, owner_id uuid, owner_email text, uses int, max_uses int, applications bigint)
language sql stable security definer set search_path=public as $$
  select r.code, r.owner_id, u.email, r.uses, r.max_uses, count(a.id)
  from ff_referrals r
  left join flowbond_users u on u.id = r.owner_id
  left join ff_applications a on a.referral_id = r.id
  where ff_is_admin()
    and (p_edition is null or r.edition_id = p_edition or r.edition_id is null)
  group by r.code, r.owner_id, u.email, r.uses, r.max_uses
  order by count(a.id) desc, r.uses desc;
$$;

-- ── who am I to this app? (drives the client's admin gating) ────────────────
create or replace function ff_am_i_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select ff_is_admin();
$$;
