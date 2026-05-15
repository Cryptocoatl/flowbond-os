# FlowGarden Brand Pack

Production-ready brand assets for FlowGarden — extracted directly from the
source artwork at 2000×2000 resolution, with clean transparent alpha,
color-recolored variants, and a printed brand guidelines PDF.

---

## What's in the box

```
flowgarden-brand-pack/
├── FlowGarden-Brand-Guidelines.pdf      ← 7-page brand book (A4 landscape)
│
├── mark/                                ← Mark only (icon, monogram)
│   ├── png/512/                         ← 6 colors × 4 sizes (512/1024/2048/4096)
│   ├── png/1024/
│   ├── png/2048/
│   ├── png/4096/
│   └── svg/                             ← 6 color variants (raster-embedded SVG)
│
├── lockup/                              ← Mark + wordmark + tagline
│   ├── png/512/
│   ├── png/1024/
│   ├── png/2048/
│   ├── png/4096/
│   └── svg/
│
├── favicon/                             ← Full web + PWA icon set
│   ├── favicon.ico                      ← multi-res (16/32/48) for legacy
│   ├── favicon-{16,32,48,64,180,192,512}x{...}.png
│   ├── apple-touch-icon.png             ← iOS home-screen icon
│   ├── android-chrome-{192,512}x{...}.png
│   └── site.webmanifest                 ← PWA manifest, themed to brand
│
├── palette/                             ← Color swatches (PNG)
│   └── swatch-{gold,dark-green,sage,cream,white,black}.png
│
├── build.py                             ← Regenerate the entire asset matrix
└── build_pdf.py                         ← Regenerate the brand guidelines PDF
```

Every PNG is **transparent background**. Every color variant is a clean recolor
of the same alpha mask — strokes line up perfectly across colors and sizes.

---

## Brand colors

| Name        | Hex       | RGB              | PMS              | Use                                |
| ----------- | --------- | ---------------- | ---------------- | ---------------------------------- |
| Dark Forest | `#0F2E1F` | `15 46 31`       | `5535 C`         | Primary brand background           |
| Gold        | `#C9A961` | `201 169 97`     | `871 C` metallic | Primary mark color                 |
| Sage        | `#8FA98F` | `143 169 143`    | —                | Secondary surfaces                 |
| Cream       | `#EFE8D8` | `239 232 216`    | —                | Light background; mark on dark     |
| Black       | `#000000` | `0 0 0`          | —                | Mono print / embossing             |
| White       | `#FFFFFF` | `255 255 255`    | —                | Reverse mark on photography        |

---

## Web integration — Next.js + FlowBond OS monorepo

### Step 1 — Favicons (drop into `apps/<app>/public/favicon/`)

```
apps/<your-app>/public/favicon/
```

Then in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'FlowGarden',
  description: 'A living ecosystem where growth is effortless, connected and abundant.',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
  themeColor: '#0F2E1F',
}
```

### Step 2 — Logo as a React component

Drop these into `packages/ui/src/`:

**FlowGardenMark.tsx** — Mark only (icon)

```tsx
import Image from 'next/image'

type Props = {
  size?: number
  color?: 'gold' | 'dark-green' | 'sage' | 'cream' | 'white' | 'black'
  className?: string
  priority?: boolean
}

export function FlowGardenMark({
  size = 64,
  color = 'gold',
  className,
  priority = false,
}: Props) {
  return (
    <Image
      src={`/logos/mark/flowgarden-mark-${color}-1024.png`}
      width={size}
      height={size}
      alt="FlowGarden"
      className={className}
      priority={priority}
    />
  )
}
```

**FlowGardenLockup.tsx** — Mark + wordmark + tagline

```tsx
import Image from 'next/image'

type Props = {
  width?: number
  color?: 'gold' | 'dark-green' | 'sage' | 'cream' | 'white' | 'black'
  className?: string
  priority?: boolean
}

export function FlowGardenLockup({
  width = 240,
  color = 'gold',
  className,
  priority = false,
}: Props) {
  // Lockup aspect ratio is ~1.37:1
  const height = Math.round(width / 1.37)
  return (
    <Image
      src={`/logos/lockup/flowgarden-lockup-${color}-2048.png`}
      width={width}
      height={height}
      alt="FlowGarden — Grow, Flow, Thrive"
      className={className}
      priority={priority}
    />
  )
}
```

Then copy the relevant logos into `apps/<app>/public/logos/`:

```bash
mkdir -p apps/<app>/public/logos/{mark,lockup}
cp -r flowgarden-brand-pack/mark/png/1024/* apps/<app>/public/logos/mark/
cp -r flowgarden-brand-pack/lockup/png/2048/* apps/<app>/public/logos/lockup/
```

### Step 3 — Tailwind color tokens

Add to `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      'flow-gold':      '#C9A961',
      'flow-dark':      '#0F2E1F',
      'flow-sage':      '#8FA98F',
      'flow-cream':     '#EFE8D8',
    },
  },
}
```

Usage: `bg-flow-dark text-flow-gold`

---

## Print specs

- **Business cards / small print**: use 2048px PNG
- **Posters / banners (up to A1)**: use 4096px PNG
- **Anything larger or vector-required**: use SVG (raster-embedded — scales smoothly to any web display size)
- **Premium / embossing / spot color**: spec **Pantone 871 C** (metallic gold)
  + **Pantone 5535 C** (dark forest) instead of process CMYK

---

## Brand Guidelines PDF

`FlowGarden-Brand-Guidelines.pdf` is a 7-page A4-landscape brand book containing:

1. Cover
2. Brand essence + 5 pillars (Nature, Flow, Technology, Harmony, Growth)
3. Logo system — primary mark, full lockup, clearspace rules, minimum sizes
4. Color palette — primary + secondary with RGB/HEX/PMS specs
5. Typography — Playfair Display (serif) + Satoshi (sans) hierarchy
6. Application — surface examples on each brand color + dos & don'ts
7. Closing statement + colophon

Share this PDF with designers, contractors, partners, and anyone producing
collateral for the brand. Print on A4 landscape, 200gsm matte for best feel.

---

## Regeneration

Need a new size or color? Re-run the build script:

```bash
python3 build.py        # Regenerates all PNG + SVG variants from source
python3 build_pdf.py    # Regenerates the brand guidelines PDF
```

Source artwork: `/mnt/user-data/uploads/FLOWGARDEN_logo_Gold_.png` (2000×2000)

To add a new brand color, edit the `COLORS` dict in `build.py` and re-run.
The recolor pipeline is alpha-based, so all variants stay pixel-perfect aligned.

---

## Notes

- The SVGs are **raster-embedded** (base64 PNG inside an SVG wrapper), not
  hand-traced vector paths. They scale smoothly in browsers via SVG's built-in
  resampling, are single-file, and are the right format for most web use cases.
  If you need true scalable vector paths (for embroidery, laser cutting, or
  very-large-format print), open the source PNG in Illustrator or Figma and
  trace it there — the curves are too organic to reconstruct precisely by hand.
- All files use **transparent PNG**, so the same mark works on any background
  without halos or matte edges.
- Favicons at 16px and 32px use the same alpha mask as the larger sizes —
  if the mark looks faint at tab size on your monitor, that's the source artwork's
  thin stroke weight at small scale, not an export issue.
