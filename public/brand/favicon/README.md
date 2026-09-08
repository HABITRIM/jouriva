# /public/brand/favicon/

## Status: complete (owner-authorized reconstruction)

Generated from the SVG masters by `scripts/build-favicons.mjs`
(`node scripts/build-favicons.mjs` regenerates everything).

| File | Use | Wired into |
| ---- | --- | ---------- |
| `favicon.svg` | Modern browsers | `<link rel="icon" type="image/svg+xml">` (first) |
| `favicon.ico` | Legacy browsers (multi-size 16→256) | `<link rel="icon">` fallback (last) |
| `favicon-16/32/48/64/128/256.png` | Raster fallbacks | icon links, highest-available resolution per browser |
| `apple-touch-icon.png` (180×180, navy tile) | iOS home screen | `<link rel="apple-touch-icon">` |
| `icon-192/384/512.png` (navy tile) | Android / PWA | `manifest.webmanifest` icons |
| `favicon.svg` / `icon-tile-navy.svg` | Masters (light tile / navy tile) | source for the raster pipeline |
| `icon.svg` | *(removed — superseded by the real package)* | — |

All entries are **auto-detected** (`src/lib/brand.ts`): only files that exist
are referenced, so the set can be extended (e.g. maskable icons) without code
changes. Reconstruction authorized by the owner; replace masters freely.
