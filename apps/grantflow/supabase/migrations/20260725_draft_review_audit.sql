-- Draft Review + multi-round audit loop.
-- See apps/grantflow/docs/CLAUDIA-DRAFT-REVIEW.md. Target: fgsrcxxccdjqyrpkitmk, schema grantflow.
--
-- HARD CONSTRAINT enforced here, not just in the UI: nothing can reach
-- review_state='submitted' without a human name in submitted_by. ClaudIA has no
-- name to put there and no code path that writes it.

-- ─────────────────────────────────────────────────────────────
-- A. Readiness axis + a real submission record on applications.
--    `stage` stays the funding lifecycle (discovered → won/rejected);
--    `review_state` is the orthogonal draft-readiness axis.
-- ─────────────────────────────────────────────────────────────
alter table grantflow.applications
  add column if not exists review_state text not null default 'drafting'
    check (review_state in ('drafting','in_audit','ready','submitted')),
  add column if not exists submitted_by      text,
  add column if not exists submission_method text,
  add column if not exists submission_ref    text,
  add column if not exists submission_url    text;

-- submitted_at was `date` — no time, no timezone. 0 non-null rows at time of writing,
-- so this cast is lossless.
alter table grantflow.applications
  alter column submitted_at type timestamptz using submitted_at::timestamptz;

-- ─────────────────────────────────────────────────────────────
-- B. Funder-side submission facts live on the catalog.
-- ─────────────────────────────────────────────────────────────
alter table grantflow.grants
  add column if not exists submission_method text,  -- portal | email | form | mail | onchain
  add column if not exists submission_url    text,
  add column if not exists submission_email  text;

-- ─────────────────────────────────────────────────────────────
-- C. Round definitions — configurable, not hardcoded in TypeScript.
--    Reorder, retire, or make a round optional by editing rows here.
-- ─────────────────────────────────────────────────────────────
create table if not exists grantflow.audit_rounds (
  key         text primary key,
  round_no    int  not null,
  label       text not null,
  description text,
  required    boolean not null default true,
  active      boolean not null default true,
  checklist   jsonb   not null default '[]'
);

insert into grantflow.audit_rounds (key, round_no, label, description, checklist) values
  ('completeness', 1, 'Completeness',
   'Every required field and section present, non-empty, and actually answering the question asked.',
   '["Every required section has substantive content","Each grant question is answered, not deflected","Budget ask is stated with a figure and currency","No placeholder or lorem text remains","Open questions are listed rather than silently skipped"]'),
  ('accuracy', 2, 'Accuracy',
   'No fabricated metrics, dates, names, or partnerships. Every factual claim traceable to a provided source. Unverifiable claims flagged.',
   '["Every metric traces to a named source field","No invented dates, headcounts, or funding history","No partnership or endorsement claimed without a source","Project/grant names and figures match the catalog","Anything unverifiable moved to open questions, not asserted"]'),
  ('fit_tone', 3, 'Fit & tone',
   'Aligned to this funder''s stated priorities and written in FlowBond voice.',
   '["Leads with the funder''s own priority language","Fit rationale is specific to this grant, not generic","FlowBond voice: direct, concrete, no hype","No equity/ownership language","Reads as written by a human, not assembled"]'),
  ('compliance', 4, 'Compliance',
   'Matches the funder''s required format, word limits, and attachment list.',
   '["Every section within its word limit","Required attachments present in the checklist","Format matches the funder''s stated application process","Eligibility criteria addressed explicitly","Deadline is still ahead of us"]')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- D. Append-only audit ledger. History is the product here — improvements
--    are only visible round over round if nothing is ever overwritten.
-- ─────────────────────────────────────────────────────────────
create table if not exists grantflow.audit_results (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grantflow.applications(id) on delete cascade,
  round_key      text not null references grantflow.audit_rounds(key),
  cycle          int  not null default 1,
  verdict        text not null check (verdict in ('pass','fail','waived')),
  notes          text,
  findings       jsonb not null default '[]',
  auditor        text not null default 'claudia',
  model          text,
  created_at     timestamptz not null default now()
);
create index if not exists audit_results_app_idx on grantflow.audit_results (application_id, created_at desc);
create index if not exists audit_results_round_idx on grantflow.audit_results (application_id, round_key, created_at desc);

-- UPDATE only. DELETE is left open so `on delete cascade` from applications still
-- works — dropping an application is a deliberate act through its own route;
-- silently rewriting a past verdict is the thing worth making impossible.
create or replace function grantflow.audit_results_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'grantflow.audit_results is append-only — a past verdict cannot be rewritten';
end $$;

drop trigger if exists audit_results_no_update on grantflow.audit_results;
create trigger audit_results_no_update
  before update on grantflow.audit_results
  for each row execute function grantflow.audit_results_append_only();

-- ─────────────────────────────────────────────────────────────
-- E. Draft sections — the living, editable document.
--    applications.draft (jsonb) stays as the immutable ClaudIA generation artifact.
-- ─────────────────────────────────────────────────────────────
create table if not exists grantflow.draft_sections (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grantflow.applications(id) on delete cascade,
  key            text not null,
  label          text not null,
  position       int  not null default 0,
  body           text not null default '',
  word_limit     int,
  required       boolean not null default true,
  source_note    text,
  updated_by     text,
  updated_at     timestamptz not null default now(),
  unique (application_id, key)
);
create index if not exists draft_sections_app_idx on grantflow.draft_sections (application_id, position);

-- Backfill from the existing ClaudIA drafts.
insert into grantflow.draft_sections (application_id, key, label, position, body)
select a.id, 'summary', 'Summary', 0, coalesce(a.draft->>'summary', '')
from grantflow.applications a where a.draft is not null
union all
select a.id, 'fit_rationale', 'Why it fits', 1, coalesce(a.draft->>'fit_rationale', '')
from grantflow.applications a where a.draft is not null
union all
select a.id, 'budget_ask', 'Budget ask', 2, coalesce(a.draft->>'budget_ask', '')
from grantflow.applications a where a.draft is not null
union all
select a.id,
       'answer_' || t.ord,
       coalesce(nullif(t.ans->>'q', ''), 'Question ' || t.ord),
       10 + t.ord,
       coalesce(t.ans->>'a', '')
from grantflow.applications a
cross join lateral jsonb_array_elements(coalesce(a.draft->'answers', '[]'::jsonb))
  with ordinality as t(ans, ord)
where a.draft is not null
on conflict (application_id, key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- F. Attachment / submission checklist.
-- ─────────────────────────────────────────────────────────────
create table if not exists grantflow.submission_items (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grantflow.applications(id) on delete cascade,
  label          text not null,
  required       boolean not null default true,
  done           boolean not null default false,
  url            text,
  note           text,
  checked_by     text,
  checked_at     timestamptz,
  position       int not null default 0
);
create index if not exists submission_items_app_idx on grantflow.submission_items (application_id, position);

-- ─────────────────────────────────────────────────────────────
-- G. The gate.
--    A round result only counts if it is NEWER than every section edit —
--    so editing a section after a pass silently invalidates that pass and the
--    draft falls back out of "Ready". No mutation of the append-only ledger required.
-- ─────────────────────────────────────────────────────────────
create or replace function grantflow.audit_gate(app_id uuid)
returns boolean language sql stable as $$
  select not exists (
    select 1
    from grantflow.audit_rounds r
    where r.active and r.required
      and not exists (
        select 1
        from grantflow.audit_results ar
        where ar.application_id = app_id
          and ar.round_key = r.key
          and ar.verdict in ('pass', 'waived')
          and ar.created_at >= coalesce(
                (select max(s.updated_at)
                   from grantflow.draft_sections s
                  where s.application_id = app_id),
                '-infinity'::timestamptz)
      )
  );
$$;

create or replace function grantflow.enforce_review_state()
returns trigger language plpgsql as $$
begin
  if NEW.review_state is distinct from OLD.review_state then
    if NEW.review_state = 'ready' and not grantflow.audit_gate(NEW.id) then
      raise exception
        'cannot advance to Ready for Review: every required audit round needs a passing result newer than the last section edit';
    end if;

    if NEW.review_state = 'submitted' then
      if not grantflow.audit_gate(NEW.id) then
        raise exception 'cannot mark submitted: audit rounds are incomplete';
      end if;
      -- The hard constraint. Submission is a human action; the system only records it.
      if NEW.submitted_by is null or btrim(NEW.submitted_by) = '' then
        raise exception
          'cannot mark submitted without submitted_by — submission is a human action, never automatic';
      end if;
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists applications_review_state_guard on grantflow.applications;
create trigger applications_review_state_guard
  before update on grantflow.applications
  for each row execute function grantflow.enforce_review_state();

-- ─────────────────────────────────────────────────────────────
-- H. Audit + submission events belong in the existing activity ledger.
-- ─────────────────────────────────────────────────────────────
alter table grantflow.interactions drop constraint if exists interactions_kind_check;
alter table grantflow.interactions add constraint interactions_kind_check
  check (kind in ('note','email','call','meeting','dm','ai_draft','model','audit','submission'));

-- ─────────────────────────────────────────────────────────────
-- I. RLS on, no policies — service-role only, matching applications/contacts/interactions.
-- ─────────────────────────────────────────────────────────────
alter table grantflow.audit_rounds     enable row level security;
alter table grantflow.audit_results    enable row level security;
alter table grantflow.draft_sections   enable row level security;
alter table grantflow.submission_items enable row level security;
