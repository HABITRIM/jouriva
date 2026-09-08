# JOURIVA

**Discover More. Travel Better.**

A production-ready, multilingual travel media and discovery platform with
Moroccan roots — helping the world discover Morocco, and helping Moroccan
travelers discover the world.

> **Status: Phase 1 complete** — Brand + Product + Technical Foundation.
> See [`docs/PHASE1-REPORT.md`](docs/PHASE1-REPORT.md) for the full report.

---

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 15 (App Router, TypeScript, static-first)   |
| i18n       | next-intl v4 — `/ar/`, `/en/`, `/es/` (Arabic = RTL) |
| Styling    | Tailwind CSS v4 (`@theme` design tokens)            |
| Data model | Prisma schema (PostgreSQL) — foundation only        |
| Fonts      | Playfair Display + Inter (EN/ES), Tajawal (AR) via `next/font` |

## Quick start

```bash
npm install
cp .env.example .env      # set NEXT_PUBLIC_SITE_URL for prod builds
npm run dev               # http://localhost:3000 → redirects to /en/
```

```bash
npm run build             # production build (all routes prerendered)
npm run typecheck         # TypeScript strict check
npm run prisma:validate   # validate the data model (needs DATABASE_URL in .env)
```

## Locales & URLs

| Locale  | Prefix | Direction | Sample URL                |
| ------- | ------ | --------- | ------------------------- |
| English | `/en/` | LTR (default) | `/en/morocco/marrakech/` |
| العربية | `/ar/` | **RTL**   | `/ar/morocco/marrakech/`  |
| Español | `/es/` | LTR       | `/es/morocco/marrakech/`  |

`/` redirects to `/en/` via middleware. All URLs use trailing slashes.

## Documentation

| Doc | Contents |
| --- | -------- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | High-level architecture + phase map |
| [`docs/01-folder-structure.md`](docs/01-folder-structure.md) | Where everything lives |
| [`docs/02-data-model.md`](docs/02-data-model.md) | Prisma entity model & translation pattern |
| [`docs/03-localization.md`](docs/03-localization.md) | i18n/RTL strategy, per-locale content independence |
| [`docs/04-seo.md`](docs/04-seo.md) | Canonical, hreflang, sitemap, schema, RSS |
| [`docs/05-brand-tokens.md`](docs/05-brand-tokens.md) | Colors, typography, motifs, ad slots |
| [`docs/06-components.md`](docs/06-components.md) | Component inventory |
| [`docs/07-environment.md`](docs/07-environment.md) | Env vars & secrets policy |
| [`docs/08-roadmap.md`](docs/08-roadmap.md) | Phase dependencies (2 → 6) |
| [`docs/PHASE1-REPORT.md`](docs/PHASE1-REPORT.md) | **Phase 1 delivery report** |

## Phase 1 boundary

Implemented: brand layer · design tokens · trilingual responsive shell ·
home + 12 section hubs + city & article patterns · SEO/i18n/verification
foundations · Prisma data model · docs.

Not implemented (later phases): CMS, full article engine, quiz logic,
affiliate/ad integrations, sports & study-abroad databases, mass content.
