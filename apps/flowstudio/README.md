# FlowStudio · AI Video Edit module

Song + brief → **beat-synced 9:16 reel** → human finishing (CapCut/DaVinci) → **provenance on Origo**.

This is the **v1 runnable core (L1–L3)**: real generation, real beat analysis, real
assembly. Provenance (C2PA/Origo) and the CapCut/DaVinci handoff are wired as
best-effort / export steps — they degrade to warnings, never block a render.

## Layers

| Layer | What | Status in v1 |
|---|---|---|
| **L1 generation** | `providers/` — fal.ai primary (Kling/Veo/Seedance via one key); Veo/Runway direct optional | ✅ runnable (needs `FAL_KEY`) |
| **L2 beat** | `beat/` — librosa sidecar → beat map JSON (BPM, downbeats, sections) | ✅ runnable (needs `python3` + librosa) |
| **L3 assembly** | `assembly/` — **FFmpeg**, cuts on downbeats, 9:16. Remotion = deferred seam (`Reel.tsx`) | ✅ runnable (needs `ffmpeg`) |
| **L4 finishing** | CapCut GUI — human only (no timeline API). `handoff/export.ts` builds the package | ✅ export |
| **L5 mastering** | DaVinci Resolve — human only. Same handoff package | ✅ export |
| **L6 provenance** | `provenance/` — honest C2PA labeling + Origo IP registration (Story Protocol behind Origo's API) | 🟠 best-effort (needs Origo keys) |

## Setup

```bash
./scripts/setup-edit.sh          # installs deps, writes .env.local, pings providers from the terminal
```

Or manually: `cp apps/flowstudio/.env.local.example apps/flowstudio/.env.local`, set `FAL_KEY`,
ensure `ffmpeg` and `python3` + `pip install librosa numpy soundfile` are present.

## Run a job

```bash
# CLI (no web server):
pnpm --filter @flowbond/flowstudio edit:run -- src/modules/edit/jobs/este-mundial.json

# or via the app:
pnpm --filter @flowbond/flowstudio dev          # http://localhost:3014
curl -X POST localhost:3014/api/edit/run -H 'content-type: application/json' \
  --data @apps/flowstudio/src/modules/edit/jobs/este-mundial.json
```

Outputs land under `~/FlowStudio/20_projects/<author>--<title>/` (override with `FLOWSTUDIO_ROOT`),
per `~/FlowStudio/RULES.md`: `renders/` (reel + hook variants), `handoff/` (CapCut/DaVinci package),
`gen/` (source clips), and a `*.c2pa.json` provenance sidecar.

## Gate-0 — verified 2026-06-19 (re-check before shipping)

Model slugs and SDKs move fast. Findings at build time:

- **fal.ai** — one key covers Kling 3.0 / Veo 3.1 / Seedance 2.0. ⚠️ **Slugs in
  `models.ts` are UNVERIFIED** — the fal model page 404'd on automated fetch.
  Confirm each at <https://fal.ai/models> and edit `models.ts` (the single source).
- **Veo direct** — `@google/genai`, `ai.models.generateVideos({ model: 'veo-3.1-generate-preview' })`,
  poll via `getVideosOperation`. ✅ Install only when 48kHz synced dialogue is needed.
- **Runway** — `@runwayml/sdk`, reads `RUNWAYML_API_SECRET`, model `gen4_turbo` (bump to Gen-4.5 when GA). ✅
- **Story Protocol** — `@story-protocol/core-sdk` (1.3.x beta). Registration runs **server-side in Origo**, not here.
- **Remotion** — for-profit (FlowBond) needs a **paid company license**: ~$25/seat/mo, **$100/mo or $1000/yr minimum**.
  Free for dev. **Deferred in v1** in favor of FFmpeg; seam kept in `assembly/Reel.tsx`.
- **Sora 2** — dead (API shutdown). Not used. **CapCut** — no timeline API; human GUI step only.

## Privacy (RULES.md)

- **Tier 0** (private/client/FBID/unreleased) jobs are **refused** for cloud generation — `runEdit` throws.
- This job (`este-mundial`) is **Tier 1** (public-by-design marketing). Treat cloud output as published on upload.
- Provenance labeling is **honest**: human direction + AI-assisted. Never "100% human".
