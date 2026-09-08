# JOURIVA — Architecture

Phase 1 · Brand + Product + Technical Foundation

## 1. High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js 15 App Router (TypeScript, static-first rendering)      │
│                                                                  │
│  middleware ── locale negotiation (/ → /en/, /ar/, /es/)          │
│                                                                  │
│  src/app/[locale]/                                               │
│    page.tsx            home (hero, editorial sections, ad slots) │
│    <section-hubs>/     12 IA landing pages (shared HubScreen)    │
│    morocco/[city]/     city destination pattern (Marrakech…)     │
│    guides/[slug]/      article pattern (per-locale slugs)        │
│    rss.xml/            per-locale RSS feed                       │
│    not-found.tsx       localized 404                             │
│                                                                  │
│  src/app/sitemap.ts · robots.ts · manifest.ts (platform files)   │
└───────────────┬──────────────────────────────────────────────────┘
                │
    ┌───────────┴────────────┐        ┌──────────────────────────┐
    │ src/lib (framework-    │        │ src/content (typed       │
    │ agnostic foundations)  │        │ sample content layer)    │
    │ seo · schema · ads ·   │        │ Phase 2 replaces the     │
    │ verification · fonts · │        │ data source with the CMS │
    │ config                 │        │ (same shapes, Prisma-    │
    └────────────────────────┘        │ backed)                  │
                                      └──────────────────────────┘
    ┌──────────────────────────┐      ┌──────────────────────────┐
    │ prisma/schema.prisma     │      │ public/brand · images    │
    │ PostgreSQL data-model    │      │ SVG masters (drop-in),   │
    │ foundation (Phase 2 CMS) │      │ placeholder photography  │
    └──────────────────────────┘      └──────────────────────────┘
```

### Rendering strategy

- **Static-first.** Every Phase 1 route is prerendered at build time
  (`generateStaticParams` × locale). No database, no user sessions →
  excellent Core Web Vitals by construction.
- **Server Components** everywhere except the three interactive islands:
  `LanguageSwitcher`, `MobileNav`, `SearchBox`, `NewsletterForm`.
  Minimal client JavaScript, no UI framework dependencies.
- `setRequestLocale()` is called on every page so next-intl renders statically.

## 2. Phase map (what depends on what)

| Phase | Scope | Depends on |
| ----- | ----- | ---------- |
| **1 (done)** | Brand, product foundation, technical foundation, architecture, SEO foundation, responsive shell | — |
| 2 | CMS + article engine + authors + editorial workflow | `prisma/schema.prisma`, content types in `src/content/types.ts`, SEO builders |
| 3 | Monetization: affiliate provider adapters + ad provider integration | `AdSlot` placement keys, `AffiliateOffer`/`AdSlot` entities |
| 4 | Travel Tools + Newsletter operations | `NewsletterSubscriber` entity, component shells |
| 5 | Smart Destination Quiz | `QuizSubmission` entity, quiz→destination→offers connection |
| 6 | Programmatic SEO (quality-gated) + full Sports/Study-abroad DBs | CMS, verification workflow, programmatic gate (below) |

## 3. Key architectural decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Framework | Next.js 15 + App Router | Owner-confirmed; best fit for multilingual SEO, RTL, static performance, portability (Vercel/Docker/Node) |
| URL scheme | Locale-prefixed, trailing slash | `/{locale}/…/` per spec; clean, human-readable |
| Content (Phase 1) | Typed sample layer (`src/content`) | Demonstrates full content architecture without a CMS; swap-in for Phase 2 |
| Translation model | Base entity + per-locale translation rows, slugs independent per locale | Spec: translations related, never duplicated |
| Data model | Normalized relational (Prisma/PostgreSQL) | Spec: separate entities, extensible without overengineering |
| Monetization | Provider-agnostic registries (keys, not SDKs) | Spec: no hard-coded affiliate/ad provider |
| Ads | Reserved-height slots, demo toggle | Protects CLS before providers exist |
| Verification | First-class fields + localized statuses + standing warning | Spec: time-sensitive info handling |
| Dark mode | None (light theme; navy **sections** only) | Spec |
| Portability | No vendor SDKs in Phase 1; env-driven config | Spec: avoid lock-in |

## 4. Programmatic SEO quality gate (future)

The sitemap builder and routing are programmatic-ready, but mass generation
is **explicitly out of scope**. When built (Phase 6), programmatic pages must
pass a gate encoded in the CMS: unique value + search intent + useful content
+ internal links + metadata + quality threshold + editorial review. This is
documented now so no later phase can accidentally mass-generate thin pages.
