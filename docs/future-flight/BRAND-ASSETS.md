# BRAND-ASSETS.md — drop-in spec

Export finals into `apps/future-flight/public/brand/` with these exact names. The landing's
`<Image>` slots (Phase 1) reference these paths — match them and no code changes are needed.

## Logo (from the brand board's four variations)

| File | Use | Format | Notes |
|---|---|---|---|
| `logo-primary.svg` | wordmark + monogram, gold on dark | SVG | nav, footer |
| `logo-white.svg` | wordmark + monogram, warm white | SVG | on imagery |
| `logo-mono.svg` | single-color | SVG | fallbacks |
| `badge-circular.svg` | circular "FUTURE FLIGHT · MIAMI→TULUM" seal | SVG | stamps, loaders |
| `monogram.svg` | FF mark only | SVG | favicon source, app icon |

## Hero + imagery

| File | Use | Spec |
|---|---|---|
| `hero-poster.jpg` | hero still (portal + aircraft) | 2400×1600, < 400 KB |
| `hero.mp4` / `hero.webm` | optional hero loop | ≤ 8 s, ≤ 3 MB, muted, H.264 + VP9 |
| `aircraft-livery.jpg` | funding-tier / about | 2000×1200 |
| `jungle-arrival.jpg` | Tulum arrival section | 2000×1200 |
| `experience-01…06.jpg` | six timeline steps | 1200×800 each |

## System icons / meta

| File | Use | Spec |
|---|---|---|
| `favicon.ico` | tab | 32×32 + 16×16 |
| `icon-192.png`, `icon-512.png` | PWA | maskable-safe padding |
| `apple-touch-icon.png` | iOS | 180×180 |
| `og-image.jpg` | social share | 1200×630, wordmark + "MIAMI → TULUM · DEC 8 2026" |

## Rules

- Backgrounds transparent for all SVG logos.
- Palette locked: `#D4AF37` gold · `#FFBA00` copper · `#F2F2F2` warm white ·
  `#1A1A1D` charcoal · `#0D0D0F` black · `#0A3D3A` teal.
- Photography: dark, cinematic, warm; jungle + luxury-aviation; avoid crypto clichés.
- Compress before commit (jpg ≤ 400 KB, hero video ≤ 3 MB). Large media → Cloudinary/Mux later.
