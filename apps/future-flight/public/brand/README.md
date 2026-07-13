# Brand assets — drop-in slot

Export finals here per `docs/future-flight/BRAND-ASSETS.md`. The landing's
`<Image>` slots and layout metadata reference these exact paths, so matching the
filenames means no code changes:

- `logo-primary.svg`, `logo-white.svg`, `logo-mono.svg`, `badge-circular.svg`, `monogram.svg`
- `hero-poster.jpg`, `hero.mp4` / `hero.webm`, `aircraft-livery.jpg`, `jungle-arrival.jpg`, `experience-01…06.jpg`
- `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `og-image.jpg`

Until finals land, the Nav/Hero/Footer render the inline-SVG placeholder marks in
`components/brand/Marks.tsx`.

Palette locked: `#D4AF37` gold · `#FFBA00` copper · `#F2F2F2` warm white ·
`#1A1A1D` charcoal · `#0D0D0F` black · `#0A3D3A` teal.
