-- =====================================================================
-- BAÑOSECO · Migración 02 — Organizaciones, nodos con dueño, plantillas
--                          de misión y el camino para la AI de routing.
-- Proyecto canónico: fgsrcxxccdjqyrpkitmk  (us-east-2, FlowBond-life)
-- NUNCA usar eoajujwpdkfuicnoxetk.
--
-- Capas que agrega sobre 00 + 01:
--   · banoseco_orgs + banoseco_org_members (roles admin/steward): las
--     organizaciones (baños secos, centros de reciclaje, composta, huertos)
--     son entidades reales con miembros y permisos.
--   · Propiedad de nodos: banoseco_toilets gana org_id + node_kind + active.
--     Un "nodo" ya no es solo un baño: puede ser centro de reciclaje, sitio
--     de composta o punto de agua. La org dueña lo crea y administra.
--   · banoseco_mission_templates: plantillas (globales u org) que definen
--     tipo + recompensa por node_kind. La Ai de routing las usa como base
--     para abrir misiones con recompensa dinámica.
--   · RPCs de org: crear org, invitar miembro por email, crear/editar nodo,
--     fijar estado, abrir misión (callable por backend AI), verificar misión.
--   · banoseco_nearby_toilets reescrita: devuelve node_kind + org_id y filtra
--     nodos inactivos.
--   · Puente a FlowBond: la columna missions.bridged_at marca que la
--     contribución cross-app (fc_earn) ya se acuñó — idempotencia del puente.
--
-- Privacidad: el mapa nunca necesita la ubicación exacta del usuario; las
-- consultas de cercanía se hacen con una celda difuminada (~500m) desde el
-- cliente. Esta migración no guarda ubicación de usuarios en ningún lado.
--
-- DRY-RUN: corre dentro de BEGIN ... ROLLBACK. Para aplicar de verdad:
--   cambia el ROLLBACK final por COMMIT, o versiona y `supabase db push`.
-- PRE-REQUISITO: 00_banoseco_init.sql y 01_banoseco_game.sql ya aplicados.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Enums nuevos
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE banoseco_node_kind AS ENUM
    ('dry_toilet','recycling_center','compost_site','water_point');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banoseco_org_kind AS ENUM
    ('banos_secos','reciclaje','composta','huerto','colectivo','alcaldia','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banoseco_org_role AS ENUM ('admin','steward');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2. Organizaciones y membresías
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banoseco_orgs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  kind           banoseco_org_kind NOT NULL DEFAULT 'other',
  description    text,
  contact_email  text,
  verified       boolean NOT NULL DEFAULT false,   -- la red verifica orgs reales
  created_by     uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banoseco_org_members (
  org_id    uuid NOT NULL REFERENCES public.banoseco_orgs(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.flowbond_users(id) ON DELETE CASCADE,
  role      banoseco_org_role NOT NULL DEFAULT 'steward',
  added_by  uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS banoseco_org_members_user_idx
  ON public.banoseco_org_members (user_id);

-- ---------------------------------------------------------------------
-- 3. Propiedad y tipo de nodo sobre banoseco_toilets
--    (un "toilet" se generaliza a "nodo"; conservamos el nombre de tabla).
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_toilets
  ADD COLUMN IF NOT EXISTS org_id    uuid REFERENCES public.banoseco_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS node_kind banoseco_node_kind NOT NULL DEFAULT 'dry_toilet',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active    boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS banoseco_toilets_org_idx  ON public.banoseco_toilets (org_id);
CREATE INDEX IF NOT EXISTS banoseco_toilets_kind_idx ON public.banoseco_toilets (node_kind);

-- ---------------------------------------------------------------------
-- 4. Plantillas de misión (la AI las usa como base de recompensa)
--    org_id NULL = plantilla global por defecto para ese node_kind+kind.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banoseco_mission_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES public.banoseco_orgs(id) ON DELETE CASCADE,
  node_kind    banoseco_node_kind NOT NULL DEFAULT 'dry_toilet',
  kind         banoseco_mission_kind NOT NULL DEFAULT 'swap',
  title        text,
  instructions text,
  reward_xp    int NOT NULL DEFAULT 50,
  reward_oro   int NOT NULL DEFAULT 25,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banoseco_templates_lookup_idx
  ON public.banoseco_mission_templates (node_kind, kind, active);

-- semillas globales por defecto (idempotente: solo si no hay ninguna global)
INSERT INTO public.banoseco_mission_templates (org_id, node_kind, kind, title, reward_xp, reward_oro)
SELECT NULL, 'dry_toilet', 'swap',            'Cambiar cubeta',     50, 25
WHERE NOT EXISTS (SELECT 1 FROM public.banoseco_mission_templates WHERE org_id IS NULL);
INSERT INTO public.banoseco_mission_templates (org_id, node_kind, kind, title, reward_xp, reward_oro)
SELECT NULL, 'dry_toilet', 'clean',           'Limpieza',           45, 20
WHERE NOT EXISTS (SELECT 1 FROM public.banoseco_mission_templates WHERE org_id IS NULL AND kind='clean' AND node_kind='dry_toilet');
INSERT INTO public.banoseco_mission_templates (org_id, node_kind, kind, title, reward_xp, reward_oro)
SELECT NULL, 'dry_toilet', 'sanitize',        'Sanitizar',          70, 35
WHERE NOT EXISTS (SELECT 1 FROM public.banoseco_mission_templates WHERE org_id IS NULL AND kind='sanitize' AND node_kind='dry_toilet');
INSERT INTO public.banoseco_mission_templates (org_id, node_kind, kind, title, reward_xp, reward_oro)
SELECT NULL, 'dry_toilet', 'compost_dropoff', 'Llevar a composta',  90, 45
WHERE NOT EXISTS (SELECT 1 FROM public.banoseco_mission_templates WHERE org_id IS NULL AND kind='compost_dropoff' AND node_kind='dry_toilet');

-- ---------------------------------------------------------------------
-- 5. Puente a FlowBond: marca de acuñación cross-app por misión.
--    El puente (fc_earn) lo dispara una ruta server con service_role; esta
--    columna garantiza idempotencia (no se acuña dos veces por la misma misión).
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_missions
  ADD COLUMN IF NOT EXISTS bridged_at timestamptz;

-- ---------------------------------------------------------------------
-- 6. RLS para tablas nuevas (deny-default; escritura solo por RPC)
-- ---------------------------------------------------------------------
ALTER TABLE public.banoseco_orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_org_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banoseco_mission_templates ENABLE ROW LEVEL SECURITY;

-- orgs: lectura pública (el mapa muestra quién opera un nodo). Escritura por RPC.
DROP POLICY IF EXISTS banoseco_orgs_read ON public.banoseco_orgs;
CREATE POLICY banoseco_orgs_read ON public.banoseco_orgs
  FOR SELECT USING (true);

-- membresías: cada quien ve solo las suyas (la lista completa va por RPC admin,
-- así evitamos recursión de políticas).
DROP POLICY IF EXISTS banoseco_org_members_self ON public.banoseco_org_members;
CREATE POLICY banoseco_org_members_self ON public.banoseco_org_members
  FOR SELECT USING (user_id = auth.uid());

-- plantillas: lectura pública (no son secretas). Escritura por RPC.
DROP POLICY IF EXISTS banoseco_templates_read ON public.banoseco_mission_templates;
CREATE POLICY banoseco_templates_read ON public.banoseco_mission_templates
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 7. Helpers de permisos (SECURITY DEFINER → no recursan con la RLS)
-- ---------------------------------------------------------------------
-- ¿el usuario actual es miembro de la org con al menos `in_min_role`?
-- jerarquía: admin > steward.
CREATE OR REPLACE FUNCTION public.banoseco_is_org_member(
  in_org_id uuid,
  in_min_role banoseco_org_role DEFAULT 'steward'
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banoseco_org_members m
    WHERE m.org_id = in_org_id
      AND m.user_id = auth.uid()
      AND (in_min_role = 'steward' OR m.role = 'admin')
  );
$$;

-- orgs del usuario actual + su rol (para el panel).
CREATE OR REPLACE FUNCTION public.banoseco_my_orgs()
RETURNS TABLE (org_id uuid, slug text, name text, kind banoseco_org_kind,
               role banoseco_org_role, verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.slug, o.name, o.kind, m.role, o.verified
  FROM public.banoseco_org_members m
  JOIN public.banoseco_orgs o ON o.id = m.org_id
  WHERE m.user_id = auth.uid()
  ORDER BY o.name;
$$;

-- ---------------------------------------------------------------------
-- 8. Crear organización (el creador queda como admin)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_create_org(
  in_name text,
  in_kind banoseco_org_kind,
  in_slug text,
  in_description text DEFAULT NULL,
  in_contact_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); oid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.flowbond_users WHERE id = uid) THEN
    RAISE EXCEPTION 'no flowbond identity for this session';
  END IF;
  IF coalesce(btrim(in_name), '') = '' OR coalesce(btrim(in_slug), '') = '' THEN
    RAISE EXCEPTION 'name and slug required';
  END IF;

  INSERT INTO public.banoseco_orgs (slug, name, kind, description, contact_email, created_by)
  VALUES (lower(btrim(in_slug)), btrim(in_name), in_kind, in_description, in_contact_email, uid)
  RETURNING id INTO oid;

  INSERT INTO public.banoseco_org_members (org_id, user_id, role, added_by)
  VALUES (oid, uid, 'admin', uid);

  RETURN oid;
END $$;

-- ---------------------------------------------------------------------
-- 9. Invitar/añadir miembro por email (solo admin de la org)
--    Resuelve el email contra flowbond_users; la persona debe haber entrado
--    al menos una vez a algún app FlowBond (tener FBID).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_add_org_member_by_email(
  in_org_id uuid,
  in_email text,
  in_role banoseco_org_role DEFAULT 'steward'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.banoseco_is_org_member(in_org_id, 'admin') THEN
    RAISE EXCEPTION 'admin of this org required';
  END IF;

  SELECT id INTO target FROM public.flowbond_users
   WHERE lower(email) = lower(btrim(in_email)) LIMIT 1;
  IF target IS NULL THEN
    RAISE EXCEPTION 'no FlowBond identity found for %, ask them to sign in once first', in_email;
  END IF;

  INSERT INTO public.banoseco_org_members (org_id, user_id, role, added_by)
  VALUES (in_org_id, target, in_role, uid)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN target;
END $$;

-- lista de miembros de una org (solo admin) — incluye email para gestión
CREATE OR REPLACE FUNCTION public.banoseco_org_members_list(in_org_id uuid)
RETURNS TABLE (user_id uuid, email text, role banoseco_org_role, added_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.banoseco_is_org_member(in_org_id, 'admin') THEN
    RAISE EXCEPTION 'admin of this org required';
  END IF;
  RETURN QUERY
    SELECT m.user_id, u.email, m.role, m.added_at
    FROM public.banoseco_org_members m
    LEFT JOIN public.flowbond_users u ON u.id = m.user_id
    WHERE m.org_id = in_org_id
    ORDER BY m.role, m.added_at;
END $$;

-- ---------------------------------------------------------------------
-- 10. Crear nodo (baño / reciclaje / composta / agua) — miembro de la org
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_create_node(
  in_org_id uuid,
  in_code text,
  in_name text,
  in_node_kind banoseco_node_kind,
  in_lat double precision,
  in_lng double precision,
  in_neighborhood text DEFAULT NULL,
  in_has_solar_charge boolean DEFAULT false,
  in_has_recycling boolean DEFAULT false,
  in_donation_url text DEFAULT NULL,
  in_capacity_uses int DEFAULT 60
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.banoseco_is_org_member(in_org_id, 'steward') THEN
    RAISE EXCEPTION 'member of this org required';
  END IF;
  IF in_lat IS NULL OR in_lng IS NULL THEN RAISE EXCEPTION 'lat/lng required'; END IF;

  INSERT INTO public.banoseco_toilets
    (code, name, neighborhood, lat, lng, node_kind, org_id, created_by,
     has_solar_charge, has_recycling, donation_url, capacity_uses, status)
  VALUES
    (btrim(in_code), btrim(in_name), in_neighborhood, in_lat, in_lng, in_node_kind, in_org_id, uid,
     coalesce(in_has_solar_charge,false), coalesce(in_has_recycling,false), in_donation_url,
     coalesce(in_capacity_uses,60), 'ok')
  RETURNING id INTO nid;

  RETURN nid;
END $$;

-- editar campos básicos del nodo (miembro de la org dueña)
CREATE OR REPLACE FUNCTION public.banoseco_update_node(
  in_node_id uuid,
  in_name text DEFAULT NULL,
  in_neighborhood text DEFAULT NULL,
  in_donation_url text DEFAULT NULL,
  in_active boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid;
BEGIN
  SELECT org_id INTO oid FROM public.banoseco_toilets WHERE id = in_node_id;
  IF oid IS NULL OR NOT public.banoseco_is_org_member(oid, 'steward') THEN
    RAISE EXCEPTION 'member of the owning org required';
  END IF;

  UPDATE public.banoseco_toilets SET
    name         = COALESCE(in_name, name),
    neighborhood = COALESCE(in_neighborhood, neighborhood),
    donation_url = COALESCE(in_donation_url, donation_url),
    active       = COALESCE(in_active, active)
  WHERE id = in_node_id;
  RETURN FOUND;
END $$;

-- fijar estado del nodo (miembro de la org); 'full' abre misión vía template
CREATE OR REPLACE FUNCTION public.banoseco_set_node_status(
  in_node_id uuid,
  in_status banoseco_toilet_status
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid;
BEGIN
  SELECT org_id INTO oid FROM public.banoseco_toilets WHERE id = in_node_id;
  IF oid IS NULL OR NOT public.banoseco_is_org_member(oid, 'steward') THEN
    RAISE EXCEPTION 'member of the owning org required';
  END IF;

  UPDATE public.banoseco_toilets
     SET status = in_status,
         fill_pct = CASE WHEN in_status = 'full' THEN 100 ELSE fill_pct END
   WHERE id = in_node_id;
  RETURN FOUND;
END $$;

-- ---------------------------------------------------------------------
-- 11. Abrir misión con parámetros dados (recompensa elegida por la AI o la org)
--     Callable por:
--       · service_role (la ruta server de AI) — auth.uid() es NULL → permitido.
--       · miembro de la org dueña del nodo — se valida membresía.
--     Respeta el índice único "una misión abierta por nodo".
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_open_mission(
  in_node_id uuid,
  in_kind banoseco_mission_kind,
  in_reward_xp int DEFAULT 50,
  in_reward_oro int DEFAULT 25,
  in_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); oid uuid; mid uuid;
BEGIN
  SELECT org_id INTO oid FROM public.banoseco_toilets WHERE id = in_node_id;
  IF oid IS NULL AND NOT EXISTS (SELECT 1 FROM public.banoseco_toilets WHERE id = in_node_id) THEN
    RAISE EXCEPTION 'node not found';
  END IF;

  -- si hay sesión de usuario, debe ser miembro de la org dueña; el backend
  -- (service_role) tiene auth.uid() NULL y está autorizado por el GRANT.
  IF uid IS NOT NULL AND (oid IS NULL OR NOT public.banoseco_is_org_member(oid, 'steward')) THEN
    RAISE EXCEPTION 'member of the owning org required';
  END IF;

  -- ya hay una misión viva en este nodo → devuélvela (idempotente)
  SELECT id INTO mid FROM public.banoseco_missions
   WHERE toilet_id = in_node_id AND status IN ('open','claimed','done')
   LIMIT 1;
  IF mid IS NOT NULL THEN RETURN mid; END IF;

  INSERT INTO public.banoseco_missions
    (toilet_id, kind, status, reward_xp, reward_oro, notes)
  VALUES
    (in_node_id, in_kind, 'open',
     greatest(1, coalesce(in_reward_xp,50)),
     greatest(0, coalesce(in_reward_oro,25)),
     in_notes)
  RETURNING id INTO mid;

  UPDATE public.banoseco_toilets SET status = 'full', fill_pct = 100 WHERE id = in_node_id;
  RETURN mid;
END $$;

-- ---------------------------------------------------------------------
-- 12. Verificar misión completada (admin/steward de la org dueña).
--     done -> verified. Habilita el puente cross-app (la ruta server acuña
--     fc_earn solo sobre misiones verificadas).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banoseco_verify_mission(in_mission_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid;
BEGIN
  SELECT t.org_id INTO oid
    FROM public.banoseco_missions m
    JOIN public.banoseco_toilets t ON t.id = m.toilet_id
   WHERE m.id = in_mission_id;
  IF oid IS NULL OR NOT public.banoseco_is_org_member(oid, 'steward') THEN
    RAISE EXCEPTION 'member of the owning org required';
  END IF;

  UPDATE public.banoseco_missions
     SET status = 'verified'
   WHERE id = in_mission_id AND status = 'done';
  RETURN FOUND;
END $$;

-- ---------------------------------------------------------------------
-- 13. banoseco_nearby_toilets reescrita: + node_kind, org_id; solo activos.
--     (cambia la firma de retorno → DROP antes de recrear)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.banoseco_nearby_toilets(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.banoseco_nearby_toilets(
  in_lat double precision,
  in_lng double precision,
  in_radius_km double precision DEFAULT 3
)
RETURNS TABLE (
  id uuid, code text, name text, neighborhood text,
  lat double precision, lng double precision,
  status banoseco_toilet_status, fill_pct smallint,
  node_kind banoseco_node_kind, org_id uuid,
  has_solar_charge boolean, has_recycling boolean,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.code, t.name, t.neighborhood, t.lat, t.lng, t.status, t.fill_pct,
         t.node_kind, t.org_id, t.has_solar_charge, t.has_recycling,
         (6371 * acos(
            greatest(-1, least(1,
              cos(radians(in_lat)) * cos(radians(t.lat)) *
              cos(radians(t.lng) - radians(in_lng)) +
              sin(radians(in_lat)) * sin(radians(t.lat))
            ))
         )) AS distance_km
  FROM public.banoseco_toilets t
  WHERE t.active
    AND t.status <> 'offline'
    AND (6371 * acos(
            greatest(-1, least(1,
              cos(radians(in_lat)) * cos(radians(t.lat)) *
              cos(radians(t.lng) - radians(in_lng)) +
              sin(radians(in_lat)) * sin(radians(t.lat))
            ))
         )) <= in_radius_km
  ORDER BY distance_km ASC
  LIMIT 200;
$$;

-- ---------------------------------------------------------------------
-- 14. Grants
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.banoseco_is_org_member(uuid, banoseco_org_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_my_orgs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_create_org(text, banoseco_org_kind, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_add_org_member_by_email(uuid, text, banoseco_org_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_org_members_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_create_node(uuid, text, text, banoseco_node_kind, double precision, double precision, text, boolean, boolean, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_update_node(uuid, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_set_node_status(uuid, banoseco_toilet_status) TO authenticated;
-- abrir misión: backend AI (service_role) + miembros de org (authenticated)
GRANT EXECUTE ON FUNCTION public.banoseco_open_mission(uuid, banoseco_mission_kind, int, int, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.banoseco_verify_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.banoseco_nearby_toilets(double precision, double precision, double precision) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 15. Realtime: las orgs ven cambios de sus nodos en vivo (ya publicado
--     banoseco_toilets/_missions en 01). Nada que agregar aquí.
-- ---------------------------------------------------------------------

-- =====================================================================
-- DRY-RUN: revierte todo. Cambia a COMMIT para aplicar.
-- =====================================================================
ROLLBACK;
