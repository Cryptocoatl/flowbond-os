-- =====================================================================
-- BAÑOSECO · Migración 01 — Mecánica de juego (sobre 00_banoseco_init)
-- Proyecto canónico: fgsrcxxccdjqyrpkitmk  (us-east-2, FlowBond-life)
-- NUNCA usar eoajujwpdkfuicnoxetk.
--
-- Capas que agrega sobre la base:
--   · Dos monedas en el ledger: 'oro' (canjeable) y 'xp' (solo progresión).
--   · Recompensa de misión separada: reward_xp + reward_oro (reward_points queda legacy).
--   · Energía del guardián (gate de aceptar misión) + recarga "solar" diaria.
--   · Inscripción de guardián (banoseco_become_guardian) — la base no traía forma de serlo.
--   · RPCs reescritas: claim (gasta ⚡), complete (acredita oro+xp), balance(currency).
--   · Realtime: publica banoseco_toilets + banoseco_missions.
--
-- DRY-RUN: corre dentro de BEGIN ... ROLLBACK. Para aplicar de verdad:
--   cambia el ROLLBACK final por COMMIT, o versiona y `supabase db push`.
-- PRE-REQUISITO: 00_banoseco_init.sql ya aplicado (COMMIT).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Moneda dual en el ledger
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE banoseco_currency AS ENUM ('oro','xp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.banoseco_point_ledger
  ADD COLUMN IF NOT EXISTS currency banoseco_currency NOT NULL DEFAULT 'oro';

-- consultas de saldo por moneda
CREATE INDEX IF NOT EXISTS banoseco_ledger_user_cur_idx
  ON public.banoseco_point_ledger (user_id, currency);

-- ---------------------------------------------------------------------
-- 2. Recompensa separada en misiones (XP + oro). reward_points = legacy.
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_missions
  ADD COLUMN IF NOT EXISTS reward_xp  int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS reward_oro int NOT NULL DEFAULT 25;

-- ---------------------------------------------------------------------
-- 3. Energía del guardián (gate) + recarga solar
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_guardians
  ADD COLUMN IF NOT EXISTS energy             int NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS energy_refilled_at timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- 3b. Bajar las firmas de la base que cambian de tipo/argumentos.
--     (CREATE OR REPLACE no puede cambiar el tipo de retorno ni la firma;
--      hay que DROP antes de recrear con la nueva forma.)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.banoseco_complete_mission(uuid, text);  -- int -> TABLE(oro,xp)
DROP FUNCTION IF EXISTS public.banoseco_guardian_balance(uuid);        -- +arg currency

-- ---------------------------------------------------------------------
-- 4. Inscripción de guardián (rol BAÑOSECO sobre un FBID ya existente)
--    Requiere fila previa en flowbond_users (la crea link_auth_or_create_identity).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_become_guardian(in_display_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.flowbond_users WHERE id = uid) THEN
    RAISE EXCEPTION 'no flowbond identity for this session';
  END IF;

  INSERT INTO public.banoseco_guardians (user_id, display_name)
  VALUES (uid, in_display_name)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, public.banoseco_guardians.display_name),
        active       = true;
  RETURN uid;
END $$;

-- ---------------------------------------------------------------------
-- 4b. Conexión de app por-usuario (registro real en flowbond_app_connections).
--     La llama el callback de login para CUALQUIER usuario de BAÑOSECO
--     (donante o guardián). El allow-list de app_slug se amplía en 00.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_connect()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.flowbond_app_connections (user_id, app_slug, status, first_activated_at, last_active_at)
  VALUES (uid, 'banoseco', 'active', now(), now())
  ON CONFLICT (user_id, app_slug)
    DO UPDATE SET status = 'active', last_active_at = now()
  RETURNING id INTO cid;
  RETURN cid;
END $$;

-- ---------------------------------------------------------------------
-- 5. Recarga "solar" diaria de energía (a tope si pasó >= 20h)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_refill_energy(in_full int DEFAULT 8, in_after_hours int DEFAULT 20)
RETURNS int  -- energía resultante
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cur int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  UPDATE public.banoseco_guardians
     SET energy = in_full, energy_refilled_at = now()
   WHERE user_id = uid
     AND now() - energy_refilled_at >= make_interval(hours => in_after_hours)
  RETURNING energy INTO cur;

  IF cur IS NULL THEN
    SELECT energy INTO cur FROM public.banoseco_guardians WHERE user_id = uid;
  END IF;
  RETURN COALESCE(cur, 0);
END $$;

-- ---------------------------------------------------------------------
-- 6. Reclamar misión — ahora gasta 1 de energía (rechaza en 0)
--    El gate de energía vive aquí (servidor). El flag de cliente
--    NEXT_PUBLIC_BANOSECO_ENERGY_GATE solo afecta la UX.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_claim_mission(in_mission_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.banoseco_guardians WHERE user_id = uid AND active) THEN
    RAISE EXCEPTION 'not an active guardian';
  END IF;

  -- gasta 1 de energía de forma atómica; si está en 0, no reclama
  UPDATE public.banoseco_guardians
     SET energy = energy - 1
   WHERE user_id = uid AND energy > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'no energy'; END IF;

  UPDATE public.banoseco_missions
     SET status = 'claimed', guardian_id = uid, claimed_at = now()
   WHERE id = in_mission_id AND status = 'open';
  GET DIAGNOSTICS ok = ROW_COUNT;

  IF NOT ok THEN
    -- la misión ya no estaba abierta → devuelve la energía
    UPDATE public.banoseco_guardians SET energy = energy + 1 WHERE user_id = uid;
    RETURN false;
  END IF;

  UPDATE public.banoseco_toilets t
     SET status = 'servicing'
   FROM public.banoseco_missions m
   WHERE m.id = in_mission_id AND t.id = m.toilet_id;

  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 7. Completar misión — acredita oro Y xp (dos filas en el ledger)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_complete_mission(
  in_mission_id uuid,
  in_proof_url text DEFAULT NULL
)
RETURNS TABLE (oro int, xp int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); v_oro int; v_xp int; t_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  UPDATE public.banoseco_missions
     SET status = 'done', completed_at = now(), proof_url = in_proof_url
   WHERE id = in_mission_id AND guardian_id = uid AND status = 'claimed'
   RETURNING reward_oro, reward_xp, toilet_id INTO v_oro, v_xp, t_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'mission not claimable by you'; END IF;

  UPDATE public.banoseco_toilets
     SET status = 'ok', fill_pct = 0, uses_since_swap = 0, last_serviced_at = now()
   WHERE id = t_id;

  INSERT INTO public.banoseco_point_ledger (user_id, delta, currency, reason, ref_table, ref_id)
  VALUES
    (uid, v_oro, 'oro', 'mission_complete', 'banoseco_missions', in_mission_id::text),
    (uid, v_xp,  'xp',  'mission_complete', 'banoseco_missions', in_mission_id::text);

  oro := v_oro; xp := v_xp; RETURN NEXT;
END $$;

-- ---------------------------------------------------------------------
-- 8. Reciclable -> puntos (acredita en 'oro' por defecto, ahora con currency)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_record_deposit(
  in_toilet_id uuid,
  in_material text,
  in_weight_g int
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); pts int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  pts := greatest(1, in_weight_g / 50);  -- 1 punto por cada 50g (ajustable)

  INSERT INTO public.banoseco_deposits (toilet_id, user_id, material, weight_g, points)
  VALUES (in_toilet_id, uid, in_material, in_weight_g, pts);

  INSERT INTO public.banoseco_point_ledger (user_id, delta, currency, reason, ref_table)
  VALUES (uid, pts, 'oro', 'deposit', 'banoseco_deposits');

  RETURN pts;
END $$;

-- ---------------------------------------------------------------------
-- 9. Saldo por moneda (default oro)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_guardian_balance(
  in_user_id uuid DEFAULT NULL,
  in_currency banoseco_currency DEFAULT 'oro'
)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::int
  FROM public.banoseco_point_ledger
  WHERE user_id = COALESCE(in_user_id, auth.uid())
    AND currency = in_currency
$$;

-- ---------------------------------------------------------------------
-- 10. Perfil de juego del guardián (saldos + energía + xp) en un solo viaje
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_guardian_profile()
RETURNS TABLE (
  user_id uuid, display_name text, is_guardian boolean,
  oro int, xp int, energy int, energy_refilled_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    auth.uid(),
    g.display_name,
    (g.user_id IS NOT NULL),
    public.banoseco_guardian_balance(auth.uid(), 'oro'),
    public.banoseco_guardian_balance(auth.uid(), 'xp'),
    COALESCE(g.energy, 0),
    g.energy_refilled_at
  FROM (SELECT auth.uid() AS uid) s
  LEFT JOIN public.banoseco_guardians g ON g.user_id = s.uid
$$;

-- ---------------------------------------------------------------------
-- 11. Leaderboard del gremio (por oro) — público para la vista de misiones
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_leaderboard(in_limit int DEFAULT 10)
RETURNS TABLE (user_id uuid, display_name text, oro int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.user_id,
         COALESCE(g.display_name, 'Guardián'),
         SUM(l.delta)::int AS oro
  FROM public.banoseco_point_ledger l
  LEFT JOIN public.banoseco_guardians g ON g.user_id = l.user_id
  WHERE l.currency = 'oro'
  GROUP BY l.user_id, g.display_name
  ORDER BY oro DESC
  LIMIT in_limit
$$;

-- ---------------------------------------------------------------------
-- 12. Grants para las RPC nuevas / reescritas
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.banoseco_connect() TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_become_guardian(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_refill_energy(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_claim_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_complete_mission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_record_deposit(uuid,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_guardian_balance(uuid,banoseco_currency) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_guardian_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_leaderboard(int) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. Realtime: el mapa y las misiones se actualizan sin recargar
-- ---------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.banoseco_toilets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.banoseco_missions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- DRY-RUN: revierte todo. Cambia a COMMIT para aplicar.
-- =====================================================================
ROLLBACK;
