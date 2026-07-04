-- Backfills git with the "vault" schema that was created directly against the
-- canonical Supabase project (fgsrcxxccdjqyrpkitmk) on 2026-06-25..06-27 and never
-- checked in. Every statement is idempotent (IF NOT EXISTS / OR REPLACE / guarded
-- DO blocks) so this is safe to dry-run or even apply for real against a DB that
-- already has these objects -- it changes nothing there. Written from a live
-- introspection of the deployed DDL (pg_attribute/pg_constraint/pg_get_functiondef),
-- not reconstructed from memory.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.flowscrow_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  party_role text NOT NULL CHECK (party_role IN ('steph','russell')),
  signer_name text NOT NULL,
  document text NOT NULL CHECK (document IN ('acknowledgment','agreement')),
  signed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, party_role, document)
);

CREATE TABLE IF NOT EXISTS public.flowscrow_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  name text NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, name)
);

CREATE TABLE IF NOT EXISTS public.flowscrow_access_codes (
  code text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('signer','witness')),
  party_role text CHECK (party_role IN ('steph','russell')),
  display_name text NOT NULL,
  fbid_email text,
  person_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flowscrow_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_key text,
  name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: signatures/witnesses/comments are the vault's public "status page" --
-- world-readable by design (anon + authenticated), write-only via RPC.
-- access_codes has no client read policy at all -- only resolvable via RPC.
-- ---------------------------------------------------------------------------

ALTER TABLE public.flowscrow_signatures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_witnesses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_comments    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sig_read ON public.flowscrow_signatures FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sig_service ON public.flowscrow_signatures FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY wit_read ON public.flowscrow_witnesses FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY wit_service ON public.flowscrow_witnesses FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY codes_service ON public.flowscrow_access_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cmt_read ON public.flowscrow_comments FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY cmt_service ON public.flowscrow_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY DEFINER) -- the vault's entire public surface. The single
-- live deal is resolved by hard-coded title (single-tenant vault bolted onto
-- the nominally multi-tenant deal schema -- a known, deliberate quirk).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.flowscrow_vault_deal()
 RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id FROM public.flowscrow_deals
  WHERE title = 'FlowBond Tech / Russell Herod — Separation & Closing' LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_resolve(p_code text)
 RETURNS TABLE(kind text, party_role text, display_name text, person_key text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT kind, party_role, display_name, person_key FROM public.flowscrow_access_codes WHERE code = p_code;
$function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_authorized(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_kind text; v_email text; v_auth_email text;
BEGIN
  SELECT kind, fbid_email INTO v_kind, v_email FROM public.flowscrow_access_codes WHERE code = p_code;
  IF v_kind IS DISTINCT FROM 'signer' OR v_email IS NULL THEN RETURN false; END IF;
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_auth_email FROM auth.users WHERE id = auth.uid();
  RETURN lower(COALESCE(v_auth_email,'')) = lower(v_email);
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_is_signer()
 RETURNS boolean
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  RETURN EXISTS (
    SELECT 1 FROM public.flowscrow_access_codes
    WHERE kind = 'signer' AND lower(fbid_email) = lower(v_email)
  );
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_sign(p_code text, p_document text)
 RETURNS flowscrow_signatures
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
DECLARE v public.flowscrow_access_codes; v_deal uuid; v_sig public.flowscrow_signatures;
BEGIN
  SELECT * INTO v FROM public.flowscrow_access_codes WHERE code = p_code;
  IF v.code IS NULL OR v.kind <> 'signer' THEN RAISE EXCEPTION 'invalid signer code'; END IF;
  IF p_document NOT IN ('agreement','acknowledgment') THEN RAISE EXCEPTION 'invalid document'; END IF;
  IF NOT public.flowscrow_vault_authorized(p_code) THEN
    RAISE EXCEPTION 'FBID login required and must match % to sign', v.display_name;
  END IF;
  v_deal := public.flowscrow_vault_deal();
  INSERT INTO public.flowscrow_signatures (deal_id, party_role, signer_name, document)
  VALUES (v_deal, v.party_role, v.display_name, p_document)
  ON CONFLICT (deal_id, party_role, document)
    DO UPDATE SET signed_at = now(), signer_name = EXCLUDED.signer_name
  RETURNING * INTO v_sig;
  IF v_deal IS NOT NULL THEN
    PERFORM public.flowscrow__log(v_deal, NULL, 'vault_signed',
      jsonb_build_object('role', v.party_role, 'document', p_document, 'name', v.display_name, 'fbid', auth.uid()));
  END IF;
  RETURN v_sig;
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_signatures()
 RETURNS SETOF flowscrow_signatures
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.flowscrow_signatures WHERE deal_id = public.flowscrow_vault_deal()
  ORDER BY signed_at;
$function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_witness(p_code text)
 RETURNS flowscrow_witnesses
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.flowscrow_access_codes; v_deal uuid; v_w public.flowscrow_witnesses;
BEGIN
  SELECT * INTO v FROM public.flowscrow_access_codes WHERE code = p_code;
  IF v.code IS NULL OR v.kind <> 'witness' THEN RAISE EXCEPTION 'invalid witness code'; END IF;
  v_deal := public.flowscrow_vault_deal();
  INSERT INTO public.flowscrow_witnesses (deal_id, name) VALUES (v_deal, v.display_name)
  ON CONFLICT (deal_id, name) DO UPDATE SET last_viewed_at = now()
  RETURNING * INTO v_w;
  IF v_deal IS NOT NULL THEN
    PERFORM public.flowscrow__log(v_deal, NULL, 'vault_witnessed', jsonb_build_object('name', v.display_name));
  END IF;
  RETURN v_w;
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_witnesses()
 RETURNS SETOF flowscrow_witnesses
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.flowscrow_witnesses WHERE deal_id = public.flowscrow_vault_deal() ORDER BY name;
$function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_comment(p_code text, p_body text)
 RETURNS flowscrow_comments
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.flowscrow_access_codes; c public.flowscrow_comments; v_deal uuid;
BEGIN
  SELECT * INTO v FROM public.flowscrow_access_codes WHERE code = p_code;
  IF v.code IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF length(coalesce(trim(p_body),'')) = 0 THEN RAISE EXCEPTION 'empty comment'; END IF;
  INSERT INTO public.flowscrow_comments (person_key, name, body)
  VALUES (v.person_key, v.display_name, left(trim(p_body), 4000))
  RETURNING * INTO c;
  v_deal := public.flowscrow_vault_deal();
  IF v_deal IS NOT NULL THEN
    PERFORM public.flowscrow__log(v_deal, NULL, 'vault_comment',
      jsonb_build_object('name', v.display_name, 'preview', left(c.body, 120)));
  END IF;
  RETURN c;
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_comments()
 RETURNS SETOF flowscrow_comments
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.flowscrow_comments ORDER BY created_at;
$function$;

-- ---------------------------------------------------------------------------
-- Grants (idempotent) -- matches what's already live: the vault RPCs are the
-- public surface, authorization is the code/session check inside each one.
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.flowscrow_vault_deal() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_resolve(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_authorized(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_is_signer() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_sign(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_signatures() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_witness(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_witnesses() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_comment(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowscrow_vault_comments() TO anon, authenticated;
