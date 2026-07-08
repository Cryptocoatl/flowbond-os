-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 20260624b_flowdrop_no_service_role.sql
-- Project   : fgsrcxxccdjqyrpkitmk
-- Purpose   : Make the Event Drop feature work WITHOUT a service-role key. Every
--             privileged operation moves into SECURITY DEFINER RPCs + storage RLS
--             policies, so the FBID-authenticated user does everything directly.
--             (Replaces the dbAdmin/service-role usage in the app routes.)
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 0. Denormalised provenance credits, so the PUBLIC /p page never reads the
--    private contributions table (display names resolved at publish time).
ALTER TABLE public.flowdrop_publications ADD COLUMN IF NOT EXISTS credits jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPCs (SECURITY DEFINER) — replace the service-role writes
-- ─────────────────────────────────────────────────────────────────────────────

-- Owner mints an editor invite code.
CREATE OR REPLACE FUNCTION public.flowdrop_create_invite(p_event uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM flowdrop_events e WHERE e.id = p_event AND e.owner_fbid = auth.uid()) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  v_code := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO flowdrop_editors (event_id, invite_code, invited_by, role)
    VALUES (p_event, v_code, auth.uid(), 'editor');
  RETURN v_code;
END $$;

-- An invitee accepts a code (claims the editor seat). Returns nothing; raises on bad/claimed.
CREATE OR REPLACE FUNCTION public.flowdrop_accept_invite(p_slug text, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event uuid; v_existing uuid;
BEGIN
  SELECT e.id INTO v_event FROM flowdrop_events e WHERE e.slug = p_slug;
  IF v_event IS NULL THEN RAISE EXCEPTION 'event_not_found'; END IF;

  SELECT editor_fbid INTO v_existing FROM flowdrop_editors
    WHERE event_id = v_event AND invite_code = p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'bad_code'; END IF;
  IF v_existing IS NOT NULL AND v_existing <> auth.uid() THEN RAISE EXCEPTION 'claimed'; END IF;

  UPDATE flowdrop_editors SET editor_fbid = auth.uid(), accepted_at = now()
    WHERE event_id = v_event AND invite_code = p_code AND (editor_fbid IS NULL OR editor_fbid = auth.uid());
END $$;

-- Publish a finished piece: create the publication + provenance edges, mark the
-- used clips, and mint FlowCredits to every distinct shooter + the editor.
-- The Origo registration (idempotent, anon-callable) happens in the app BEFORE
-- this call and the resulting cert id is passed in.
CREATE OR REPLACE FUNCTION public.flowdrop_publish(
  p_event           uuid,
  p_storage_path    text,
  p_title           text,
  p_content_hash    text,
  p_origo_cert_id   text,
  p_contribution_ids uuid[],
  p_credits         jsonb,
  p_reward_shooter  int,
  p_reward_editor   int
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pub uuid; v_shooter uuid; v_ref uuid; m text;
BEGIN
  IF NOT public.flowdrop_can_edit(p_event, auth.uid()) THEN RAISE EXCEPTION 'not_an_editor'; END IF;

  INSERT INTO flowdrop_publications
    (event_id, editor_fbid, title, storage_path, content_hash, origo_cert_id, visibility, credits)
    VALUES (p_event, auth.uid(), p_title, p_storage_path, p_content_hash, p_origo_cert_id, 'public', p_credits)
    RETURNING id INTO v_pub;

  -- Provenance edges + mark used — only clips that truly belong to this event.
  INSERT INTO flowdrop_publication_sources (publication_id, contribution_id)
    SELECT v_pub, c.id FROM flowdrop_contributions c
    WHERE c.id = ANY(p_contribution_ids) AND c.event_id = p_event;
  UPDATE flowdrop_contributions SET status = 'used'
    WHERE id = ANY(p_contribution_ids) AND event_id = p_event;

  -- Reward each distinct shooter (idempotent via a deterministic ledger ref).
  FOR v_shooter IN
    SELECT DISTINCT c.contributor_fbid FROM flowdrop_contributions c
    WHERE c.id = ANY(p_contribution_ids) AND c.event_id = p_event
  LOOP
    m := md5(v_pub::text || ':shooter:' || v_shooter::text);
    v_ref := (substr(m,1,8)||'-'||substr(m,9,4)||'-'||substr(m,13,4)||'-'||substr(m,17,4)||'-'||substr(m,21,12))::uuid;
    IF p_reward_shooter > 0 AND NOT EXISTS (
      SELECT 1 FROM flowcredits_ledger WHERE app_slug = 'flowstudio' AND ref_id = v_ref
    ) THEN
      PERFORM fc_earn(v_shooter, p_reward_shooter, 'flowdrop:footage-published', 'flowstudio', 'earn', v_ref);
    END IF;
  END LOOP;

  -- Reward the editor.
  m := md5(v_pub::text || ':editor');
  v_ref := (substr(m,1,8)||'-'||substr(m,9,4)||'-'||substr(m,13,4)||'-'||substr(m,17,4)||'-'||substr(m,21,12))::uuid;
  IF p_reward_editor > 0 AND NOT EXISTS (
    SELECT 1 FROM flowcredits_ledger WHERE app_slug = 'flowstudio' AND ref_id = v_ref
  ) THEN
    PERFORM fc_earn(auth.uid(), p_reward_editor, 'flowdrop:edit-published', 'flowstudio', 'earn', v_ref);
  END IF;

  RETURN v_pub;
END $$;

GRANT EXECUTE ON FUNCTION public.flowdrop_create_invite(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.flowdrop_accept_invite(text, text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.flowdrop_publish(uuid,text,text,text,text,uuid[],jsonb,int,int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. STORAGE RLS — let the FBID user upload/read directly (no signed-by-admin)
--    Path convention: event-drops = <eventId>/<uid>/<file>; event-publications = <eventId>/<file>
-- ─────────────────────────────────────────────────────────────────────────────

-- event-drops: a contributor uploads into their OWN folder of an OPEN event.
DROP POLICY IF EXISTS flowdrop_drops_insert ON storage.objects;
CREATE POLICY flowdrop_drops_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-drops'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.flowdrop_events e
      WHERE e.id::text = (storage.foldername(name))[1] AND e.status = 'open'
    )
  );

-- event-drops: read your own clips; owners + accepted editors read the whole pool.
DROP POLICY IF EXISTS flowdrop_drops_read ON storage.objects;
CREATE POLICY flowdrop_drops_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'event-drops'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.flowdrop_can_edit(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  );

-- event-publications: only owners/editors may upload a finished piece (folder = eventId).
DROP POLICY IF EXISTS flowdrop_pubs_insert ON storage.objects;
CREATE POLICY flowdrop_pubs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-publications'
    AND public.flowdrop_can_edit(((storage.foldername(name))[1])::uuid, auth.uid())
  );
-- (event-publications read is public via the bucket's public = true flag.)
