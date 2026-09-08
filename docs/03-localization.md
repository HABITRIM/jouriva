# Localization strategy (i18n + RTL)

## Locales

| Code | Language | Direction | Prefix | Notes |
| ---- | -------- | --------- | ------ | ----- |
| `en` | English  | LTR | `/en/` | default (`localePrefix: "always"`, so `/` → `/en/`) |
| `ar` | العربية  | **RTL** | `/ar/` | full RTL, Tajawal type system |
| `es` | Español  | LTR | `/es/` | |

Wiring: `src/i18n/routing.ts` (locales + `LOCALE_DIR`), `middleware.ts`
(negotiation), `i18n/request.ts` (per-request messages), `i18n/navigation.ts`
(locale-aware `Link`/`router`), `messages/{en,es,ar}.json`.

## Content independence (the core principle)

Translations are **related, not duplicated**. Every localized content item:

- exists per locale with its **own slug** (articles demonstrate this:
  `marrakech-with-kids-48-hours` / `marrakech-con-ninos-48-horas` /
  `dalil-marrakech-lil-usar`),
- has its own SEO title, meta description, H1, FAQ, canonical override,
- is **optionally present** in each locale (a locale can launch an article
  another locale doesn't have),
- is related to its counterparts through the base entity (→ hreflang).

UI strings live in `messages/*.json`; editorial content in `src/content/*`
(Phase 2: CMS translation tables, same shapes).

## RTL correctness

- `<html dir>` is derived from `LOCALE_DIR` — no component hardcodes direction.
- All layout uses **CSS logical properties** via Tailwind (`ms-`, `me-`,
  `start-`, `end-`, `ps-`, `pe-`) — e.g. header brand, mobile drawer, breadcrumbs.
- The breadcrumb chevron flips with `rtl:-scale-x-100`.
- The language switcher and locale selects stay `dir="ltr"` (locale codes).
- Arabic typography: `html[lang="ar"]` swaps `--font-display`/`--font-body`
  to Tajawal; Playfair remains for Latin brand word (JOURIVA).

## Typography system

| Use | EN/ES | AR |
| --- | ----- | -- |
| Editorial headings | Playfair Display | Tajawal (bold weights) |
| UI/body | Inter | Tajawal |

Fonts self-host via `next/font` (`src/lib/fonts.ts`) → zero render-blocking
requests, automatic `size-adjust` fallback metrics, `display: swap`.

## Adding a locale (future)

1. Add code to `routing.locales` + `LOCALE_DIR`.
2. Add `messages/<code>.json`.
3. Add font support if a new script is required.
4. Add rows in the `Locale` table (CMS phase).
Everything else (routing, SEO, sitemap, hreflang, switcher) is data-driven.
