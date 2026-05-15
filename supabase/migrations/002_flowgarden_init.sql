-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 002_flowgarden_init.sql
-- Date      : 2026-05-15
-- Purpose   : FlowGarden full domain model
--             5 enums · 11 tables · indexes · RLS · triggers · storage buckets
-- Depends on: flowbond_users table in public schema (from Bundle 1 / 001)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE flowgarden_event_type AS ENUM (
  'photo_uploaded',
  'voice_note_uploaded',
  'text_observation',
  'planting',
  'germination',
  'transplant',
  'watering',
  'pest_observed',
  'disease_observed',
  'pruning',
  'fertilizing',
  'compost_added',
  'mulch_added',
  'harvest',
  'container_changed',
  'location_changed',
  'sensor_reading',
  'ai_recommendation',
  'task_completed',
  'question_asked',
  'system_summary'
);

CREATE TYPE flowgarden_urgency AS ENUM (
  'none',
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE flowgarden_health_status AS ENUM (
  'excellent',
  'good',
  'stressed',
  'critical',
  'unknown'
);

CREATE TYPE flowgarden_plant_group_status AS ENUM (
  'seed',
  'germinating',
  'seedling',
  'transplanted',
  'established',
  'flowering',
  'fruiting',
  'harvested',
  'dormant',
  'dead'
);

CREATE TYPE flowgarden_privacy_mode AS ENUM (
  'standard',
  'privacy'
);

CREATE TYPE flowgarden_task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'dismissed',
  'missed'
);

CREATE TYPE flowgarden_intent AS ENUM (
  'CREATE_PLANT_GROUP',
  'CREATE_PLANT',
  'UPDATE_PLANT_STATUS',
  'LOG_OBSERVATION',
  'LOG_WATERING',
  'LOG_TRANSPLANT',
  'LOG_PLANTING',
  'LOG_GERMINATION',
  'LOG_PEST_ALERT',
  'LOG_DISEASE_ALERT',
  'LOG_PHOTO_ANALYSIS',
  'ATTACH_MEDIA_TO_PLANT',
  'CREATE_TASK',
  'COMPLETE_TASK',
  'UPDATE_GARDEN_ZONE',
  'MOVE_PLANT_LOCATION',
  'GENERATE_DAILY_SUMMARY',
  'RECOMMEND_NEXT_ACTION',
  'ASK_CLARIFYING_QUESTION',
  'SENSOR_DATA_RECEIVED',
  'UNKNOWN_GARDEN_INPUT'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES  (in FK dependency order)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. flowgarden_profiles
CREATE TABLE flowgarden_profiles (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES flowbond_users(id) ON DELETE CASCADE,
  display_name            TEXT,
  language                TEXT        DEFAULT 'en',
  privacy_mode            flowgarden_privacy_mode NOT NULL DEFAULT 'standard',
  ai_provider_preferences JSONB       DEFAULT '{}',
  gardening_style         JSONB       DEFAULT '{}',
  xp_total                INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. flowgarden_gardens
CREATE TABLE flowgarden_gardens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  location_label  TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  climate_zone    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. flowgarden_zones
CREATE TABLE flowgarden_zones (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id    UUID        NOT NULL REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  zone_type    TEXT,
  sun_exposure TEXT,
  soil_notes   TEXT,
  photo_urls   TEXT[]      DEFAULT ARRAY[]::TEXT[],
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. flowgarden_plant_groups
CREATE TABLE flowgarden_plant_groups (
  id                        UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID                         NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id                 UUID                         NOT NULL REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  zone_id                   UUID                         REFERENCES flowgarden_zones(id) ON DELETE SET NULL,
  name                      TEXT                         NOT NULL,
  species                   TEXT,
  variety                   TEXT,
  quantity                  INTEGER                      NOT NULL DEFAULT 1,
  status                    flowgarden_plant_group_status NOT NULL DEFAULT 'seedling',
  container_type            TEXT,
  location_description      TEXT,
  planted_date              DATE,
  transplanted_date         DATE,
  expected_next_action_date DATE,
  health_status             flowgarden_health_status     NOT NULL DEFAULT 'unknown',
  notes                     TEXT,
  photo_urls                TEXT[]                       DEFAULT ARRAY[]::TEXT[],
  metadata                  JSONB                        DEFAULT '{}',
  created_at                TIMESTAMPTZ                  DEFAULT NOW(),
  updated_at                TIMESTAMPTZ                  DEFAULT NOW()
);

-- 5. flowgarden_plants
CREATE TABLE flowgarden_plants (
  id             UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID                          NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id      UUID                          NOT NULL REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  zone_id        UUID                          REFERENCES flowgarden_zones(id) ON DELETE SET NULL,
  plant_group_id UUID                          REFERENCES flowgarden_plant_groups(id) ON DELETE SET NULL,
  name           TEXT                          NOT NULL,
  species        TEXT,
  variety        TEXT,
  status         flowgarden_plant_group_status NOT NULL DEFAULT 'seedling',
  health_status  flowgarden_health_status      NOT NULL DEFAULT 'unknown',
  planted_date   DATE,
  notes          TEXT,
  photo_urls     TEXT[]                        DEFAULT ARRAY[]::TEXT[],
  metadata       JSONB                         DEFAULT '{}',
  created_at     TIMESTAMPTZ                   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ                   DEFAULT NOW()
);

-- 6. flowgarden_events  ⭐ core append log
CREATE TABLE flowgarden_events (
  id                 UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID                  NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id          UUID                  REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  zone_id            UUID                  REFERENCES flowgarden_zones(id) ON DELETE SET NULL,
  plant_id           UUID                  REFERENCES flowgarden_plants(id) ON DELETE SET NULL,
  plant_group_id     UUID                  REFERENCES flowgarden_plant_groups(id) ON DELETE SET NULL,
  event_type         flowgarden_event_type NOT NULL,
  title              TEXT,
  raw_input          TEXT,
  structured_summary TEXT,
  ai_analysis        JSONB                 DEFAULT '{}',
  urgency            flowgarden_urgency    NOT NULL DEFAULT 'none',
  confidence_score   REAL,
  media_urls         TEXT[]                DEFAULT ARRAY[]::TEXT[],
  tags               TEXT[]                DEFAULT ARRAY[]::TEXT[],
  metadata           JSONB                 DEFAULT '{}',
  intent             flowgarden_intent,
  occurred_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ           DEFAULT NOW(),
  updated_at         TIMESTAMPTZ           DEFAULT NOW()
);

-- 7. flowgarden_tasks
CREATE TABLE flowgarden_tasks (
  id                  UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                   NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id           UUID                   REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  zone_id             UUID                   REFERENCES flowgarden_zones(id) ON DELETE SET NULL,
  plant_id            UUID                   REFERENCES flowgarden_plants(id) ON DELETE SET NULL,
  plant_group_id      UUID                   REFERENCES flowgarden_plant_groups(id) ON DELETE SET NULL,
  source_event_id     UUID                   REFERENCES flowgarden_events(id) ON DELETE SET NULL,
  title               TEXT                   NOT NULL,
  description         TEXT,
  status              flowgarden_task_status NOT NULL DEFAULT 'pending',
  urgency             flowgarden_urgency     NOT NULL DEFAULT 'medium',
  due_at              TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  completed_event_id  UUID                   REFERENCES flowgarden_events(id) ON DELETE SET NULL,
  xp_reward           INTEGER                NOT NULL DEFAULT 0,
  is_mission          BOOLEAN                NOT NULL DEFAULT FALSE,
  mission_category    TEXT,
  metadata            JSONB                  DEFAULT '{}',
  created_at          TIMESTAMPTZ            DEFAULT NOW(),
  updated_at          TIMESTAMPTZ            DEFAULT NOW()
);

-- 8. flowgarden_recommendations
CREATE TABLE flowgarden_recommendations (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID               NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id         UUID               REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  plant_id          UUID               REFERENCES flowgarden_plants(id) ON DELETE SET NULL,
  plant_group_id    UUID               REFERENCES flowgarden_plant_groups(id) ON DELETE SET NULL,
  source_event_id   UUID               REFERENCES flowgarden_events(id) ON DELETE SET NULL,
  title             TEXT               NOT NULL,
  body              TEXT               NOT NULL,
  rationale         TEXT,
  urgency           flowgarden_urgency NOT NULL DEFAULT 'medium',
  accepted          BOOLEAN,
  acted_on_event_id UUID               REFERENCES flowgarden_events(id) ON DELETE SET NULL,
  metadata          JSONB              DEFAULT '{}',
  created_at        TIMESTAMPTZ        DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        DEFAULT NOW()
);

-- 9. flowgarden_sensor_readings  (immutable — no updated_at)
CREATE TABLE flowgarden_sensor_readings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id   UUID        NOT NULL REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  zone_id     UUID        REFERENCES flowgarden_zones(id) ON DELETE SET NULL,
  sensor_type TEXT        NOT NULL,
  sensor_id   TEXT,
  value       DOUBLE PRECISION NOT NULL,
  unit        TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. flowgarden_memory_summaries
CREATE TABLE flowgarden_memory_summaries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  garden_id      UUID        REFERENCES flowgarden_gardens(id) ON DELETE CASCADE,
  plant_group_id UUID        REFERENCES flowgarden_plant_groups(id) ON DELETE CASCADE,
  summary_type   TEXT        NOT NULL,
  period_start   TIMESTAMPTZ,
  period_end     TIMESTAMPTZ,
  summary        TEXT        NOT NULL,
  event_count    INTEGER,
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 11. flowgarden_xp_log  (immutable — no updated_at)
CREATE TABLE flowgarden_xp_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES flowbond_users(id) ON DELETE CASCADE,
  source_task_id  UUID        REFERENCES flowgarden_tasks(id) ON DELETE SET NULL,
  source_event_id UUID        REFERENCES flowgarden_events(id) ON DELETE SET NULL,
  amount          INTEGER     NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- user_id on every table
CREATE INDEX flowgarden_profiles_user_id_idx           ON flowgarden_profiles           (user_id);
CREATE INDEX flowgarden_gardens_user_id_idx            ON flowgarden_gardens            (user_id);
CREATE INDEX flowgarden_zones_user_id_idx              ON flowgarden_zones              (user_id);
CREATE INDEX flowgarden_plant_groups_user_id_idx       ON flowgarden_plant_groups       (user_id);
CREATE INDEX flowgarden_plants_user_id_idx             ON flowgarden_plants             (user_id);
CREATE INDEX flowgarden_events_user_id_idx             ON flowgarden_events             (user_id);
CREATE INDEX flowgarden_tasks_user_id_idx              ON flowgarden_tasks              (user_id);
CREATE INDEX flowgarden_recommendations_user_id_idx    ON flowgarden_recommendations    (user_id);
CREATE INDEX flowgarden_sensor_readings_user_id_idx    ON flowgarden_sensor_readings    (user_id);
CREATE INDEX flowgarden_memory_summaries_user_id_idx   ON flowgarden_memory_summaries   (user_id);
CREATE INDEX flowgarden_xp_log_user_id_idx             ON flowgarden_xp_log             (user_id);

-- flowgarden_events hot paths
CREATE INDEX flowgarden_events_user_occurred_idx       ON flowgarden_events (user_id, occurred_at DESC);
CREATE INDEX flowgarden_events_plant_occurred_idx      ON flowgarden_events (plant_id, occurred_at DESC);
CREATE INDEX flowgarden_events_plant_group_occurred_idx ON flowgarden_events (plant_group_id, occurred_at DESC);
CREATE INDEX flowgarden_events_event_type_idx          ON flowgarden_events (event_type);
CREATE INDEX flowgarden_events_high_urgency_idx        ON flowgarden_events (urgency)
  WHERE urgency IN ('high', 'urgent');

-- flowgarden_tasks hot paths
CREATE INDEX flowgarden_tasks_user_status_due_idx      ON flowgarden_tasks (user_id, status, due_at);
CREATE INDEX flowgarden_tasks_pending_idx              ON flowgarden_tasks (status)
  WHERE status = 'pending';

-- flowgarden_sensor_readings
CREATE INDEX flowgarden_sensor_zone_type_time_idx      ON flowgarden_sensor_readings (zone_id, sensor_type, recorded_at DESC);

-- flowgarden_plant_groups / plants
CREATE INDEX flowgarden_plant_groups_garden_id_idx     ON flowgarden_plant_groups (garden_id);
CREATE INDEX flowgarden_plant_groups_zone_id_idx       ON flowgarden_plant_groups (zone_id);
CREATE INDEX flowgarden_plants_plant_group_id_idx      ON flowgarden_plants (plant_group_id);
CREATE INDEX flowgarden_plants_garden_id_idx           ON flowgarden_plants (garden_id);
CREATE INDEX flowgarden_plants_zone_id_idx             ON flowgarden_plants (zone_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION flowgarden_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS  (only on tables with updated_at)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_profiles
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_gardens
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_zones
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_plant_groups
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_plants
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_events
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_tasks
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_recommendations
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flowgarden_memory_summaries
  FOR EACH ROW EXECUTE FUNCTION flowgarden_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — ENABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE flowgarden_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_gardens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_zones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_plant_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_plants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_recommendations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_sensor_readings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_memory_summaries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowgarden_xp_log             ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- flowgarden_profiles
CREATE POLICY "own_select" ON flowgarden_profiles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_profiles FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_profiles FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_gardens
CREATE POLICY "own_select" ON flowgarden_gardens FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_gardens FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_gardens FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_gardens FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_zones
CREATE POLICY "own_select" ON flowgarden_zones FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_zones FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_zones FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_zones FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_plant_groups
CREATE POLICY "own_select" ON flowgarden_plant_groups FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_plant_groups FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_plant_groups FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_plant_groups FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_plants
CREATE POLICY "own_select" ON flowgarden_plants FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_plants FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_plants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_plants FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_events
CREATE POLICY "own_select" ON flowgarden_events FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_events FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_events FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_events FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_tasks
CREATE POLICY "own_select" ON flowgarden_tasks FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_tasks FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_tasks FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_recommendations
CREATE POLICY "own_select" ON flowgarden_recommendations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_recommendations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_recommendations FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_recommendations FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_sensor_readings
CREATE POLICY "own_select" ON flowgarden_sensor_readings FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_sensor_readings FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_sensor_readings FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_sensor_readings FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_memory_summaries
CREATE POLICY "own_select" ON flowgarden_memory_summaries FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_memory_summaries FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_memory_summaries FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_memory_summaries FOR DELETE
  USING (user_id = auth.uid());

-- flowgarden_xp_log
CREATE POLICY "own_select" ON flowgarden_xp_log FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON flowgarden_xp_log FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON flowgarden_xp_log FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON flowgarden_xp_log FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('flowgarden-photos', 'flowgarden-photos', false),
  ('flowgarden-voice',  'flowgarden-voice',  false)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE RLS POLICIES
-- Files are stored at {user_id}/{garden_id}/{filename}
-- The first path segment is always the owner's UUID.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "flowgarden_photos_own"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'flowgarden-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'flowgarden-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "flowgarden_voice_own"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'flowgarden-voice'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'flowgarden-voice'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run manually after migration to confirm all tables exist)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE 'flowgarden_%'
-- ORDER BY table_name;
--
-- Expected: 11 rows
--   flowgarden_events
--   flowgarden_gardens
--   flowgarden_memory_summaries
--   flowgarden_plant_groups
--   flowgarden_plants
--   flowgarden_profiles
--   flowgarden_recommendations
--   flowgarden_sensor_readings
--   flowgarden_tasks
--   flowgarden_xp_log
--   flowgarden_zones
