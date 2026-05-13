# FlowGarden

A privacy-first regenerative garden intelligence app, part of the FlowBond OS.

## Status: MVP — Manual-first, hardware-ready

## Quick Start

```bash
# From repo root
pnpm install
pnpm --filter @flowbond/flowgarden dev
# → http://localhost:3002
```

No database required. The app ships with rich mock seed data.

## Architecture

```
flowbond-os/
├── apps/flowgarden/          ← Next.js 15 app (port 3002)
│   ├── src/app/flowgarden/   ← Pages: dashboard, map, plants, journal, tasks, devices, settings
│   ├── src/app/api/flowgarden/ ← REST endpoints
│   └── src/lib/
│       ├── mock-data.ts      ← In-memory store with seed data
│       └── ai-garden.ts      ← AI stub functions (ready for Anthropic SDK)
│
├── packages/db/src/schema/
│   └── flowgarden.ts         ← Drizzle schema (all tables)
│
├── packages/core/src/types/
│   └── flowgarden.ts         ← Shared TypeScript types
│
└── packages/flowgarden-hardware/
    ├── src/types.ts           ← Hardware payload types
    ├── src/adapters/mock.ts   ← Mock sensor adapter
    └── README.md              ← Pi integration guide
```

## Pages

| Route | Description |
|-------|-------------|
| `/flowgarden` | Dashboard — stats, sensors, active missions, readings |
| `/flowgarden/map` | Garden zones/beds overview |
| `/flowgarden/plants` | All plants with status and growth tracking |
| `/flowgarden/journal` | Dated garden entries with observations |
| `/flowgarden/tasks` | Missions/tasks with priority, proof, points |
| `/flowgarden/devices` | Hardware devices and sensor readings table |
| `/flowgarden/settings` | Garden config, hardware, AI, FlowBond identity |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flowgarden/overview` | Dashboard stats |
| GET/POST | `/api/flowgarden/zones` | Garden zones |
| GET/POST | `/api/flowgarden/plants` | Plants (filter: `?zoneId=`) |
| GET/POST | `/api/flowgarden/journal` | Journal entries |
| GET/POST | `/api/flowgarden/tasks` | Tasks (filter: `?status=`, `?zoneId=`) |
| GET/POST | `/api/flowgarden/devices` | Hardware devices |
| GET/POST | `/api/flowgarden/sensor-readings` | Readings (filter: `?zoneId=`, `?type=`) |
| GET/POST | `/api/flowgarden/camera-captures` | Camera captures |
| GET/POST | `/api/flowgarden/automation-rules` | Automation rules |
| POST | `/api/flowgarden/ingest/mock-sensor` | Hardware ingestion endpoint |

## Database

The Drizzle schema is defined in `packages/db/src/schema/flowgarden.ts`.

### Tables

- `garden_zones` — beds, locations, soil, irrigation
- `plants` — profiles, status, dates, zone relation
- `journal_entries` — dated observations with metadata
- `garden_tasks` — missions, priority, proof, points
- `devices` — hardware devices with status
- `sensor_readings` — timestamped readings from any source
- `camera_captures` — image records with AI placeholder
- `automation_rules` — trigger → action rules

### To migrate

```bash
# Generate SQL migration
pnpm --filter @flowbond/db db:generate

# Apply to Supabase
pnpm --filter @flowbond/db db:migrate
```

Requires `DATABASE_URL` in `apps/flowgarden/.env.local`.

### To switch from mock to DB

1. Set `DATABASE_URL` in `.env.local`
2. Run migrations
3. Replace `import { store } from '@/lib/mock-data'` in each route/page with Drizzle queries using `getDb()` from `@flowbond/db`

The schema and type system are already aligned — it's a drop-in swap.

## AI Features (Stubs)

All AI functions are in `apps/flowgarden/src/lib/ai-garden.ts`.

| Function | Returns |
|----------|---------|
| `generateGardenSummary(gardenId?)` | `GardenAISummary` |
| `analyzePlantPhoto(url, plantId)` | `PlantDiagnosis` |
| `suggestWateringTasks(zoneId)` | `WateringRecommendation` |
| `detectPestRisk(zoneId)` | `{ risk, notes }` |

To activate: add `ANTHROPIC_API_KEY` to `.env.local` and replace the mock returns with real `anthropic.messages.create()` calls. The `@flowbond/ai` package already has the Anthropic client set up.

## Hardware Integration

See `packages/flowgarden-hardware/README.md` for the full guide.

**Test without hardware right now:**

```bash
curl -X POST http://localhost:3002/api/flowgarden/ingest/mock-sensor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "garden-pi-001",
    "garden_zone_id": "zone-001",
    "readings": [
      {"type": "soil_moisture", "value": 42, "unit": "%"},
      {"type": "temperature", "value": 26, "unit": "°C"}
    ],
    "recorded_at": "2025-05-11T10:00:00Z",
    "source": "mock"
  }'
```

## FlowBond Identity

Every major entity includes `userId`, `gardenId`, `householdId` fields (nullable).
These are pre-wired to accept FlowBond identity tokens once the identity layer is connected.

When integrating with FlowBond ID:
1. Add middleware to extract identity from session/JWT
2. Filter all DB queries by `userId` or `gardenId`
3. The schema already has the columns — just start populating them

## TODO — Next Steps

### Immediate (to complete MVP)

- [ ] Wire up `+ New Zone` / `+ Add Plant` / `+ New Entry` buttons with forms
- [ ] Add plant detail page `/flowgarden/plants/[id]`
- [ ] Add zone detail page `/flowgarden/map/[slug]`
- [ ] Add journal entry creation form with rich fields
- [ ] Add task completion action (click checkbox to mark done)
- [ ] Image upload for plants, zones, journal entries (Vercel Blob or Supabase Storage)

### Database

- [ ] Run Drizzle migrations against Supabase
- [ ] Replace mock data reads with real DB queries in each route
- [ ] Add seed script for dev DB (`packages/db/src/seed/flowgarden.ts`)
- [ ] Add soft-delete (`deleted_at`) to major tables

### Hardware

- [ ] Deploy Pi Python script in `packages/flowgarden-hardware`
- [ ] Test real sensor readings via ingest endpoint
- [ ] Add authentication token to ingest endpoint
- [ ] Wire automation rule evaluation (cron or webhook trigger)
- [ ] Live sensor dashboard with polling or SSE updates

### AI

- [ ] Swap AI stubs for real Anthropic calls
- [ ] Add AI summary card to dashboard (weekly)
- [ ] Plant photo diagnosis on plant detail page
- [ ] AI mission generation from garden state
- [ ] Pest risk alert via journal analysis

### FlowBond Integration

- [ ] Add FlowBond auth middleware
- [ ] Filter data by `identity_id` / `garden_id`
- [ ] Cross-app data sharing (FlowBond identity → FlowGarden)
- [ ] Privacy controls per data type

### UI Polish

- [ ] Mobile navigation (hamburger or bottom nav)
- [ ] Dark mode
- [ ] Interactive garden map (drag-and-drop bed layout)
- [ ] Real-time sensor charts (recharts or lightweight alternative)
- [ ] Photo gallery per zone/plant
