# SEO foundation

All SEO mechanics are centralized so they apply to every current and future
route automatically.

## Metadata builder — `src/lib/seo.ts`

`buildMetadata({ locale, path, pathOverrides, title, description, … })`
produces: canonical URL, hreflang `alternates.languages` (+ `x-default`),
Open Graph (+ `og:locale`, `og:locale:alternate`), Twitter/X summary card,
robots directives (`max-image-preview:large`, `max-snippet:-1`).

- Canonical = `NEXT_PUBLIC_SITE_URL` + `/{locale}{path}`.
- `pathOverrides` handles per-locale slugs (articles).
- Metadata set once in `[locale]/layout.tsx` (title template `%s | JOURIVA`,
  `metadataBase`, icons, RSS discovery) and per page.

## Structured data — `src/lib/schema.ts` + `<JsonLd>`

| Schema | Where |
| ------ | ----- |
| `Organization` (logo, sameAs, slogan) | all pages (layout) |
| `WebSite` (per locale, `inLanguage`) | home |
| `BreadcrumbList` | hubs, city pages, articles |
| `FAQPage` | any page with FAQ (hubs, cities, articles) |
| `Article` (author, publisher, dates, `inLanguage`) | article pages |

Author entity (name, role, bio, expertise, avatar) backs E-E-A-T; Article
schema carries `datePublished`/`dateModified`.

## Platform files

- `/sitemap.xml` — `src/app/sitemap.ts`: all locales × all routes, with
  hreflang alternates per entry and `x-default`. Prerendered.
- `/robots.txt` — `src/app/robots.ts`: allow all, disallow `/api/`, sitemap URL.
- `/{locale}/rss.xml` — per-locale RSS 2.0, prerendered, linked via
  `<link rel="alternate" type="application/rss+xml">`.
- `/manifest.webmanifest` — `src/app/manifest.ts`.

## URL architecture

```
/{locale}/                      home
/{locale}/morocco/              section hub
/{locale}/morocco/{city}/       city destination
/{locale}/guides/               guides hub
/{locale}/guides/{slug}/        article (slug independent per locale)
/{locale}/{section}/            12 IA sections, kebab-case, trailing slash
```

Trailing slashes enforced globally (`next.config.ts`). Clean, human-readable,
stable. Redirects for renamed slugs belong to the CMS layer (Phase 2).

## Distribution readiness

- **Google Search**: covered above + verification status freshness signals.
- **Google Discover**: `max-image-preview:large`, large OG images, E-E-A-T
  authors, freshness dates.
- **Pinterest / Facebook / Instagram / YouTube / TikTok**: OG tags +
  `SITE.socials` registry (`sameAs` in Organization schema). Rich media
  (video/carousel) attaches in later phases.
- Editorial guardrails for the future: programmatic generation stays behind
  a quality gate (see `docs/ARCHITECTURE.md` §4).
