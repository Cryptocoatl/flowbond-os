-- =====================================================================
-- BAÑOSECO  ·  Migración inicial (Layer 0 / Pattern A)
-- Proyecto canónico: fgsrcxxccdjqyrpkitmk  (us-east-2, FlowBond-life)
-- NUNCA usar eoajujwpdkfuicnoxetk.
--
-- Patrón FlowBond:
--   · Todas las tablas con prefijo banoseco_
--   · Raíz de identidad: flowbond_users (FBID) — guardianes y donantes
--     son flowbond_users; el baño público dona sin usuario (anónimo).
--   · Puntos = ledger append-only (event-sourced), saldo = suma.
--   · Toda escritura pasa por RPC SECURITY DEFINER; RLS niega por default.
--
-- DRY-RUN: este archivo corre dentro de BEGIN ... ROLLBACK.
--   Para aplicar de verdad: cambia el ROLLBACK final por COMMIT,
--   o corre con `supabase db push` desde la migración versionada.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Registro de app en el ecosistema
--    flowbond_app_connections es POR-USUARIO (user_id, app_slug) y restringe
--    app_slug con un CHECK allow-list. No existe fila "de app" ni columna
--    display_name. Aquí solo admitimos 'banoseco' en el allow-list; el
--    registro real (una fila por guardián/donante) lo hace la RPC
--    banoseco_connect() en el login. Idempotente.
-- ---------------------------------------------------------------------
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conrelid = 'public.flowbond_app_connections'::regclass
    AND conname  = 'flowbond_app_connections_app_slug_check';

  IF def IS NOT NULL AND position('''banoseco''' IN def) = 0 THEN
    ALTER TABLE public.flowbond_app_connections
      DROP CONSTRAINT flowbond_app_connections_app_slug_check;
    ALTER TABLE public.flowbond_app_connections
      ADD CONSTRAINT flowbond_app_connections_app_slug_check
      CHECK (app_slug = ANY (ARRAY[
        'flowgarden','danz','xelva','mountaindogs','flownation','flowbond',
        'astroflow','deck','ops','flowme','fbid','flow3','claudia','banoseco'
      ]));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE banoseco_toilet_status AS ENUM ('ok','filling','full','servicing','offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banoseco_mission_status AS ENUM ('open','claimed','done','verified','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banoseco_mission_kind AS ENUM ('swap','clean','sanitize','compost_dropoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banoseco_ledger_reason AS ENUM ('donation','deposit','mission_complete','adjustment','payout');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- 2.1 Módulos físicos (los baños)
CREATE TABLE IF NOT EXISTS public.banoseco_toilets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text UNIQUE NOT NULL,            -- p.ej. "BS-ROMA-014" (para QR y rótulo)
  name              text NOT NULL,
  neighborhood      text,                            -- colonia
  lat               double precision NOT NULL,
  lng               double precision NOT NULL,
  status            banoseco_toilet_status NOT NULL DEFAULT 'ok',
  fill_pct          smallint NOT NULL DEFAULT 0 CHECK (fill_pct BETWEEN 0 AND 100),
  capacity_uses     int NOT NULL DEFAULT 60,         -- usos hasta llenarse una cubeta
  uses_since_swap   int NOT NULL DEFAULT 0,
  has_solar_charge  boolean NOT NULL DEFAULT false,
  has_recycling     boolean NOT NULL DEFAULT false,
  donation_url      text,                            -- destino del QR de donación
  installed_at      timestamptz NOT NULL DEFAULT now(),
  last_serviced_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banoseco_toilets_geo_idx ON public.banoseco_toilets (lat, lng);
CREATE INDEX IF NOT EXISTS banoseco_toilets_status_idx ON public.banoseco_toilets (status);

-- 2.2 Guardianes (rol BAÑOSECO sobre FBID)
CREATE TABLE IF NOT EXISTS public.banoseco_guardians (
  user_id        uuid PRIMARY KEY REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  display_name   text,
  home_lat       double precision,
  home_lng       double precision,
  payout_method  text,                               -- 'points_only' | 'mercado_pago' | 'spei'
  active         boolean NOT NULL DEFAULT true,
  joined_at      timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Misiones (se generan cuando un baño se llena)
CREATE TABLE IF NOT EXISTS public.banoseco_missions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id       uuid NOT NULL REFERENCES public.banoseco_toilets(id) ON DELETE CASCADE,
  kind            banoseco_mission_kind NOT NULL DEFAULT 'swap',
  status          banoseco_mission_status NOT NULL DEFAULT 'open',
  reward_points   int NOT NULL DEFAULT 50,
  reward_mxn      numeric(10,2) NOT NULL DEFAULT 0,
  guardian_id     uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,
  completed_at    timestamptz,
  proof_url       text,                              -- foto de cubeta limpia / entrega a compostaje
  notes           text
);
CREATE INDEX IF NOT EXISTS banoseco_missions_status_idx ON public.banoseco_missions (status);
CREATE INDEX IF NOT EXISTS banoseco_missions_guardian_idx ON public.banoseco_missions (guardian_id);
-- Una sola misión abierta por baño a la vez:
CREATE UNIQUE INDEX IF NOT EXISTS banoseco_missions_one_open_per_toilet
  ON public.banoseco_missions (toilet_id)
  WHERE status IN ('open','claimed','done');

-- 2.4 Donaciones (los $5 de entrada / donación, QR o monedas)
CREATE TABLE IF NOT EXISTS public.banoseco_donations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id   uuid REFERENCES public.banoseco_toilets(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,  -- null = anónimo (bote de monedas)
  amount_mxn  numeric(10,2) NOT NULL CHECK (amount_mxn >= 0),
  method      text NOT NULL DEFAULT 'qr',            -- 'qr' | 'coin' | 'card'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banoseco_donations_toilet_idx ON public.banoseco_donations (toilet_id);

-- 2.5 Depósitos de reciclables (generan puntos)
CREATE TABLE IF NOT EXISTS public.banoseco_deposits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id    uuid REFERENCES public.banoseco_toilets(id) ON DELETE SET NULL,
  user_id      uuid NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  material     text NOT NULL,                        -- 'pet' | 'aluminio' | 'vidrio' | 'organico'
  weight_g     int NOT NULL DEFAULT 0,
  points       int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2.6 Ledger de puntos (append-only, saldo = SUM)
CREATE TABLE IF NOT EXISTS public.banoseco_point_ledger (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  delta       int NOT NULL,                          -- + gana, - canjea/payout
  reason      banoseco_ledger_reason NOT NULL,
  ref_table   text,                                  -- 'banoseco_missions' | 'banoseco_deposits' ...
  ref_id      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banoseco_ledger_user_idx ON public.banoseco_point_ledger (user_id);

-- 2.7 Lotes de composta (la "tierra" — métrica de impacto)
CREATE TABLE IF NOT EXISTS public.banoseco_compost_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      uuid REFERENCES public.banoseco_missions(id) ON DELETE SET NULL,
  site            text,                              -- centro de compostaje destino
  input_kg        numeric(10,2) NOT NULL DEFAULT 0,
  water_saved_l   numeric(12,2) NOT NULL DEFAULT 0,  -- vs inodoro de agua (~6 L/descarga)
  soil_kg_est     numeric(10,2) NOT NULL DEFAULT 0,  -- tierra estimada generada
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. RLS — negar por default, leer lo público, escribir vía RPC
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_toilets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_guardians       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_missions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_donations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_deposits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_point_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_compost_batches ENABLE ROW LEVEL SECURITY;

-- Mapa público: cualquiera ve los baños y su estado
DROP POLICY IF EXISTS banoseco_toilets_read ON public.banoseco_toilets;
CREATE POLICY banoseco_toilets_read ON public.banoseco_toilets
  FOR SELECT USING (true);

-- Misiones abiertas son visibles para guardianes autenticados
DROP POLICY IF EXISTS banoseco_missions_read ON public.banoseco_missions;
CREATE POLICY banoseco_missions_read ON public.banoseco_missions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Cada guardián ve su propio ledger
DROP POLICY IF EXISTS banoseco_ledger_self ON public.banoseco_point_ledger;
CREATE POLICY banoseco_ledger_self ON public.banoseco_point_ledger
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS banoseco_guardian_self ON public.banoseco_guardians;
CREATE POLICY banoseco_guardian_self ON public.banoseco_guardians
  FOR SELECT USING (user_id = auth.uid());

-- Impacto de composta: público (para donantes/sponsors)
DROP POLICY IF EXISTS banoseco_compost_read ON public.banoseco_compost_batches;
CREATE POLICY banoseco_compost_read ON public.banoseco_compost_batches
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 4. RPCs SECURITY DEFINER (única superficie de escritura)
-- ---------------------------------------------------------------------

-- 4.1 Baños cercanos (Haversine simple, ordenados por distancia)
CREATE OR REPLACE FUNCTION public.banoseco_nearby_toilets(
  in_lat double precision,
  in_lng double precision,
  in_radius_km double precision DEFAULT 3
)
RETURNS TABLE (
  id uuid, code text, name text, neighborhood text,
  lat double precision, lng double precision,
  status banoseco_toilet_status, fill_pct smallint,
  has_solar_charge boolean, has_recycling boolean,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.code, t.name, t.neighborhood, t.lat, t.lng,
         t.status, t.fill_pct, t.has_solar_charge, t.has_recycling,
         6371 * acos(
           least(1, cos(radians(in_lat)) * cos(radians(t.lat)) *
           cos(radians(t.lng) - radians(in_lng)) +
           sin(radians(in_lat)) * sin(radians(t.lat)))
         ) AS distance_km
  FROM public.banoseco_toilets t
  WHERE t.status <> 'offline'
  HAVING true
  ORDER BY distance_km
$$;

-- 4.2 Reportar baño lleno -> abre misión (idempotente por baño)
CREATE OR REPLACE FUNCTION public.banoseco_report_full(in_toilet_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m_id uuid;
BEGIN
  UPDATE public.banoseco_toilets
     SET status = 'full', fill_pct = 100
   WHERE id = in_toilet_id;

  INSERT INTO public.banoseco_missions (toilet_id, kind, status, reward_points)
  VALUES (in_toilet_id, 'swap', 'open', 50)
  ON CONFLICT DO NOTHING
  RETURNING id INTO m_id;

  IF m_id IS NULL THEN
    SELECT id INTO m_id FROM public.banoseco_missions
     WHERE toilet_id = in_toilet_id AND status IN ('open','claimed','done')
     LIMIT 1;
  END IF;
  RETURN m_id;
END $$;

-- 4.3 Reclamar misión (solo guardianes activos)
CREATE OR REPLACE FUNCTION public.banoseco_claim_mission(in_mission_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.banoseco_guardians WHERE user_id = uid AND active) THEN
    RAISE EXCEPTION 'not an active guardian';
  END IF;

  UPDATE public.banoseco_missions
     SET status = 'claimed', guardian_id = uid, claimed_at = now()
   WHERE id = in_mission_id AND status = 'open';

  UPDATE public.banoseco_toilets t
     SET status = 'servicing'
   FROM public.banoseco_missions m
   WHERE m.id = in_mission_id AND t.id = m.toilet_id;

  RETURN FOUND;
END $$;

-- 4.4 Completar misión -> resetea baño, acredita puntos en el ledger
CREATE OR REPLACE FUNCTION public.banoseco_complete_mission(
  in_mission_id uuid,
  in_proof_url text DEFAULT NULL
)
RETURNS int  -- puntos acreditados
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); pts int; t_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  UPDATE public.banoseco_missions
     SET status = 'done', completed_at = now(), proof_url = in_proof_url
   WHERE id = in_mission_id AND guardian_id = uid AND status = 'claimed'
   RETURNING reward_points, toilet_id INTO pts, t_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'mission not claimable by you'; END IF;

  UPDATE public.banoseco_toilets
     SET status = 'ok', fill_pct = 0, uses_since_swap = 0, last_serviced_at = now()
   WHERE id = t_id;

  INSERT INTO public.banoseco_point_ledger (user_id, delta, reason, ref_table, ref_id)
  VALUES (uid, pts, 'mission_complete', 'banoseco_missions', in_mission_id::text);

  RETURN pts;
END $$;

-- 4.5 Registrar donación (anónima o ligada a FBID)
CREATE OR REPLACE FUNCTION public.banoseco_record_donation(
  in_toilet_id uuid,
  in_amount_mxn numeric,
  in_method text DEFAULT 'qr'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d_id uuid; uid uuid := auth.uid();
BEGIN
  INSERT INTO public.banoseco_donations (toilet_id, user_id, amount_mxn, method)
  VALUES (in_toilet_id, uid, in_amount_mxn, in_method)
  RETURNING id INTO d_id;
  RETURN d_id;
END $$;

-- 4.6 Registrar reciclable -> puntos
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

  INSERT INTO public.banoseco_point_ledger (user_id, delta, reason, ref_table)
  VALUES (uid, pts, 'deposit', 'banoseco_deposits');

  RETURN pts;
END $$;

-- 4.7 Saldo de puntos de un guardián
CREATE OR REPLACE FUNCTION public.banoseco_guardian_balance(in_user_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::int
  FROM public.banoseco_point_ledger
  WHERE user_id = COALESCE(in_user_id, auth.uid())
$$;

-- 4.8 Métricas públicas de impacto (para landing/sponsors)
CREATE OR REPLACE FUNCTION public.banoseco_impact_summary()
RETURNS TABLE (
  active_toilets bigint,
  missions_done bigint,
  liters_water_saved numeric,
  soil_kg numeric,
  total_donated_mxn numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.banoseco_toilets WHERE status <> 'offline'),
    (SELECT count(*) FROM public.banoseco_missions WHERE status IN ('done','verified')),
    (SELECT COALESCE(SUM(water_saved_l),0) FROM public.banoseco_compost_batches),
    (SELECT COALESCE(SUM(soil_kg_est),0)   FROM public.banoseco_compost_batches),
    (SELECT COALESCE(SUM(amount_mxn),0)    FROM public.banoseco_donations)
$$;

-- Exponer RPCs a anon/authenticated según corresponda
GRANT EXECUTE ON FUNCTION public.banoseco_nearby_toilets(double precision,double precision,double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_impact_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_record_donation(uuid,numeric,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_report_full(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_claim_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_complete_mission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_record_deposit(uuid,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_guardian_balance(uuid) TO authenticated;

-- =====================================================================
-- DRY-RUN: revierte todo. Cambia a COMMIT para aplicar.
-- =====================================================================
ROLLBACK;
