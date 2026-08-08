-- ============================================================================
-- FlowRoom — 0002 · notes for the vault-gated room
--
-- 0001 assumes Supabase auth: every policy keys on auth.uid(). The room that
-- actually shipped is opened with a name and a four-digit key, so there is no
-- Supabase session to key on and none of those policies can fire.
--
-- Rather than bend RLS around a session that does not exist, this table is
-- closed to everybody and written only by the Worker on service_role, which
-- is the one place that can verify a signed key. RLS is ON with zero policies:
-- `anon` and `authenticated` can neither read nor write a single row.
-- ============================================================================

create table if not exists public.flowroom_notes (
  id         uuid primary key default gen_random_uuid(),
  room_slug  text not null,
  block_key  text not null,
  -- The name they typed at the vault. Not an identity — a label.
  author     text not null check (length(btrim(author)) between 1 and 80),
  role       text not null check (role in ('owner','editor','commenter','viewer')),
  -- Who handed them the key. Null for the owner.
  invited_by text,
  -- A row is either a mark or a comment. Never both, never neither.
  mark       text check (mark in ('agreed','question','already_have','different_timeline','not_this')),
  body       text check (body is null or length(btrim(body)) between 1 and 4000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flowroom_notes_one_kind check (
    (mark is not null and body is null) or (mark is null and body is not null)
  )
);

-- One mark per person per block: setting a new one replaces the old.
create unique index if not exists flowroom_notes_mark_uidx
  on public.flowroom_notes (room_slug, block_key, lower(author))
  where mark is not null and deleted_at is null;

create index if not exists flowroom_notes_room_idx
  on public.flowroom_notes (room_slug, created_at);

alter table public.flowroom_notes enable row level security;

-- Deliberately no policies. The Worker is the only writer.
revoke all on public.flowroom_notes from public, anon, authenticated;
grant all on public.flowroom_notes to service_role;
