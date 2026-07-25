# Kai World — image drop-zone

Drop real art here and the UI picks it up automatically (every slot has an
elegant gradient+monogram fallback, so missing files never break the page).
Format: **`.webp`**, sized as noted. Filenames are exact (lowercase).

## Guardians — `guardians/<slug>.webp` (portrait, ~800×1000, 4:5)

| file | character | role |
|------|-----------|------|
| `guardians/tef.webp`       | Tef       | Guide of Flow |
| `guardians/claudia.webp`   | Claudia   | Engineer of Systems |
| `guardians/sofia.webp`     | Sofia     | Keeper of Wisdom |
| `guardians/naturalia.webp` | Naturalia | Voice of Nature |
| `guardians/historia.webp`  | Historia  | Seer of Time |
| `guardians/ingenia.webp`   | Ingenia   | Maker of Things |
| `guardians/artia.webp`     | Artia     | Muse of Art |
| `guardians/econia.webp`    | Econia    | Weaver of Value |

## Regions — `regions/<slug>.webp` (cinematic landscape, ~2400×1350, 16:9)

| file | region |
|------|--------|
| `regions/valle-espejo.webp` | Valle Espejo (Tepoztlán-inspired hero — used in header, 3D card, places) |

## Player — `player/avatar.webp` (square, ~400×400)

To add a new guardian/region: drop the file and add one row to
`lib/kai/world.ts` (guardians) or seed the region in the DB. No UI change needed.
