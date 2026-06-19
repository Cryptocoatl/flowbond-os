-- ClaudIA grant-writer: structured draft storage on applications.
-- See apps/grantflow/docs/CLAUDIA-GRANT-WRITER.md §4. Applied to project fgsrcxxccdjqyrpkitmk 2026-06-18.
alter table grantflow.applications
  add column if not exists draft            jsonb,
  add column if not exists draft_status     text not null default 'none'
    check (draft_status in ('none','generating','drafted','edited','approved')),
  add column if not exists drafted_by        text,
  add column if not exists draft_model       text,
  add column if not exists draft_updated_at  timestamptz;
