# Brand & token system

Definition of the brand layer implemented in Phase 1. Single source of truth:
`src/styles/globals.css` (`@theme`) + `src/lib/fonts.ts` + `public/brand/`.

## Logo

- **Asset system (installed):** primary lockup (`jouriva-logo.svg`), dark
  lockup, standalone wordmark (true Playfair Display Bold outlines, generated
  by `scripts/build-wordmark.mjs`), symbol-only mark, dark-background and
  monochrome variants, simplified favicon master, and one **optional**
  editorial dotted-horizon motif — under `public/brand/logo/`.
- Concept fidelity: stylized J (structural) · journey/path = the J's bowl
  rising to a clean horizon colour-split · 8-point Moroccan star as the
  J's tittle (dot). Dotted horizon removed from the primary logo per the
  owner's brand-fidelity rules; exists only as `jouriva-horizon-editorial.svg`
  for editorial backgrounds. No airplane/globe/luggage/compass, no ornament.
- Masters were created under explicit owner authorization and are wordmark-
  and geometry-exact (star computed as a true 16-vertex polygon). Replacement
  designer files drop in under the same names — detection is centralized in
  `src/lib/brand.ts`, so no component changes are ever needed.
- The logo is rendered exclusively from the SVG masters (`<img>`); it is
  never recreated or approximated in CSS/HTML.
- Favicon package (SVG + ICO 16→256 + PNG ladder + apple/PWA icons) is
  generated from the masters by `scripts/build-favicons.mjs` and validated
  at 16/32/48/128/512 px.

## Color tokens

| Token | Value | Usage |
| ----- | ----- | ----- |
| `navy` | `#0D2B45` | primary brand, headings, footer/navy sections |
| `navy-700` / `navy-600` | `#14395C` / `#1D4A73` | hover states on navy |
| `navy-100` / `navy-50` | `#DCE6EF` / `#EEF3F8` | borders, subtle surfaces |
| `terracotta` | `#C86845` | brand accent, CTAs |
| `terracotta-dark` | `#8A3F23` | CTA hover |
| `terracotta-ink` | `#A34D2E` | accent **text** on light (AA on white/sand) |
| `terracotta-bright` | `#E09170` | accent **text** on navy (AA on `#0D2B45`) |
| `terracotta-soft` | `#F4E1D7` | accent tint surfaces |
| `sand` | `#F6EFE5` | warm section backgrounds |
| `sand-dark` | `#E9DECD` | sand borders |
| `white` | `#FFFFFF` | base |
| `charcoal` | `#1A1A1A` | body text |
| `ink-soft` | `#4A4A48` | secondary text |

Contrast rule of thumb: raw `terracotta` is reserved for fills/large type;
small accent text uses `terracotta-ink` (light bg) or `terracotta-bright`
(navy bg). White text passes on `terracotta` for bold button labels.

## Typography

| Role | EN/ES | AR |
| ---- | ----- | -- |
| `--font-display` (headings) | Playfair Display | Tajawal |
| `--font-body` (UI/body) | Inter | Tajawal |

Utilities: `font-display` for headlines, base body font applied in
`globals.css`. Weights loaded: Tajawal 400/500/700/800 (Arabic subset);
Playfair/Inter variable.

## Moroccan geometric influence (motif, not logo)

- `.bg-star-motif` — subtle tiled 8-point star line pattern (navy on light).
- `.navy-section.bg-star-motif` / `.bg-star-motif-light` — sand-on-navy variant.
- Decorative star bullets/icons in lists and favicon placeholder.
- The motif is decorative CSS/SVG art — explicitly **not** the logo.

## Editorial UI vocabulary

- `.container-jouriva` — max-width 76rem, responsive gutters.
- `.kicker` — uppercase letterspaced section label (terracotta-ink; bright on navy).
- `.navy-section` — dark navy band (a design section; **no global dark mode**).
- `.card-hover` — consistent card lift (disabled under reduced motion).
- `.ad-frame` — reserved ad placeholder styling.
- `.skip-link` — accessibility skip target.

## Ad-slot registry (design side)

`src/lib/ads.ts` — placements: `header`, `sidebar`, `inContent`,
`betweenSections`, `mobile`, `mobileSticky`; each with reserved sizes
(CLS-safe). Demo rendering controlled by `NEXT_PUBLIC_ADS_DEMO`.
