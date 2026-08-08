# Códice Vivo — Build Spec & Deployment Guide

Target: `https://themayanexperience.flowme.one/codiceVivo`
Stack rule: **Cloudflare only** (Pages + Workers + R2 + DNS). Never Vercel.
Status: v1 single-file site delivered (`index.html`). This doc covers deployment, the asset pipeline, and the master prompt to scale it.

---

## 1. Deployment (Cloudflare Pages)

**Project:** `codice-vivo` under the FlowBond Cloudflare account (flowme.one zone).

Structure the Pages project so the path is exactly `/codiceVivo`:

```
codice-vivo/
├── codiceVivo/
│   └── index.html        ← the delivered file
├── _headers              ← security + cache headers
└── _redirects            ← root redirect
```

`_redirects`:
```
/            /codiceVivo/   302
/codicevivo/*  /codiceVivo/:splat  301
```

`_headers`:
```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/codiceVivo/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Deploy:**
```bash
npx wrangler pages project create codice-vivo
npx wrangler pages deploy . --project-name=codice-vivo --branch=test    # → /test validation
npx wrangler pages deploy . --project-name=codice-vivo --branch=main    # → production
```

**Domain:** In the flowme.one zone: add custom domain `themayanexperience.flowme.one` to the Pages project (Pages → Custom domains). Cloudflare creates the CNAME automatically since the zone is on the same account. Standard flow: feature branch → `/test` → validation → production.

**Repo placement:** `Cryptocoatl/flowbond-os` monorepo → `apps/codice-vivo/` (static app, no build step for v1). When it grows past a single file, promote to Astro (static output) — still Pages.

---

## 2. Asset pipeline (fal.ai → R2)

Three placeholder slots ship as pure CSS atmosphere, each tagged in the HTML:

| Slot tag | Scene | Format |
|---|---|---|
| `dome_interior_01` | Fulldome interior, audience silhouettes under a projected night sky | 2560×1440 WebP + 1280 mobile |
| `cenote_light_01` | Shaft of light entering a cenote, turquoise water, no people | 2560×1440 WebP + 1280 mobile |
| `selva_canopy_01` | Jungle canopy from below, dawn mist, green-gold light | 2560×1440 WebP + 1280 mobile |

**Generation briefs (fal.ai, cost-ladder rule applies — all calls through ClauDIA spend gate, nothing hits paid APIs directly):**

- `dome_interior_01` — "interior of a planetarium fulldome, audience silhouettes seated below, projected star field in deep indigo with faint gold nebula, cinematic, volumetric light, no text, no symbols, photoreal, 16:9"
- `cenote_light_01` — "a single beam of golden light entering a dark cenote from above, turquoise water, limestone walls, mist, cinematic, photoreal, no people, no carvings, 16:9"
- `selva_canopy_01` — "tropical jungle canopy seen from the forest floor at dawn, mist, green and gold light rays, cinematic, photoreal, no ruins, no structures, 16:9"

**HARD CONTENT RULE (non-negotiable):** No Maya glyphs, codex reproductions, pyramids, ceremonial objects, deities, textiles, or any cultural iconography in generated assets — negative-prompt them explicitly ("no glyphs, no hieroglyphs, no carvings, no ruins, no indigenous symbols"). Atmosphere only. Cultural visuals enter the site exclusively through the Códice Vivo pipeline itself: consented, C2PA-signed, credited. This rule is part of the story the site tells — do not break it for a prettier hero.

Store finals in R2 bucket `codice-vivo-assets`, serve via the Pages project. Swap each `.vision-bg` CSS background for a `<picture>` element with the WebP pair; keep the gradient as the loading fallback.

---

## 3. i18n

v1 ships EN/ES via paired `<span class="en">/<span class="es">` with a body-class toggle, `?lang=es` deep link, and browser-language auto-detect. Rules:

- English and Spanish are peers, never machine-mirrored — Steph reviews all ES copy.
- Maya-language text (Yucatec, K'ichee') enters only after review by Maya advisors (Josué Maychi / Dafne Calderón pathway). No exceptions, including single words. When approved, add as a third toggle (`YUA`).
- On migration to Astro: move to content collections with `en/`, `es/` locale folders; the URL scheme becomes `/codiceVivo` (EN) and `/codiceVivo/es`.

---

## 4. Content governance

- No FlowBond branding, no founder names on the public page — the steward role stays functional ("the weaver & the rails").
- No revenue percentages published until benefit agreements are signed by communities.
- Any claim about specific communities, advisors, or institutions requires their written OK before it appears.
- Once the Consejo Maya exists, it holds pre-publish review over this page like any other cultural surface.
- Legal pass by Luis Javier (MX) + Guatemala counsel before any paid promotion of the page.

---

## 5. Performance & accessibility floor

- Single request beyond fonts; no JS frameworks; canvas starfield density scales with viewport; all motion behind `prefers-reduced-motion`.
- Budget: < 90KB HTML+CSS+JS (pre-asset), LCP < 1.8s on 4G, CLS ≈ 0.
- Keyboard focus visible, landmarks semantic, language attribute switches with the toggle, decorative canvas `aria-hidden`.
- After asset swap: `loading="lazy"` below the fold, explicit width/height, WebP + fallback.

---

## 6. Master prompt (Claude Code)

Paste into Claude Code at repo root to evolve v1 into the production site:

```
You are building the production version of Códice Vivo at apps/codice-vivo in the
flowbond-os Turborepo. Source of truth: apps/codice-vivo/codiceVivo/index.html
(v1, working) and CODICE_VIVO_BUILD_SPEC.md (this spec). Read both fully first.

Hard rules:
1. Cloudflare Pages only. Never scaffold Vercel. Deploy: feature branch → /test →
   validation → production via wrangler.
2. Brand: exact palette/typography from v1 CSS variables (obsidian #0B0E14, bone
   #EDE6D6, gold #C9A25C, jade #4C9B84; Cormorant Garamond + Figtree). Do not
   introduce new colors or faces.
3. Content governance (spec §4) is binding: no cultural iconography in generated
   assets, no revenue percentages, no founder/FlowBond branding on public pages,
   Maya-language text only via the advisor-approved pathway.
4. Bilingual EN/ES parity on every string. Structure for a future YUA locale.

Build order:
1. Promote to Astro (static output), preserving v1's rendered result pixel-perfect
   at /codiceVivo and /codiceVivo?lang=es (301 old param → /codiceVivo/es).
2. Componentize: Hero (starfield canvas), CodexFold, Tier, Commit, RoadStage,
   VisionSlot (accepts R2 image with gradient fallback), LangToggle.
3. Wire the three VisionSlots to R2 assets per spec §2 when provided; keep CSS
   gradients as fallback and for reduced-data users.
4. Add a "Transparencia" section stub that reads from a public read-only endpoint
   (Cloudflare Worker, /api/codice/stats) returning: stories_consented,
   sessions_paid, community_funds — render "—" until the endpoint exists. Do NOT
   invent numbers.
5. Lighthouse ≥ 95 all categories, axe clean, works without JS (content readable,
   toggle degrades to EN).
6. Open a PR to /test with screenshots (desktop + 390px mobile, EN + ES) and a
   diff summary. Never push straight to main.
```

---

## 7. Next builds after the site

1. **Consent-gate schema** — `codice_*` tables on the canonical Supabase project (`fgsrcxxccdjqyrpkitmk`), Pattern A: app-prefixed, FK to `flowbond_users`, RLS on, SECURITY DEFINER RPCs, append-only consent ledger, BEGIN/ROLLBACK dry-run before COMMIT.
2. **Transparencia Worker** — public read-only stats endpoint feeding the dashboard section (and later the full public dashboard).
3. **Capture app spec** — offline-first field recording PWA (MiCelio-compatible for low-connectivity communities), honorarium payment at session close via FlowShare.
4. **Community one-pager** — assembly-ready ES document with a column reserved for Maya translation (advisor pathway).
