-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 20260624_flowdrop_init.sql
-- Project   : fgsrcxxccdjqyrpkitmk  (us-east-2, "FlowBond-life")  — NEVER eoajujwpdkfuicnoxetk
-- App       : FlowStudio · Event Drop & Provenance Chain
-- Purpose   : A public per-event drop link where FBID-authenticated attendees pool
--             their photos/videos; invited editors cut finished pieces and publish
--             them; every publication records its provenance chain (which clips,
--             whose footage, which editor) and rewards that chain with FlowCredits.
--
-- Pattern A: prefixed tables in `public`, RLS ON. Reads go through RLS; privileged
-- writes (publish, fc_earn, signed storage URLs) run service-role from trusted
-- routes. Provenance is the Origo cert (owners=[shooters…, editor]) PLUS the
-- flowdrop_publication_sources edges below.
--
-- This surface is PUBLIC-BY-DESIGN (Tier 1/2 per ~/FlowStudio/RULES.md). No Tier 0
-- client IP / private FBID data flows through it beyond the FBID id itself.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. App registry allow-list — add 'flowstudio' (preserve every existing slug)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'flowbond_app_connections'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%app_slug%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.flowbond_app_connections DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE public.flowbond_app_connections
    ADD CONSTRAINT flowbond_app_connections_app_slug_check
    CHECK (app_slug = ANY (ARRAY[
      'flowgarden','danz','xelva','mountaindogs','flownation','flowbond',
      'astroflow','deck','ops','flowme','fbid','flow3','claudia','banoseco',
      'flowscrow','flowstudio'
    ]));
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- An event = one drop link. owner_fbid is the flowbond_users.id (== auth.uid()).
CREATE TABLE IF NOT EXISTS public.flowdrop_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text        NOT NULL UNIQUE,
  owner_fbid     uuid        NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text,
  cover_url      text,
  status         text        NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','locked','published')),
  drop_starts_at timestamptz,
  drop_ends_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- One pooled clip. Each row credits its shooter (contributor_fbid).
CREATE TABLE IF NOT EXISTS public.flowdrop_contributions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid        NOT NULL REFERENCES public.flowdrop_events(id) ON DELETE CASCADE,
  contributor_fbid  uuid        NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  kind              text        NOT NULL CHECK (kind IN ('photo','video')),
  storage_path      text        NOT NULL,                       -- path in the private `event-drops` bucket
  content_hash      text,                                       -- sha256 (informational; the master is the registered hash)
  original_filename text,
  size_bytes        bigint,
  captured_at       timestamptz,
  status            text        NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted','used','rejected')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flowdrop_contributions_event_idx ON public.flowdrop_contributions(event_id);
CREATE INDEX IF NOT EXISTS flowdrop_contributions_shooter_idx ON public.flowdrop_contributions(contributor_fbid);

-- Invite-only editor roster. An invite_code is the bearer secret to accept a role.
CREATE TABLE IF NOT EXISTS public.flowdrop_editors (
  event_id     uuid        NOT NULL REFERENCES public.flowdrop_events(id) ON DELETE CASCADE,
  editor_fbid  uuid        REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  invited_by   uuid        REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  invite_code  text        NOT NULL UNIQUE,
  role         text        NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','owner')),
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, invite_code)
);
CREATE INDEX IF NOT EXISTS flowdrop_editors_editor_idx ON public.flowdrop_editors(editor_fbid);

-- A published, shareable final piece. origo_cert_id is the durable provenance proof.
CREATE TABLE IF NOT EXISTS public.flowdrop_publications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid        NOT NULL REFERENCES public.flowdrop_events(id) ON DELETE CASCADE,
  editor_fbid    uuid        NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  storage_path   text        NOT NULL,                          -- path in the public `event-publications` bucket
  content_hash   text,                                          -- sha256 of the published bytes (server-computed)
  origo_cert_id  text,
  visibility     text        NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('private','unlisted','public')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flowdrop_publications_event_idx ON public.flowdrop_publications(event_id);

-- The provenance edges: which raw clips fed which final cut. Drives the reward fan-out.
CREATE TABLE IF NOT EXISTS public.flowdrop_publication_sources (
  publication_id  uuid NOT NULL REFERENCES public.flowdrop_publications(id) ON DELETE CASCADE,
  contribution_id uuid NOT NULL REFERENCES public.flowdrop_contributions(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, contribution_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPERS (SECURITY DEFINER — read membership without leaking the roster via RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- True if `uid` owns the event OR is an accepted editor on it.
CREATE OR REPLACE FUNCTION public.flowdrop_can_edit(p_event uuid, p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.flowdrop_events e WHERE e.id = p_event AND e.owner_fbid = p_uid)
      OR EXISTS (SELECT 1 FROM public.flowdrop_editors ed
                 WHERE ed.event_id = p_event AND ed.editor_fbid = p_uid AND ed.accepted_at IS NOT NULL);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.flowdrop_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowdrop_contributions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowdrop_editors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowdrop_publications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowdrop_publication_sources ENABLE ROW LEVEL SECURITY;

-- events --------------------------------------------------------------------
-- Anyone may read an event's public header (so the drop link + /p pages resolve).
DROP POLICY IF EXISTS flowdrop_events_read ON public.flowdrop_events;
CREATE POLICY flowdrop_events_read ON public.flowdrop_events
  FOR SELECT USING (true);
-- Only the owner creates/edits their own events (also gated server-side).
DROP POLICY IF EXISTS flowdrop_events_owner_write ON public.flowdrop_events;
CREATE POLICY flowdrop_events_owner_write ON public.flowdrop_events
  FOR ALL TO authenticated
  USING (owner_fbid = auth.uid()) WITH CHECK (owner_fbid = auth.uid());

-- contributions -------------------------------------------------------------
-- A contributor inserts their OWN clips into an `open` event.
DROP POLICY IF EXISTS flowdrop_contrib_insert_own ON public.flowdrop_contributions;
CREATE POLICY flowdrop_contrib_insert_own ON public.flowdrop_contributions
  FOR INSERT TO authenticated
  WITH CHECK (
    contributor_fbid = auth.uid()
    AND EXISTS (SELECT 1 FROM public.flowdrop_events e WHERE e.id = event_id AND e.status = 'open')
  );
-- Read: the shooter sees their own; the owner + accepted editors see the whole pool.
DROP POLICY IF EXISTS flowdrop_contrib_read ON public.flowdrop_contributions;
CREATE POLICY flowdrop_contrib_read ON public.flowdrop_contributions
  FOR SELECT TO authenticated
  USING (contributor_fbid = auth.uid() OR public.flowdrop_can_edit(event_id, auth.uid()));

-- editors -------------------------------------------------------------------
-- A user may see editor rows that are theirs (to accept) or for events they edit.
DROP POLICY IF EXISTS flowdrop_editors_read ON public.flowdrop_editors;
CREATE POLICY flowdrop_editors_read ON public.flowdrop_editors
  FOR SELECT TO authenticated
  USING (editor_fbid = auth.uid() OR public.flowdrop_can_edit(event_id, auth.uid()));
-- (invite creation + acceptance run service-role from trusted routes.)

-- publications --------------------------------------------------------------
-- Public read so /p/<id> is shareable to anyone.
DROP POLICY IF EXISTS flowdrop_pub_read ON public.flowdrop_publications;
CREATE POLICY flowdrop_pub_read ON public.flowdrop_publications
  FOR SELECT USING (visibility IN ('public','unlisted'));

DROP POLICY IF EXISTS flowdrop_pub_sources_read ON public.flowdrop_publication_sources;
CREATE POLICY flowdrop_pub_sources_read ON public.flowdrop_publication_sources
  FOR SELECT USING (true);
-- (publication + source writes run service-role from the publish route.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKETS
--    event-drops      : PRIVATE — contributions. Upload via service-role signed
--                       upload URLs; editors read via service-role signed URLs.
--    event-publications: PUBLIC — finished pieces, directly downloadable/shareable.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('event-drops', 'event-drops', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-publications', 'event-publications', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- No object-level policies: the private `event-drops` bucket is reached only by the
-- service role (signed upload + signed read URLs minted server-side), and the
-- `event-publications` bucket is public-read by virtue of public = true.
