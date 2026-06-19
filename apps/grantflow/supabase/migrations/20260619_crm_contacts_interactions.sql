-- ClaudIA's private CRM: people + a unified interaction/activity ledger.
-- Private (service-role only) like grantflow.applications. Applied to fgsrcxxccdjqyrpkitmk 2026-06-19.
create table if not exists grantflow.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text, phone text, organization text, role text,
  relationship text,                 -- funder | program-officer | partner | advisor | community | press
  project_slug text,
  grant_id uuid references grantflow.grants(id) on delete set null,
  tags text[] not null default '{}',
  links jsonb not null default '{}',
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists grantflow.interactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note'
    check (kind in ('note','email','call','meeting','dm','ai_draft','model')),
  actor text, model text, direction text, channel text,
  summary text not null, body text,
  contact_id uuid references grantflow.contacts(id) on delete set null,
  grant_id uuid references grantflow.grants(id) on delete set null,
  application_id uuid references grantflow.applications(id) on delete set null,
  project_slug text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists interactions_occurred_idx on grantflow.interactions (occurred_at desc);
create index if not exists interactions_contact_idx on grantflow.interactions (contact_id);
create index if not exists contacts_grant_idx on grantflow.contacts (grant_id);
alter table grantflow.contacts enable row level security;
alter table grantflow.interactions enable row level security;
