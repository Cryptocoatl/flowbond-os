-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 20260627_flowsplit.sql
-- Project   : fgsrcxxccdjqyrpkitmk
-- Purpose   : FlowSplit — a registered, weighted revenue/credit split per published
--             reel (who + how much: videographer / animator / creator / editor /
--             music rights), plus engagement (views/likes/interactions) that mints
--             FlowPoints to the chain by weight. Scales to real revenue once
--             distributor partnerships land; for now it pays in points on likes.
-- No service-role: writes go through SECURITY DEFINER RPCs gated by event role.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── split sheet: one row per beneficiary line of a publication ───────────────
CREATE TABLE IF NOT EXISTS public.flowstudio_splits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  uuid NOT NULL REFERENCES public.flowdrop_publications(id) ON DELETE CASCADE,
  beneficiary_fbid uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,  -- null = external (e.g. a label)
  label           text NOT NULL,                       -- display name / track / rights holder
  role            text NOT NULL CHECK (role IN ('videographer','animator','creator','editor','music','sound','color','owner')),
  weight_bps      int  NOT NULL CHECK (weight_bps BETWEEN 0 AND 10000),  -- basis points; lines sum to 10000
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flowstudio_splits_pub_idx ON public.flowstudio_splits(publication_id);

-- ── engagement counters per publication ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flowstudio_engagement (
  publication_id uuid PRIMARY KEY REFERENCES public.flowdrop_publications(id) ON DELETE CASCADE,
  views          bigint NOT NULL DEFAULT 0,
  likes          bigint NOT NULL DEFAULT 0,
  interactions   bigint NOT NULL DEFAULT 0,
  points_minted  bigint NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── like/interaction dedup (one mint per FBID per publication per kind) ──────
CREATE TABLE IF NOT EXISTS public.flowstudio_likes (
  publication_id uuid NOT NULL REFERENCES public.flowdrop_publications(id) ON DELETE CASCADE,
  user_fbid      uuid NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  kind           text NOT NULL DEFAULT 'like',
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, user_fbid, kind)
);

ALTER TABLE public.flowstudio_splits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowstudio_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowstudio_likes      ENABLE ROW LEVEL SECURITY;

-- splits + engagement are public read (transparency on /p); writes via RPC only.
DROP POLICY IF EXISTS flowstudio_splits_read ON public.flowstudio_splits;
CREATE POLICY flowstudio_splits_read ON public.flowstudio_splits FOR SELECT USING (true);
DROP POLICY IF EXISTS flowstudio_engagement_read ON public.flowstudio_engagement;
CREATE POLICY flowstudio_engagement_read ON public.flowstudio_engagement FOR SELECT USING (true);
DROP POLICY IF EXISTS flowstudio_likes_read ON public.flowstudio_likes;
CREATE POLICY flowstudio_likes_read ON public.flowstudio_likes
  FOR SELECT TO authenticated USING (user_fbid = auth.uid());

-- ── register / replace a publication's split sheet (editor or event owner) ──
CREATE OR REPLACE FUNCTION public.flowstudio_set_split(p_publication uuid, p_lines jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event uuid; v_total int;
BEGIN
  SELECT event_id INTO v_event FROM flowdrop_publications WHERE id = p_publication;
  IF v_event IS NULL THEN RAISE EXCEPTION 'publication_not_found'; END IF;
  IF NOT public.flowdrop_can_edit(v_event, auth.uid()) THEN RAISE EXCEPTION 'not_an_editor'; END IF;

  SELECT COALESCE(sum((l->>'weight_bps')::int), 0) INTO v_total FROM jsonb_array_elements(p_lines) l;
  IF v_total <> 10000 THEN RAISE EXCEPTION 'weights_must_sum_to_100pct (got %)', v_total; END IF;

  DELETE FROM flowstudio_splits WHERE publication_id = p_publication;
  INSERT INTO flowstudio_splits (publication_id, beneficiary_fbid, label, role, weight_bps)
  SELECT p_publication,
         NULLIF(l->>'fbid','')::uuid,
         COALESCE(l->>'label','contributor'),
         COALESCE(l->>'role','creator'),
         (l->>'weight_bps')::int
  FROM jsonb_array_elements(p_lines) l;
END $$;

-- ── record engagement; likes/interactions mint FlowPoints by split weight ───
CREATE OR REPLACE FUNCTION public.flowstudio_engage(p_publication uuid, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  POINTS_PER_LIKE int := 10;   -- prototype rate; scales with distributor revenue later
  v_new int; v_uid uuid := auth.uid(); v_line record; v_pts int; v_minted int := 0; v_ref uuid; m text;
  v_row flowstudio_engagement%ROWTYPE;
BEGIN
  INSERT INTO flowstudio_engagement (publication_id) VALUES (p_publication) ON CONFLICT DO NOTHING;

  IF p_kind = 'view' THEN
    UPDATE flowstudio_engagement SET views = views + 1, updated_at = now() WHERE publication_id = p_publication;
  ELSIF p_kind IN ('like','interaction') THEN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
    INSERT INTO flowstudio_likes (publication_id, user_fbid, kind) VALUES (p_publication, v_uid, p_kind)
      ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_new = ROW_COUNT;
    IF v_new > 0 THEN
      IF p_kind = 'like' THEN
        UPDATE flowstudio_engagement SET likes = likes + 1, updated_at = now() WHERE publication_id = p_publication;
      ELSE
        UPDATE flowstudio_engagement SET interactions = interactions + 1, updated_at = now() WHERE publication_id = p_publication;
      END IF;
      -- distribute points across the registered split (skip external/music lines without an fbid)
      FOR v_line IN
        SELECT beneficiary_fbid, weight_bps FROM flowstudio_splits
        WHERE publication_id = p_publication AND beneficiary_fbid IS NOT NULL AND weight_bps > 0
      LOOP
        v_pts := (POINTS_PER_LIKE * v_line.weight_bps) / 10000;
        IF v_pts > 0 THEN
          m := md5(p_publication::text || ':' || v_uid::text || ':' || v_line.beneficiary_fbid::text || ':' || p_kind);
          v_ref := (substr(m,1,8)||'-'||substr(m,9,4)||'-'||substr(m,13,4)||'-'||substr(m,17,4)||'-'||substr(m,21,12))::uuid;
          IF NOT EXISTS (SELECT 1 FROM flowcredits_ledger WHERE app_slug='flowstudio' AND ref_id=v_ref) THEN
            PERFORM fc_earn(v_line.beneficiary_fbid, v_pts, 'flowstudio:engagement', 'flowstudio', 'earn', v_ref);
            v_minted := v_minted + v_pts;
          END IF;
        END IF;
      END LOOP;
      IF v_minted > 0 THEN
        UPDATE flowstudio_engagement SET points_minted = points_minted + v_minted WHERE publication_id = p_publication;
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'bad_kind';
  END IF;

  SELECT * INTO v_row FROM flowstudio_engagement WHERE publication_id = p_publication;
  RETURN jsonb_build_object('views', v_row.views, 'likes', v_row.likes, 'interactions', v_row.interactions, 'points_minted', v_row.points_minted);
END $$;

GRANT EXECUTE ON FUNCTION public.flowstudio_set_split(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flowstudio_engage(uuid, text)     TO anon, authenticated;
