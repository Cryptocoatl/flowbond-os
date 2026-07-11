# FlowBond — Open Book
## Full Ecosystem Audit: Stack, Vision, Workflow & Compute Upgrade Map
*Prepared for infrastructure partnership conversation — Jeff Emmet · July 2026*

---

# PART I — VISION & THESIS

**FlowBond Tech Inc. is Layer 0 for the regenerative economy.** A B2B infrastructure company providing identity (FBID), non-custodial payments orchestration, privacy (ZK+ICP roadmap), AI tooling (ClauDIA), provenance (ORIGO), and onboarding infrastructure to independent consumer apps as paying clients.

The thesis: every regenerative/community platform (Planetary Party, Hypha, IXO, NetX State, ReGen Nodes, and dozens more) positions itself as an operating system — but **none have solved identity portability, fiat rails in LATAM, or onboarding**. FlowBond integrates at exactly three seams: **identity, money, and verified claims** — and lets everyone else keep their brand and stack.

The ecosystem spans digital infrastructure → physical hardware → land and community. One identity (FBID), one XP economy (per-app XP → FlowXP reserve), one provenance layer (ORIGO), many surfaces.

**Why this matters for a compute partnership:** FlowBond is not one AI product — it is ~25 products sharing one backbone, generating heterogeneous AI workloads (vision, voice, LLM agents, embeddings, video render, DSP, ZK). A shared GPU/server layer amortizes across all of them at once. One integration, ecosystem-wide leverage.

---

# PART II — THE ARCHITECTURAL SPINE

Everything below runs on the same disciplined foundation:

**Identity & data**
- **FBID** — unified identity hub: magic link, Google, Apple, wallet (SIWE/SIWS). Single entry point (`linkAuthOrCreateIdentity`). Supabase UUID *is* the FlowBond ID; wallets are attributes of identity, never the identity itself.
- **Canonical Supabase project** (`FlowBond-life`, us-east-2) — one Postgres serving all apps. Pattern A discipline: app-prefixed tables, FK root to `flowbond_users`, RLS deny-by-default on everything, all mutations via SECURITY DEFINER RPCs, append-only ledgers for XP/audit.
- **`@flowbond/sdk`** — the sole client boundary. Services never talk to services.
- **Privacy roadmap** — nullifier-based pseudonymity live today (public XP tier + AES-256-GCM private tier); Semaphore/zkVerify ZK proofs and ICP vetKeys planned.

**Edge, hosting & delivery**
- **Cloudflare** Pages + Workers + R2 — active migration from Vercel (phased: static → light APIs → heavy compute). R2 replacing Supabase Storage for media.
- **Monorepo**: `flowbondhq/flowbond-os` — Turborepo + pnpm, Next.js App Router, TypeScript strict.
- **Deploy law**: feature branch → `/test` → validation → production. Every project, no exceptions.

**Compliance posture (hard constraints, not preferences)**
- Non-custodial everywhere money moves (Ley Fintech). XP is non-redeemable in every app.
- Blockchain never on the critical UX path — always async.
- ORIGO provenance stamping (C2PA) on all AI-generated media at export.
- PII behind RLS + admin-only RPCs; ClauDIA observes through PII-free views only.

---

# PART III — FULL PRODUCT CATALOG

## A. Layer 0 Core (FlowBond's own products)

| Product | What it is | Status |
|---|---|---|
| **FBID** | Identity hub for the entire ecosystem | Production |
| **ClauDIA** | Multi-agent AI suite. Two deployments: internal chief-of-staff (privileged) + public interactive persona (sandboxed, voice via TTS) | Production, expanding |
| **FlowDesk** | Internal ops backend: project tracking, billing, assets, dev metrics (hours/tokens per project) | Production internal |
| **FlowScrow** | Conditional-release escrow/closing vault system (currently executing the co-founder separation) | Production |
| **FlowStock** | Event-sourced double-entry inventory with lot/expiry tracking, multi-brand (Heady Teddy's, SomaLab, Holy Honey) | Production |
| **ORIGO** | Human-authored content provenance: C2PA + Story Protocol + FBID Proof-of-Human + statutory registration (INDAUTOR/IMPI/SACM) | Production |
| **Investor data room** | Per-document gated access, Supabase analytics, orbital canvas UI | Live |

## B. Payments & Commerce Rails

| Product | What it is | Status |
|---|---|---|
| **FlowShare** | Compliance-first split payouts — never holds funds; Stripe Connect + Mercado Pago connected accounts. Pilots: FlowBond, BrandMark, Brandi Veil | Production |
| **kkash** | Sovereign non-custodial payment orchestration (non-IFPE): Mercado Pago + USDC/Circle + Mural Pay + Privy + Persona | Built |
| **PayMe Directory / PayMe Wallet** | Directory = no-custody, live path. Wallet = regulated, ring-fenced future entity | Directory live, Wallet deferred |
| **FlowOps** | B2B inventory/POS/anti-fraud SaaS; includes **FlowMe Audit** (privacy-first standalone audit tool) | Production |
| **BrandMark** | Dropship orchestration marketplace (isolated Supabase by design, joint venture) | Production |
| **Eco Tianguis** | Unified regenerative marketplace across FlowGarden + Reciprociudad + BrandMark | In build |
| **Wovenflow** | Women's commerce brand | Pending trademark clearance |
| **Holy Honey** | Product brand (3-way partnership) running on FlowStock/FlowOps rails | Active |

## C. AI & Media Production

| Product | What it is | Status |
|---|---|---|
| **FlowStudio** | Full video production pipeline, 3-tier privacy: Tier 0 local/private generation · Tier 1 cloud generation (fal.ai routing to Veo 3.1/Kling/Seedance cost ladder) + **programmatic beat-synced assembly via Remotion** + CapCut human finishing · Tier 2 DaVinci Resolve mastering. Includes `video_assets` registry, brand kits, job pipeline, cost metering | Production, expanding |
| **flowscribe** | Audio/video transcription & translation engine (local + API modes, SRT/VTT output) | Production |
| **FlowChords** | In-browser chord detection (FFT chromagram) + FastAPI backend follow-along tool | Built |
| **AstralFlow** | Astrology/Gene Keys engine — self-contained Meeus ephemeris, team-mapping tooling | Production |
| **Music/voice layer** | Suno-generated music + ElevenLabs voice integration (Love's own voice) feeding FlowStudio reels; ORIGO registration path for every track | Active |

## D. Land, Food & Regenerative Systems

| Product | What it is | Status |
|---|---|---|
| **FlowGarden** | **Moat product.** AI garden companion + IoT: ESP32-S3 sensor nodes, RPi5 gateway, RTSP camera vision, water control. Retail tiering: Sense (~$99–129) / Grow (~$199–249) / FlowGarden Pack (~$499–599). **Critical: software-only tier** — users with no hardware get the full AI guide via photos + voice, meaning *all* their inference runs server-side (vision analysis, Whisper transcription, LLM reasoning, 21-intent agent pipeline, per-plant memory, daily summaries) | Production build |
| **Reciprociudad** | Circular economy / barter & reciprocity network with Mesoamerican cosmovisión design; recycling points across Mexico & Guatemala | Live |
| **BAÑOSECO** | Regenerative dry-toilet game network (gamified eco-sanitation) | Deployed |
| **Sani Templo** | Sacred eco-sanitation brand — zero-water composting toilets for events/festivals (relationship to BAÑOSECO being resolved: sibling or umbrella) | Brand stage |
| **Huerto Roma Verde pilot** | Gamification + community points + eventual tokenization for CDMX's flagship urban garden (with Red Broom Software: Camino/Colectiva/Constanza/Garita integration) | Phased pilot |
| **Xelva** | Multi-vertical ReFi on Solana, Xelva Foundation A.C. (Mexican nonprofit) | In development |

## E. Civic Intelligence & Coordination

| Product | What it is | Status |
|---|---|---|
| **FlowMap** | Graph-based collective mapping engine: `unirse → misiones → semillero → siembra → red viva`. Nodes = personas/causas/organizaciones/soluciones/raíces; batch-transactional graph writes; projector mode; embeddable widget | Production |
| **Causas Globales** | FlowMap specialization for Huerto Roma Verde × Planetary Party's Bioregional Intelligence Protocol — 7-question survey → living graph, matchmaking directory (who can do what), readable by Fiesta Planetaria/IXO/Hypha/ReciproCiudad | Live |
| **Planetary Party integration** | FlowBond as identity/capital/intelligence backbone for federated bioregional network; revenue modeled at 2 → 10 → 50 bioregions | Strategic, active |
| **NetX State / ReGen Nodes** | Layer 0 integration for LATAM regenerative node network (events, conferences, regen global hubs): FBID namespaces per node, kkash payouts, ORIGO attribution, ZK governance voting, MiCelio connectivity | Partnership forming |

## F. Physical Edge: Hardware, Mesh & Mobility

| Product | What it is | Status |
|---|---|---|
| **FlowBand** | NFC/BLE wearable — NTAG 424 DNA (SUN/SDM), nRF52840 active tier, Ed25519 offline challenge-response. 50/50 JV with BrandMark for LATAM. Line A (passive silicone) ships first | Architected, JV signed |
| **NFKey** | Aliro-compatible smart-lock/access credential system | Specced |
| **MiCelio** | Sovereign mesh comms: Reticulum/LXMF, LoRa presence/text + WiFi HaLow local voice | Deployed (kai level) |
| **FlowNode** | Federated edge appliance (N.O.M.A.D. base, Apache 2.0): offline-first knowledge node with FlowBond Connector sidecar, FBID auth layer, ClauDIA/Ollama local AI brain, Brain/Relay/Beacon tiering, two-plane mesh (LoRa signals / WiFi content), hash-chained local ledger. **Hardware overlap already identified with ZKNet** | Scoped v1 |
| **ReFi Rides** | Regenerative mobility reborn asset-light: ride-share protocol layer for jungle/wild locations (Tulum, Bali, Hawaii), multi-vehicle roadmap, **plus certified regenerative courier network** — four-axis regen-scored deliveries (mobility, source, packaging, social), Seed→Guardian levels, token/NFT-gated tiers. Feeds the farmers-market delivery loop into FlowGarden/Eco Tianguis | Rebirth in build |

## G. Consumer Apps (FlowBond clients)

| App | What it is | Status |
|---|---|---|
| **danz.now (DANZ)** | Move-to-earn on Base. Full map: NFC/QR proof-of-presence → nullifier identity → XP ledger → missions engine → leaderboard → EAS attestations → $DANZ tokenomics (Phase 4). MUSE recognition batch allocated (Lea, Anastasia, Roman) | Rebuild in progress |
| **FlowNation / FLOW CDMX** | Multi-city events platform | Live |
| **MountainDogs.app** | Premium canine services, Buenos Aires (consulting cash bridge) | Live |
| **Guardianes del Flow** | Kai's bilingual 3D Mesoamerican game — Three.js PWA, multi-world archipelago, AI companion (Abuela Ceiba), educational layer | Live (kai.flowbond.life) |
| **Gorillae Gang / Caribbean Phoenix** | NFT collections (4,444 / 2,222) — community heritage layer, Tulum genesis | Minted / in production |

## H. Land & Sanctuary
- **Moon Temple** — 1-hectare Tulum parcel, three-way stewardship. The physical anchor where FlowNode/MiCelio/FlowGarden/Sani Templo converge as a living demo site.

## I. TulumCoin — The Origin Node (full-circle integration)

**What it is:** TulumCoin (tulumcoin.mx) is a DAO-governed community currency for the Tulum municipality, born in 2022 out of the Regen Tulum movement — the founding project that opened the door to the tokenized world for FlowBond's founder, and the most delicate project in the portfolio because it lives at the intersection of local community, municipality, and real businesses. Pre-launch tokens (TLMC) are earned through restorative actions — cleanups and regenerative events — spendable at participating local businesses or held in an EVM wallet until formal launch. A percentage of every transaction funds a community-voted regenerative projects fund. Token architecture explored to date: a fully-collateralized stable transaction token paired with a fair-launch reflection/share token.

**Why it's the full-circle piece:** In 2022, TulumCoin had the vision but not the infrastructure. In 2026, FlowBond *is* that infrastructure — every capability TulumCoin needed now exists as a production Layer 0 primitive:

| TulumCoin need (2022) | FlowBond primitive (2026) |
|---|---|
| Identity for residents, merchants, visitors | FBID — one identity, nullifier privacy, no new accounts |
| Proof of restorative action (cleanups, events) | DANZ proof-of-presence engine (NFC/QR check-in → append-only ledger), extended with AI photo-verification of completed actions |
| Pre-launch points without securities risk | XP economy pattern: TulumXP non-redeemable ledger first, token migration only when legal structure is validated — blockchain never on the critical UX path |
| Merchant acceptance & settlement | kkash + FlowShare non-custodial rails (Mercado Pago native — critical for real Tulum businesses), FlowOps POS/inventory for participating merchants |
| Community mapping & fund allocation | FlowMap: living graph of merchants, regen projects, causes; DAO voting on the regenerative fund — ZK quadratic voting on the privacy roadmap |
| Physical layer | FlowBand NFC at merchant checkout, FlowNode/MiCelio mesh across community points, Moon Temple as living demo site |
| Provenance of regen impact | ORIGO — verifiable claims of restoration work, readable by IXO-class impact finance |
| Sister economies | Reciprociudad (barter), Eco Tianguis (marketplace), ReFi Rides (regen mobility/delivery), Xelva/Tulum Circula (waste recovery) — all same identity, same XP grammar |

**Status & posture:** Pre-launch with an active community; the FlowBond-native app build has not started — it is the deliberately-saved piece. The sensitivity is real: municipality relationships, local merchant trust, and Ley Fintech compliance (community currency design must be reviewed by counsel before any redeemability exists). The build path mirrors the proven Huerto Roma Verde playbook: earning loop → off-chain points → soulbound recognition → token migration only when proven and legal. **The delicacy is the point — TulumCoin is where FlowBond demonstrates that Layer 0 can carry a real place-based economy, not just apps.**

**Known flag:** an unrelated real-estate investment token also markets itself under the "Tulum Coin (TLMC)" name with promised fixed returns — a naming collision that makes trademark clearance and clear brand differentiation a prerequisite of relaunch, and makes the compliance-clean, community-governed positioning even more important.

---

# PART IV — AI/COMPUTE WORKLOAD CENSUS
*The heart of this conversation: what runs, where it runs today, and what moves.*

## Continuous inference (24/7-class loads — best fit for dedicated GPUs)

| Workload | Today | On Jeff's servers |
|---|---|---|
| **FlowGarden AI tier** — vision plant analysis (photos + RTSP camera frames), Whisper voice transcription, LLM reasoning/recommendations, 21-intent classifier, per-plant/garden/user memory, daily summaries | OpenAI Vision + Whisper + Claude APIs, per-call | **Highest-value migration.** The software-only product tier means every non-hardware customer's entire experience = server-side inference. Open vision models (Qwen-VL class) + Whisper + open LLM on dedicated GPUs turn per-call cost into flat cost. This is what makes the free/cheap tier economically possible — and the free tier is the funnel to hardware sales |
| **ClauDIA working agents** — enrichment, matching, **grants radar**, **lead-gen agents** hunting opportunities/clients across the ecosystem | Hosted LLM APIs | Continuous, predictable, parallelizable — the canonical self-hosting case. Agents can run *more aggressively* when marginal inference is free (scan more sources, score more leads) |
| **FlowMap / Causas Globales intelligence** — embeddings over the civic graph (personas/causas/orgs/soluciones), matchmaking, node enrichment | Per-call embeddings | Always-on vector + graph compute; grows with every event (HRV, Planetary Party bioregions, NetX nodes) |
| **ClauDIA public voice** | ElevenLabs per-character | Open TTS self-hosted; A/B quality gate before switching the public persona |
| **flowscribe** | Local + OpenAI API modes | Whisper-class models self-hosted = unlimited transcription for FlowStudio, FlowMap events, ORIGO registration |

## Burst / batch loads (fill idle capacity)

| Workload | Today | On Jeff's servers |
|---|---|---|
| **FlowStudio — editing & assembly** (distinct from generation): Remotion programmatic beat-synced renders, FFmpeg encode/master pipelines, upscaling, interpolation, audio analysis for beat-sync | **Remotion render currently on fly.io — account flagged/frozen.** fal.ai spend ~$1/day and climbing | **Immediate, concrete migration.** The render farm is the piece that's actually broken today. Headless Remotion + FFmpeg on Jeff's hardware removes fly.io entirely and makes render cost zero-marginal |
| **FlowStudio — generation, partial**: open-video models as "rung zero" on the cost ladder | fal.ai (Veo/Kling/Seedance — proprietary, cannot move) | Open models (Wan/Hunyuan/LTX-class) self-hosted absorb drafts and low-tier jobs; ClauDIA's cost-gate routes up the ladder only when quality demands it |
| **ORIGO batch** — C2PA signing, provenance stamping, registration prep | Inline in pipelines | Scheduled CPU batch — ideal idle-capacity filler |
| **FlowChords backend** — FastAPI DSP | Not yet scaled | Containerize + host before it becomes a cost |
| **DANZ verification** — proof-of-presence validation, future movement anti-cheat models | Rule-based today | Future ML anti-cheat inference lands here |
| **FlowOps anti-fraud** | Rule-based | Future anomaly-detection models |

## Strategic / roadmap loads

| Workload | Horizon | Fit with Jeff |
|---|---|---|
| **ZK proving** — Semaphore/zkVerify proofs for private XP, governance voting (NetX/ReGen nodes quadratic voting) | Post-pilot | Direct convergence with ZKNet work — proving infrastructure is exactly his lane |
| **FlowNode AI brains** — Ollama-class local models on edge appliances, with Jeff's servers as the upstream "Brain tier" for heavy queries the edge can't answer | v1 scoped | Edge-cloud split: FlowNodes handle offline, escalate to partner compute |
| **MiCelio backbone** — Reticulum transport nodes hosted on his infra | Anytime | Zero-GPU, gives the mesh internet backhaul for free |
| **Game/immersive** — Guardianes multi-world expansion, dome/VR work, avatar generation for ReFi Rides | Ongoing | Asset generation + future real-time inference |
| **TulumCoin verification & governance** — AI photo-verification of restorative actions (anti-gaming for the earning loop), merchant-directory embeddings, ZK quadratic voting for the regenerative fund | Build not started (deliberately sequenced) | Vision inference for action verification is the same model class as FlowGarden's — one deployment serves both. Governance ZK proving converges with the ZKNet lane |

## What does NOT move — ever
- **The canonical Supabase project and FBID.** The identity layer is the trust root of everything above; it stays on managed, audited infrastructure with clear liability boundaries regardless of partnership depth.
- **Payment orchestration compliance surfaces** (Stripe/Mercado Pago/Circle touchpoints stay on licensed rails).
- **PII.** If user-adjacent data (photos of people's gardens, voice recordings, transcripts) routes to partner compute, it goes under a defined data-processing posture: inference-only, no retention, or anonymized/nullifier-keyed. This is a Jeff conversation item, not an afterthought.

---

# PART V — HOW WE BUILD (working workflow)

1. **Strategy + spec in Claude chat** → architectural decisions locked as ADRs, memory-anchored.
2. **Terminal build prompts** → comprehensive paste-ready documents executed by Claude Code Desktop at monorepo root, autonomous: inspect existing schema → additive migration → build → deploy `/test` → smoke tests → merge on validation.
3. **Supabase MCP** for live schema inspection and migrations against the canonical project. Additive-only, never destructive.
4. **ClauDIA internal** as chief-of-staff over FlowDesk (project tracking, hours, token metering per project).
5. **Human creative loop**: AI generation → Remotion assembly → CapCut finishing → DaVinci mastering → ORIGO stamp → distribute.
6. **Gene Keys / astro team mapping** as the operational framework for role assignment across collaborators.

This matters to Jeff because integration friction is low: everything is containerizable, every service already speaks HTTP/OpenAI-compatible patterns (FlowNode's Ollama handoff proved the pattern), and provider-agnostic abstraction layers are standard practice here (AI provider router in FlowGarden, on-ramp abstraction, wallet abstraction). **Swapping a hosted API for a self-hosted endpoint is a config change, not a rewrite.**

---

# PART VI — UPGRADE MAP (what "joining forces" unlocks)

**Efficiency upgrades (cost → zero-marginal):**
1. FlowGarden software-tier inference → makes the mass-market tier viable
2. ClauDIA agent fleet → agents run harder when inference is free (more leads, more grants found)
3. FlowStudio render farm → replaces broken fly.io path today
4. TTS + transcription self-hosting → kills two per-unit billing lines
5. Embeddings/vector everywhere → FlowMap, Eco Tianguis matching, lead scoring

**Capability upgrades (things we currently can't do at all):**
6. Continuous camera-stream analysis for FlowGarden (today we sample frames to control API cost; dedicated GPUs allow real monitoring)
7. Fine-tuning: a FlowGarden plant-health model on our own accumulated data; a ClauDIA voice/persona model; regen-scoring models for ReFi Rides
8. FlowNode Brain tier: partner compute as the upstream intelligence for the entire edge mesh
9. ZK proving at scale for the privacy roadmap + NetX governance

**Ecosystem upgrades (Jeff-specific):**
10. EIC Pathfinder consortium alignment — this infrastructure story strengthens the grant narrative (results expected October 2026; no conflicting agreements before then)
11. ZKNet × FlowNode hardware convergence — shared node hardware, shared proving layer
12. Jeff's compute becomes a service FlowBond can *resell* to Layer 0 clients (NetX nodes, Planetary Party bioregions) — infrastructure partner shares in B2B revenue, not just costs saved
13. **TulumCoin as the flagship proof** — a real place-based community currency running end-to-end on Layer 0 (identity → verified restorative action → merchant settlement → ZK-governed regen fund) is the strongest possible demonstration for the EIC narrative, the bioregional networks, and every future municipality conversation. Shared infrastructure makes the verification layer (AI photo-proof of cleanups) economically viable at community scale

---

# PART VII — STRUCTURE, PILOT & QUESTIONS

**Structure options** (start clean, deepen when earned):
- **A · Infrastructure provider** — compute at cost/cost-plus. Simple, reversible. Recommended start.
- **B · Advisor in-kind** — compute valued as advisor compensation (agreement + defined credit pool).
- **C · Deep partner** — joint infra entity or revenue share on the AI layer, potentially shaped by the EIC consortium outcome. Only after A proves reliability.

**90-day pilot (proposed):**
1. **Wk 1–2** — Migrate FlowStudio render farm (Remotion + FFmpeg) off fly.io. Concrete, urgent, low-risk. First win.
2. **Wk 3–4** — ClauDIA agent suite on open-weight models, shadow-run vs hosted APIs. TTS A/B by ear.
3. **Wk 5–8** — FlowGarden inference tier (vision + Whisper + reasoning) with data-posture agreement in place; FlowMap embeddings; FlowChords backend.
4. **Wk 9–12** — Open-video rung zero on FlowStudio ladder; measure escalation rate. flowscribe unlimited mode.
5. **Exit criteria:** ≥60% cost displacement on piloted workloads, uptime ≥ current providers, LATAM latency acceptable → structure conversation.

**Questions for Jeff:**
1. Hardware: GPU class, VRAM, count, egress, location(s), redundancy?
2. Ops: who's on-call — his team, or do we own it?
3. Data posture: can nullifier-keyed user data (garden photos, voice) touch his servers, or inference-only/no-retention?
4. Cost model: in-kind, at-cost, or commercial?
5. Relationship to EIC Pathfinder + ZKNet — same infra, same entity, or separate tracks?
6. Appetite for the ZK proving layer and FlowNode Brain tier as the deeper play?
7. Interest in the resale model — his compute powering FlowBond's B2B clients?

---

*Excluded by design: financials, cap table, corporate restructuring, separation details. Vision, stack, and workflow only — the open book of what we've built and where shared infrastructure multiplies it.*
