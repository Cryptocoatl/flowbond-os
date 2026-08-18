-- 009 · FlowGarden — public garden pages
--
-- Lets a gardener publish a calling card for their garden at /g/<slug>.
--
-- Privacy shape, deliberately: gardens are private and stay private. Publishing
-- is opt-in per garden (`is_public`), the slug is chosen by the owner, and the
-- public page is rendered SERVER-SIDE with the service role selecting only
-- non-PII columns. No anon SELECT policy is added to any table — the house rule
-- is that a public surface is a view without PII, never the table itself, and
-- here the "view" is the server route's explicit column list.
--
-- Location on a public page follows the existing map_visibility ladder rather
-- than inventing a second one: private/city → city label only, exact/live → the
-- precise place. Publishing a page never upgrades location precision.

alter table public.flowgarden_gardens
  add column if not exists is_public   boolean not null default false,
  add column if not exists public_slug text,
  add column if not exists public_bio  text;

comment on column public.flowgarden_gardens.is_public is
  'Opt-in: when true the garden is readable at /g/<public_slug> without auth.';
comment on column public.flowgarden_gardens.public_slug is
  'URL segment for the public page. Lowercase a-z, 0-9 and hyphens.';
comment on column public.flowgarden_gardens.public_bio is
  'Short intro shown on the public page. Seeded from a survey summary, edited by the owner.';

-- One garden per slug. Partial so the many unpublished gardens (slug null)
-- don't collide with each other.
create unique index if not exists flowgarden_gardens_public_slug_key
  on public.flowgarden_gardens (lower(public_slug))
  where public_slug is not null;

-- Fast lookup for the public route, which only ever asks for published gardens.
create index if not exists flowgarden_gardens_is_public_idx
  on public.flowgarden_gardens (is_public)
  where is_public = true;

-- Shape guard: a slug must be URL-safe and not collide with app routes.
alter table public.flowgarden_gardens
  drop constraint if exists flowgarden_gardens_public_slug_shape;
alter table public.flowgarden_gardens
  add constraint flowgarden_gardens_public_slug_shape
  check (
    public_slug is null
    or (
      public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
      and public_slug not in (
        'api','auth','debug','welcome','offline','onboarding','settings','survey',
        'plants','tasks','journal','map','world','devices','tianguis','g','new','admin'
      )
    )
  );

-- A garden cannot be published without a slug to publish it at.
alter table public.flowgarden_gardens
  drop constraint if exists flowgarden_gardens_public_needs_slug;
alter table public.flowgarden_gardens
  add constraint flowgarden_gardens_public_needs_slug
  check (is_public = false or public_slug is not null);
