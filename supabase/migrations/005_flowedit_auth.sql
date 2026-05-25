-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 005_flowedit_auth.sql
-- Date      : 2026-05-23
-- Purpose   : FlowEdit admin users + per-site membership
--             Users are global; membership scopes them to specific sites.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE flowedit_users (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flowedit_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_users" ON flowedit_users FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- Drop and recreate flowedit_site_members to reference flowedit_users.id
-- (previously user_id was a free TEXT field, now it's a foreign key)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS flowedit_site_members;

CREATE TABLE flowedit_site_members (
  site_id    TEXT          NOT NULL REFERENCES flowedit_sites(id)  ON DELETE CASCADE,
  user_id    TEXT          NOT NULL REFERENCES flowedit_users(id)  ON DELETE CASCADE,
  role       flowedit_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (site_id, user_id)
);

ALTER TABLE flowedit_site_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_members" ON flowedit_site_members FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Initial admin users (password = 'Pass4u' for all)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO flowedit_users (id, email, name, password_hash) VALUES
  ('usr_steph',    'steph@flownation.world',    'Steph Ferrera', '$2b$10$MUR.bQg0CsQfj5lK5OZBTeVj2rMf21HqIIeJvWzY.IOWAZa7OS35m'),
  ('usr_michelle', 'michelle@flownation.world', 'Michelle',      '$2b$10$WNtTG1IYGAteZNF8ad9IiuNoOb8.nRak9UzGrODyI2cz7po.Tcg56');


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Assign both admins to every FlowBond site
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO flowedit_site_members (site_id, user_id, role)
SELECT s.id, u.id, 'admin'
FROM   flowedit_sites s
CROSS  JOIN flowedit_users u;
