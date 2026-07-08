-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 20260626_studio_media.sql
-- Project   : fgsrcxxccdjqyrpkitmk
-- Purpose   : Personal media library — a user's own posts (upload / manage / share
--             / download), separate from event drops. No service-role: the FBID
--             user owns their rows + storage folder via RLS.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.studio_media (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_fbid    uuid        NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  kind          text        NOT NULL CHECK (kind IN ('photo','video')),
  storage_path  text        NOT NULL,
  title         text,
  content_hash  text,
  origo_cert_id text,
  size_bytes    bigint,
  visibility    text        NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('private','unlisted','public')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_media_owner_idx ON public.studio_media(owner_fbid, created_at DESC);

ALTER TABLE public.studio_media ENABLE ROW LEVEL SECURITY;

-- Owner has full control of their own rows.
DROP POLICY IF EXISTS studio_media_owner_all ON public.studio_media;
CREATE POLICY studio_media_owner_all ON public.studio_media
  FOR ALL TO authenticated
  USING (owner_fbid = auth.uid()) WITH CHECK (owner_fbid = auth.uid());

-- Anyone may read a shared item (so /m/<id> resolves); private stays owner-only.
DROP POLICY IF EXISTS studio_media_public_read ON public.studio_media;
CREATE POLICY studio_media_public_read ON public.studio_media
  FOR SELECT USING (visibility IN ('unlisted','public'));

-- Public bucket: bytes served by URL; unguessable UUID paths. The DB visibility
-- flag governs in-app listing + whether a share link is surfaced.
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-media', 'studio-media', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- A user may write/read/delete only inside their OWN folder (<fbid>/...).
DROP POLICY IF EXISTS studio_media_insert ON storage.objects;
CREATE POLICY studio_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS studio_media_delete ON storage.objects;
CREATE POLICY studio_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text);
