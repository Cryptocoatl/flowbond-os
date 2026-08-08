# Kai World — Build Plan, Budget & Path to Console / Monetization

> Honest planning doc. Numbers are **market ranges** (2026), meant for decisions
> and fundraising, not quotes. Author: ClaudIA, for Steph. Last updated 2026-07-20.

---

## 0. The one truth that shapes everything

There are **three different products** people conflate when they see the Kai World videos:

| | What it is | Looks like the videos? | Interactive? | Who can make it |
| --- | --- | --- | --- | --- |
| **AI cinematic** | Pre-rendered AI video (Higgsfield/Sora) | ✅ Yes | ❌ No (it's a movie) | Anyone, today, cheap |
| **Real-time web/mobile/VR** | A game running in a browser/phone/headset | ⚠️ Stylized or splat-photoreal, **not** identical | ✅ Yes | Us, now, low cost |
| **Console-grade AAA** | Unreal/Unity, ships to PS5/Xbox/PC | ✅ Closest to the videos, real-time | ✅ Yes | A funded studio, years |

**Real-time graphics are years behind pre-rendered.** No AI generates a playable
AAA game. So the strategy is: **build the real-time web game now (cheap, ours),
use it to get players + a pitch, then fund the AAA/console track.**

---

## 1. Three tracks (run in parallel, funded differently)

### Track A — Web / Mobile / VR real-time game *(what we're building)*
- Stack: Next.js + React Three Fiber + WebXR + the live `kai_` engine (already shipped).
- Fidelity: stylized-premium → splat-photoreal environments.
- **Cost: ~$0 build (ClaudIA) + hosting.** This is the engine of everything.

### Track B — Gaussian-Splat captured worlds *(the "wow", your unfair advantage)*
- Real places captured (drone/phone orbit) → photoreal 3D you can walk through in a browser.
- **Tevo is a drone cinematographer → this is a real edge most teams don't have.**
- Cost: capture time + a splat tool + storage. Low.

### Track C — Console / AAA (Unreal/Unity) *(the dream, needs funding)*
- A real studio: 3D artists, animators, engineers, a game designer, QA.
- The only path to true video-fidelity, real-time, on console.
- Cost: real money + years. This is what the plan/pitch raises for.

---

## 2. Phased roadmap

| Phase | Deliverable | Who builds | Tools | Cost | Time |
| --- | --- | --- | --- | --- | --- |
| **0 ✅ done** | Live `kai_` engine, Explore dashboard, `/play` first-person stylized world | ClaudIA | R3F, Supabase | ~$0 | done |
| **1 — Web MVP** | Real avatars (Ready Player Me), richer world, in-world missions wired to engine, deploy to a live link, mobile + VR | ClaudIA | R3F, RPM (free), Cloudflare | **$0–50 + ~$5–20/mo hosting** | 1–3 wks |
| **2 — First photoreal world** | Capture a real Valle Espejo (Tevo drone) → Gaussian splat → walkable in-app | ClaudIA + you capture | Luma/Polycam/Postshot, R2 storage | **$0–60/mo** | 1–2 wks after capture |
| **3 — Real game content** | Multiple worlds, rigged/animated characters, avatar creator, world-building tools, accounts (FBID), economy + first monetization | Small team (2–4) | R3F/Unity, Synty/Sketchfab assets, artists | **$60k–250k** | 3–6 mo |
| **4 — Console / AAA** | Unreal build, art team, PS5/Xbox/Switch port + certification | Studio (15–60+) | Unreal Engine, dev kits | **$1M–15M+** | 2–4 yrs |

Phases 0–2 are **essentially free** and produce a real, playable, *impressive*
product + the traction/story that funds Phase 3–4.

---

## 3. Real costs of the tools & services

**Cheap / now (Track A+B):**
- Ready Player Me avatars — **free** (paid tiers for custom branding later).
- Cloudflare Workers + Pages hosting — **~$5–20/mo**; R2 storage **~$0.015/GB/mo**.
- Higgsfield (concept art, UI, marketing stills/video) — **$26–$190** credit packs, as needed.
- Splat capture/processing — Luma AI (free tier), Polycam (~$18/mo), or self-host Postshot/nerfstudio (needs a GPU, ~$1–3/hr cloud). **~$0–60/mo.**
- Stylized 3D asset packs — Quaternius/Kenney (**free**), Synty (**$10–100/pack**), Sketchfab/marketplace.

**Team (Track C, when funded) — market freelance/salary ranges:**
- 3D environment artist: **$40–120/hr**; a hero world: **$3k–15k**.
- Character artist (rigged + animated): **$2k–8k per character**.
- Gameplay/3D engineer: **$70–160/hr** or **$100k–180k/yr**.
- Technical artist, animator, game designer, QA: similar bands.
- A **stylized cross-platform MVP with a small team, 3–6 mo: ~$60k–250k**.
- A **console-grade indie: $500k–$5M**; **AAA (video fidelity): $5M–$50M+**.

**Engine / platform fees (Track C):**
- Unreal Engine — free to use, **5% royalty** after $1M lifetime revenue per title.
- Unity — per-seat/subscription; check current terms at scale.
- Console dev programs (Sony/Microsoft/Nintendo) — application-gated; dev kits + certification; realistic only once you're a registered studio with a build.

---

## 4. Monetization — how Kai World actually makes money

Ordered by how realistic they are for *this* product:

1. **Free-to-play + cosmetics** — avatars, skins, world décor, guardian styles. Proven, non-predatory.
2. **Creator economy cut** — players build worlds/missions; platform takes a % of paid creations (ties to your FlowShare rails).
3. **Education / B2B licensing** — schools, regeneration NGOs, eco-brands license branded worlds + mission systems. *Your "learn/restore" thesis makes this real revenue, not a side note.*
4. **Sponsored worlds & impact partnerships** — a brand funds a real restoration mission mirrored in-world. On-brand, high-margin.
5. **Premium creator tools / pro tier** — advanced world-building, analytics, publishing.
6. **Real-world impact marketplace** — verified regeneration goods/experiences (you already have the verified-proof engine live).
7. **(Careful, later) digital land / collectibles** — only with legal counsel; easy to get wrong, reputationally + legally.

**Note:** #3 and #4 can generate revenue **before** the AAA game exists — the web
MVP + real impact engine is already a licensable B2B/education product.

---

## 5. Path to console (Track C), honestly

1. Prove traction with the free web MVP (players, retention, a wow splat world).
2. Build a pitch (this doc + a playable demo + the vision videos) → raise a seed round or grant (your impact/education angle opens grant money most games can't touch).
3. Stand up a small studio in Unreal; port the design + IP (not the code — engine differs).
4. Vertical slice → publisher/platform conversations → dev kits + certification.
5. Ship PC/console.

Timeline realistically **2–4 years and 7-figures** from funded start. The web
game is what earns the right to raise it.

---

## 6. Recommended next 30 days (all low/no cost, ours)

1. **Finish Phase 1 Web MVP** — RPM avatars, in-world mission flow, deploy `play.flowbond.life`, mobile + VR. *(ClaudIA, free.)*
2. **One drone capture with Tevo** → first photoreal splat world. *(Your capture + ClaudIA pipeline; ~$0–60.)*
3. **Wrap it into a pitch/demo** — playable link + videos + this plan → for grants/investors/partners.
4. In parallel, line up **1 education or eco-brand pilot** (Track A revenue that needs no console).

**Bottom line:** we can build something genuinely playable, beautiful, and
*monetizable at the B2B/education level* for **~$0–200/mo out of pocket**. The
console-fidelity dream is real but is a **funded, multi-year studio effort** —
and the free web game is exactly how we earn the funding to chase it.
