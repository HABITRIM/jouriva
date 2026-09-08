# /public/brand/logo/ — JOURIVA logo masters

## Status: v1 masters (owner-authorized, built to the approved direction)

Created under explicit owner authorization following the approved JOURIVA
visual direction — **Horizon Path** concept, brand fidelity rules enforced:

- Stylized **J** is the structural element; the journey/path is its bowl,
  rising toward the horizon line.
- The horizon is a **clean colour split** through the glyph (navy sky /
  terracotta path) — the dotted horizon is **removed from the primary logo**
  (available only as the optional editorial asset below).
- The **8-point Moroccan star is the tittle (dot) of the J**, crowning the
  stem — integrated, not a separate decorative icon.
- No airplane, globe, luggage or compass. No ornamentation. Global identity.

## Files

| File | Purpose | Used by |
| ---- | ------- | ------- |
| `jouriva-logo.svg` | **Primary lockup** — symbol + Playfair Display Bold wordmark (outlined) | Header (auto-detected first) |
| `jouriva-logo-dark.svg` | Lockup for navy/dark backgrounds | Footer |
| `jouriva-wordmark.svg` | Standalone wordmark, true Playfair outlines | reserved / print |
| `jouriva-wordmark-light.svg` | Wordmark in sand for dark backgrounds | reserved / print |
| `jouriva-symbol.svg` | Symbol-only mark (full colour) | schema `logo`, compact contexts |
| `jouriva-symbol-light.svg` | Symbol for dark backgrounds (sand + terracotta) | reserved |
| `jouriva-symbol-mono-dark.svg` | Monochrome charcoal (one-colour, light bg) | reserved / one-colour print |
| `jouriva-symbol-mono-light.svg` | Monochrome sand (one-colour, dark bg) | reserved |
| `jouriva-favicon.svg` | Simplified small-size master (solid star) — favicon source | favicon pipeline |
| `jouriva-horizon-editorial.svg` | **Optional** dotted-horizon + star editorial motif (NOT part of the logo) | editorial backgrounds only |

## Regeneration

- Wordmark/lockup outlines: `node scripts/build-wordmark.mjs`
  (outlines real Playfair Display Bold via opentype.js; font cached in
  `scripts/.fonts/`, OFL license).
- Favicon/raster package: `node scripts/build-favicons.mjs`

## Replacement contract (zero code changes)

Components never hardcode paths — `src/lib/brand.ts` auto-detects in this
order: `logo-lockup.svg|jouriva-logo.svg` → `logo.svg|jouriva-symbol.svg` →
text. Drop designer masters in with either naming scheme and rebuild.

## Identity rules

- SVG masters are the single source of truth; the logo is never redrawn in CSS/HTML.
- Star = tittle of the J. Horizon split = path concept. Keep both at small sizes.
