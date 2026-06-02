-- FlowBond OPS Dashboard Schema
-- Apply to: fgsrcxxccdjqyrpkitmk (FlowBond-life Supabase)

-- =====================
-- PROJECTS
-- =====================
CREATE TABLE IF NOT EXISTS ops_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('planning','active','live','paused','archived')),
  phase text,
  description text,
  icon text DEFAULT '◆',
  color text DEFAULT '#7c3aed',
  url_live text,
  url_github text,
  url_local text,
  url_vercel text,
  tech_stack text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- TASKS
-- =====================
CREATE TABLE IF NOT EXISTS ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES ops_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','blocked','done')),
  priority text DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  notes text,
  due_date date,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- PEOPLE
-- =====================
CREATE TABLE IF NOT EXISTS ops_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  whatsapp text,
  role text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- PROJECT <-> PEOPLE (many-to-many)
-- =====================
CREATE TABLE IF NOT EXISTS ops_project_people (
  project_id uuid REFERENCES ops_projects(id) ON DELETE CASCADE,
  person_id uuid REFERENCES ops_people(id) ON DELETE CASCADE,
  role text,
  PRIMARY KEY (project_id, person_id)
);

-- =====================
-- CONTRACTS
-- =====================
CREATE TABLE IF NOT EXISTS ops_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES ops_projects(id) ON DELETE SET NULL,
  person_id uuid REFERENCES ops_people(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','active','completed','cancelled')),
  value_usd numeric(10,2),
  currency text DEFAULT 'USD',
  notes text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- RLS: private tables, only service role or authenticated steph
-- =====================
ALTER TABLE ops_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_project_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_contracts ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by server actions)
CREATE POLICY "service role all ops_projects" ON ops_projects FOR ALL USING (true);
CREATE POLICY "service role all ops_tasks" ON ops_tasks FOR ALL USING (true);
CREATE POLICY "service role all ops_people" ON ops_people FOR ALL USING (true);
CREATE POLICY "service role all ops_project_people" ON ops_project_people FOR ALL USING (true);
CREATE POLICY "service role all ops_contracts" ON ops_contracts FOR ALL USING (true);

-- =====================
-- SEED: PROJECTS
-- =====================
INSERT INTO ops_projects (name, slug, status, phase, description, icon, color, url_live, url_github, url_local, tech_stack, sort_order, notes) VALUES
  ('FlowBond OS', 'flowbond-os', 'active', 'building', 'Core monorepo — Hono API + FlowMe agent + Next.js apps. The operating system for all FlowBond products.', '⚡', '#7c3aed', null, 'https://github.com/FlowBond-HQ', '~/Projects/flowbond-os', ARRAY['Turborepo','pnpm','Next.js 15','Hono','Drizzle','PostgreSQL','Anthropic'], 0, 'Foundation layer for all other apps. FlowMe WhatsApp agent lives here.'),
  ('FlowBond.life', 'flowbond-life', 'live', 'production', 'Layer 0 identity protocol — one @handle across all chains. Landing + waitlist live.', '🌐', '#6366f1', 'https://flowbond.life', 'https://github.com/FlowBond-HQ/FlowBond-Layer0', '~/Projects/flowbond-life', ARRAY['Next.js 15','Supabase','Reown AppKit','wagmi','Tailwind'], 1, 'Auth loop complete. Next: seed missions, privacy page, wallet_connections Phase 2. Reown Project ID needed.'),
  ('FlowGarden', 'flowgarden', 'active', 'mvp', 'Regenerative garden intelligence — sensor data, zones, plants, journal. Hardware-ready MVP.', '🌿', '#16a34a', null, null, '~/Projects/flowbond-os/apps/flowgarden', ARRAY['Next.js 15','Drizzle','Raspberry Pi','Anthropic'], 2, 'Mock data live. Next: wire form buttons, run Drizzle migrations, connect Anthropic API, deploy Pi script.'),
  ('DANZ.NOW', 'danz-now', 'paused', 'building', 'Dance + connection platform. Biometric HeartSync verification at real events. XP economy.', '💃', '#c026d3', 'https://danz-now.vercel.app', null, '~/Projects/DANZ/Code/danz-now', ARRAY['Next.js 16','Supabase','Drizzle','Hono','Oura','Whoop','Fitbit'], 3, 'PAUSED — resuming after FlowGarden solid. Auth redirect blocked: need to whitelist danz-now.vercel.app in Supabase fgsrcxxccdjqyrpkitmk redirect URLs.'),
  ('Mountain Dogs', 'mountain-dogs', 'live', 'production', 'Dog walking app for Sol Perez Castro — Buenos Aires. Paseadores: Tevo and Belu.', '🐕', '#0ea5e9', 'https://mountaindogs.app', 'https://github.com/Cryptocoatl/mountaindogs-app', '~/Downloads/mountaindogs-app', ARRAY['Next.js 14','Supabase','Vercel','Leaflet','Framer Motion'], 4, 'Admin panel live. Next: MercadoPago integration, push notifications to paseadores, owner turno history, approve-submission flow.'),
  ('MOHE', 'mohe', 'active', 'planning', 'Ministry of Human Empowerment — PMA faith-based org. Cavino Founder. Multi-team PR workflow.', '✨', '#f59e0b', null, 'https://github.com/Ministry-Of-Human-Empowerment', '~/Projects/mohe-web', ARRAY['Next.js','Supabase','Reown AppKit'], 5, 'Multi-person team. Branch protection + PR reviews required. Auth = Reown + Supabase.'),
  ('Xelva', 'xelva', 'live', 'production', 'Gorillae NFT OG verification. Solana on-chain identity. Regenerative projects network.', '🦍', '#10b981', 'https://xelva.live', null, '~/Developer/xelva-life', ARRAY['Next.js 14','Privy','Supabase','Helius DAS','Solana'], 6, 'OG verification flow live. Privy auth (exception — this project predates Reown decision).')
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- SEED: PEOPLE
-- =====================
INSERT INTO ops_people (name, email, whatsapp, role, notes) VALUES
  ('Steph Ferrera', 'cryptocoatl101@gmail.com', null, 'architect', 'Owner / main builder across all projects. GitHub: cryptocoatl'),
  ('Sol Perez Castro', 'sol@mountaindogs.app', null, 'client', 'Owner of Mountain Dogs Buenos Aires dog walking service'),
  ('Tevo', 'tevo@mountaindogs.app', null, 'collaborator', 'Paseador at Mountain Dogs'),
  ('Belu', 'belu@mountaindogs.app', null, 'collaborator', 'Paseador at Mountain Dogs'),
  ('Cavino', null, null, 'founder', 'Founder of MOHE (Ministry of Human Empowerment)')
ON CONFLICT DO NOTHING;

-- =====================
-- SEED: TASKS (next steps per project)
-- =====================

-- FlowBond.life tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'flowbond-life')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'Get Reown Project ID from cloud.reown.com → .env.local + Vercel', 'todo', 'high', 0),
  ((SELECT id FROM p), 'Seed missions table in Supabase (dashboard shows real missions)', 'todo', 'high', 1),
  ((SELECT id FROM p), 'Build /dashboard/privacy page (consent grants UI)', 'todo', 'medium', 2),
  ((SELECT id FROM p), 'Verify Supabase schema 001_flowbond_layer0.sql is deployed', 'todo', 'high', 3);

-- FlowGarden tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'flowgarden')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'Wire form buttons (New Zone, Add Plant, etc.)', 'todo', 'high', 0),
  ((SELECT id FROM p), 'Run Drizzle migrations against Supabase (activate real DB)', 'todo', 'high', 1),
  ((SELECT id FROM p), 'Connect Anthropic API key for AI garden features', 'todo', 'medium', 2),
  ((SELECT id FROM p), 'Deploy Pi Python ingest script + test real sensor data', 'todo', 'medium', 3),
  ((SELECT id FROM p), 'Add FlowBond identity auth middleware', 'todo', 'low', 4);

-- DANZ.NOW tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'danz-now')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'Fix Supabase auth redirect: whitelist danz-now.vercel.app in fgsrcxxccdjqyrpkitmk', 'blocked', 'critical', 0),
  ((SELECT id FROM p), 'Wire Hono API auth middleware (Supabase JWT verification)', 'todo', 'high', 1),
  ((SELECT id FROM p), 'Build event creation flow for organizers', 'todo', 'medium', 2),
  ((SELECT id FROM p), 'Seed a real test event in Supabase', 'todo', 'medium', 3),
  ((SELECT id FROM p), 'Deploy Hono API to Railway or Fly.io', 'todo', 'medium', 4);

-- Mountain Dogs tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'mountain-dogs')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'MercadoPago payment integration', 'todo', 'high', 0),
  ((SELECT id FROM p), 'Push notifications to paseadores on new turno assignment', 'todo', 'high', 1),
  ((SELECT id FROM p), 'Owner portal: turno history + upcoming walks view', 'todo', 'medium', 2),
  ((SELECT id FROM p), 'Admin submissions: Aprobar + crear cuenta button', 'todo', 'medium', 3),
  ((SELECT id FROM p), 'Confirm admin.mountaindogs.app DNS propagated', 'todo', 'low', 4);

-- FlowBond OS tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'flowbond-os')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'FlowMe: wire Telegram adapter (MessagingAdapter pattern)', 'todo', 'medium', 0),
  ((SELECT id FROM p), 'Auth: finalize Reown AppKit integration across all apps', 'todo', 'high', 1);

-- MOHE tasks
WITH p AS (SELECT id FROM ops_projects WHERE slug = 'mohe')
INSERT INTO ops_tasks (project_id, title, status, priority, sort_order) VALUES
  ((SELECT id FROM p), 'Set up branch protection + required reviews on main', 'todo', 'high', 0),
  ((SELECT id FROM p), 'Define membership tiers and access model', 'todo', 'high', 1),
  ((SELECT id FROM p), 'Set up CI/CD pipeline', 'todo', 'medium', 2);

-- =====================
-- SEED: PROJECT_PEOPLE
-- =====================
INSERT INTO ops_project_people (project_id, person_id, role)
SELECT p.id, pe.id, 'owner'
FROM ops_projects p, ops_people pe
WHERE p.slug IN ('flowbond-os','flowbond-life','flowgarden','danz-now','xelva','mohe')
  AND pe.name = 'Steph Ferrera'
ON CONFLICT DO NOTHING;

INSERT INTO ops_project_people (project_id, person_id, role)
SELECT p.id, pe.id, 'paseador'
FROM ops_projects p, ops_people pe
WHERE p.slug = 'mountain-dogs' AND pe.name IN ('Sol Perez Castro','Tevo','Belu')
ON CONFLICT DO NOTHING;

INSERT INTO ops_project_people (project_id, person_id, role)
SELECT p.id, pe.id, 'founder'
FROM ops_projects p, ops_people pe
WHERE p.slug = 'mohe' AND pe.name = 'Cavino'
ON CONFLICT DO NOTHING;
