-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 004_flowedit_init.sql
-- Date      : 2026-05-23
-- Purpose   : FlowEdit multi-tenant visual CMS layer
--             4 enums · 4 tables · indexes · RLS · seed data
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE flowedit_approval_mode AS ENUM ('auto', 'review', 'admin_only');
CREATE TYPE flowedit_status        AS ENUM ('draft', 'pending', 'approved', 'rejected', 'live');
CREATE TYPE flowedit_tier          AS ENUM ('simple', 'ai', 'agent');
CREATE TYPE flowedit_role          AS ENUM ('viewer', 'editor', 'approver', 'admin');


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- Order matters: sites → change_requests → content_overrides → site_members
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE flowedit_sites (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  domain        TEXT,
  approval_mode flowedit_approval_mode NOT NULL DEFAULT 'review',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flowedit_change_requests (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id     TEXT        NOT NULL REFERENCES flowedit_sites(id) ON DELETE CASCADE,
  title       TEXT,
  status      flowedit_status NOT NULL DEFAULT 'draft',
  github_pr   TEXT,
  preview_url TEXT,
  created_by  TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flowedit_content_overrides (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id           TEXT        NOT NULL REFERENCES flowedit_sites(id) ON DELETE CASCADE,
  change_request_id TEXT        REFERENCES flowedit_change_requests(id) ON DELETE SET NULL,
  path              TEXT        NOT NULL,   -- e.g. 'homepage/hero/title'
  field             TEXT        NOT NULL,   -- 'text' | 'src' | 'href' | 'style' | 'alt'
  value             JSONB       NOT NULL,   -- { text: "..." } or { src: "...", alt: "..." }
  status            flowedit_status NOT NULL DEFAULT 'draft',
  tier              flowedit_tier   NOT NULL DEFAULT 'simple',
  version           INTEGER     NOT NULL DEFAULT 1,
  created_by        TEXT,
  approved_by       TEXT,
  change_note       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ
);

CREATE TABLE flowedit_site_members (
  site_id    TEXT          NOT NULL REFERENCES flowedit_sites(id) ON DELETE CASCADE,
  user_id    TEXT          NOT NULL,
  role       flowedit_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (site_id, user_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Hot path: SDK fetches live content for a site on every page load
CREATE INDEX idx_fe_overrides_site_live
  ON flowedit_content_overrides (site_id, status)
  WHERE status = 'live';

-- Hot path: resolving a specific path+field during rendering
CREATE INDEX idx_fe_overrides_path
  ON flowedit_content_overrides (site_id, path, field);

-- Dashboard: change queue per site
CREATE INDEX idx_fe_change_requests_site_status
  ON flowedit_change_requests (site_id, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE flowedit_sites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowedit_change_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowedit_content_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowedit_site_members      ENABLE ROW LEVEL SECURITY;

-- Service role (used by the Hono API) has full access to everything
CREATE POLICY "service_all_sites"      ON flowedit_sites             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_changes"    ON flowedit_change_requests   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_overrides"  ON flowedit_content_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_members"    ON flowedit_site_members      FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public (anon) can read live content — used by the SDK on client-facing sites
CREATE POLICY "public_read_live_overrides"
  ON flowedit_content_overrides
  FOR SELECT TO anon
  USING (status = 'live');


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Register all active FlowBond sites
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO flowedit_sites (slug, name, domain, approval_mode) VALUES
  ('mountain-dogs',   'Mountain Dogs',                  'mountaindogs.app',  'review'),
  ('mohe',            'Ministry of Human Empowerment',  NULL,                'admin_only'),
  ('flowbond-life',   'FlowBond.life',                  'flowbond.life',     'review'),
  ('flow-cdmx',       'Flow CDMX',                      NULL,                'review'),
  ('honey-madhoney',  'Honey Madhoney',                 NULL,                'review');
