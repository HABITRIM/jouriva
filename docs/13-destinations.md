# 13 — Destinations, Taxonomy & Content Discovery (Phase 3)

Status: **DELIVERED 2026-09-05** (awaiting human review). Spec: Phase 3
(30 sections). Phase 1 + Phase 2 architecture is preserved unchanged.

A **destination is not an article.** It is a structured entity (anchored to
Country/City records) + an editorial core (per-locale blocks written by
editors) + a hub that assembles related content. This doc covers the data
model, localization, hierarchy, relationships, taxonomy, the related-content
algorithm, SEO rules, thin-content protection, verification, admin workflow,
public rendering and extensibility.

---

## 1. Data model (Prisma — extends Phase 1 entities, no parallel systems)

| Model | Purpose |
| --- | --- |
| `Destination` | The entity: `type` (COUNTRY/CITY/REGION/ATTRACTION/VENUE), `countryId`/`cityId` FKs (structural anchor), `isFeatured`, `isActive` (archive), `sortOrder`, `heroAssetId → MediaAsset`. Hierarchy is **structural** — cycles are impossible by construction. |
| `DestinationTranslation` | One independently-editable, independently-publishable version per locale (same philosophy as `ArticleTranslation`): name/slug/tagline/intro (`description`), `blocks` (same block schema as articles), SEO fields, `noindex`, `workflowStatus`/`publishedAt`, verification fields (Phase 2 reuse), `faqGroupId → FaqGroup`. |
| `ArticleDestination` | Explicit article ↔ destination link: `role` = PRIMARY \| SECONDARY, `position`. `@@unique(articleId, destinationId)`. Never slug-inferred, never mass-generated. |
| `DestinationMedia` | Gallery: references the existing `MediaAsset` system only. `@@unique(destinationId, assetId)`, ordered. |
| `Topic` / `TopicTranslation` / `ArticleTopic` / `DestinationTopic` | Cross-cutting editorial taxonomy relating articles **and** destinations. Per-locale slugs unique (`@@unique([locale, slug])`). |
| `Category` (existing) | Extended with `isActive` for reference-safe archiving; remains the article category tree (roots = sections). |
| `ContentLink` (existing) | Extended: `targetDestinationId` (contextual link **to** a destination) and `ownerDestinationTranslationId` (curated link **from** a destination translation — plain reference, polymorphic-owner pattern like `FaqGroup.ownerId`). Phase 2 article↔article links untouched. |

Migrations: `20260905205332_phase3_destinations`,
`20260905205428_phase3_destination_links`,
`20260905210535_phase3_curated_link_owner`,
`20260905211415_phase3_contentlink_owner_nullable` (names approximate for the
last two; see `prisma/migrations/`).

**Key constraint decisions**

- Slugs are unique **per locale** (`@@unique([locale, slug])`); Latin
  transliterated slugs in ALL locales including Arabic (binding decision #2).
- Hierarchy anchors are the structured `Country`/`City` records — parent
  cycles are impossible; breadcrumb depth is additionally guarded in code.
- `REGION/ATTRACTION/VENUE` types exist in the enum and routes/services are
  generic over them, but no extra hierarchy levels were built (don't overbuild).

## 2. Localization

Identical philosophy to Phase 2 articles:

- Each `DestinationTranslation` publishes independently; a DRAFT in one locale
  never affects another.
- `hreflang` alternates are built **only** from PUBLISHED versions of the same
  destination (`group` in the public reader); `x-default` = `/en` path.
- AR renders RTL (`dir="rtl"`), Arabic display names with Latin slugs.
- The frozen Phase 1 static pages (`/morocco/`, `/morocco/{city}/`) switch to
  **strict DB-first mode** the moment a Destination entity exists for that
  anchor: a missing/unpublished locale then 404s — the frozen sample page can
  never leak through. Cities without any Destination entity keep the frozen
  Phase 1 page (URL preservation).

## 3. Services (all server-only, `src/lib/cms/`)

- `destinations.ts` — zod-validated create/save; per-locale slug clash checks;
  automatic **301 redirect** on live slug change (reuses the Phase 2 Redirect
  system, loop-safe); workflow transitions (`publish|unpublish|archive|restore`)
  guarded by the Phase 2 state machine + roles; article link management
  (PRIMARY/SECONDARY); quality gate.
- `public-destinations.ts` — cached public reads (`unstable_cache`, tag
  `destinations`, revalidate 300): by anchor (country/city, rename-tolerant),
  by id, sitemap query (PUBLISHED + indexable only), preview fetch. Decoration
  adds: country breadcrumb parent, published child cities (featured →
  sortOrder → name), curated + sibling related destinations (max 6), hreflang
  group with statuses, quality verdict.
- `related.ts` — deterministic related-content engine (§5 below). Cards only —
  article bodies are never fetched for lists (no N+1, no over-fetch).
- `taxonomy.ts` — topic/category save with per-locale slug clash checks;
  **reference-safe archive** (hard delete only when unreferenced, otherwise
  `isActive=false`); topic linking revalidates `topics` + `destinations`/`articles`.

## 4. Routing

| URL | Route | Behavior |
| --- | --- | --- |
| `/{locale}/morocco/` | `[locale]/morocco/page.tsx` (static segment wins) | DB-first hub; strict mode → 404 when unpublished; frozen Phase 1 hub only if no Destination entity exists |
| `/{locale}/morocco/{city}/` | `[locale]/morocco/[city]/page.tsx` | DB-first → 301 redirect check → strict 404 → frozen Phase 1 sample page (only without a Destination entity) |
| `/{locale}/{dest}/` | `[locale]/[dest]/page.tsx` | Any country destination; nested types 301 to their canonical path (no duplicate URLs) |
| `/{locale}/{dest}/{city}/` | `/[locale]/[dest]/[city]/page.tsx` | City destinations under any country anchor (e.g. `/en/spain/barcelona/`); relationship-derived: first segment must resolve to a published country |
| `/{locale}/topics/{slug}/` | `[locale]/topics/[slug]/page.tsx` | Topic → published articles listing; noindex when empty |
| `/{locale}/preview/{translationId}/` | preview gate (session or signed token) | Extended to destination translations via `DestinationScreen` |

All destination pages: `revalidate = 300` (ISR), `generateMetadata` with
canonical + published-only hreflang + `robots: noindex` when the quality gate
fails.

## 5. Related-content algorithm (deterministic — never random, never mass)

For a **destination**, related articles are selected in fixed tiers:

1. Articles with an explicit `ArticleDestination` link (PRIMARY first, then
   `position`);
2. Articles linked to other destinations in the same country;
3. Most recent published articles in the same locale (cap).

For an **article**: 1) same destinations, 2) same country, 3) same category,
4) same topics, 5) recent same-locale. `destinationsForArticle` powers
destination chips on article pages; `articlesForTopic` powers topic listings.
Editors override via explicit links; the engine only fills remaining slots
(hard cap: 6 for destinations, tiered caps for articles).

## 6. SEO rules

- Localized SEO title/meta/canonical override; canonical is always
  `${NEXT_PUBLIC_SITE_URL}/${locale}${path}` (binding decision #3).
- hreflang published-only + x-default (`/en`).
- JSON-LD: `BreadcrumbList` (relationship-derived — World → Country → City),
  `FAQPage` **only** when a FAQ is visible on the page, plus the destination
  schema already used by the frozen pages. No type stuffing.
- Sitemap: destinations included **only** when PUBLISHED + indexable; static
  Phase 1 entries for DB-managed destinations are removed (no duplicates).
  **Destinations never enter RSS** (article RSS unchanged, spec §14).
- `noindex` translations render `<meta name="robots" content="noindex…">` and
  are excluded from the sitemap while remaining previewable/linkable.

## 7. Thin-content protection (spec §15 — mandatory)

`destinationQuality(tr, anchorOk)` → `{ indexable, reasons, textLength }`.
Indexable requires ALL of:

1. `workflowStatus = PUBLISHED`
2. `noindex = false`
3. intro ≥ 60 chars
4. intro + blocks ≥ 400 chars
5. non-empty `metaDescription`
6. structural anchor present (country/city record)

Below the threshold a destination **may exist and be linked internally** but is
never an indexable landing page. Publishing itself is never gated (editing
freedom preserved); only indexability is. The admin editor shows the live
verdict with reasons. No mass-generated or placeholder destination pages exist.

## 8. Verification (Phase 2 reuse)

`verificationStatus` / `lastVerifiedAt` / `verifiedBy` / `notes` /
`warningEnabled` on `DestinationTranslation` render the same VerificationBadge
/ official-source warning used by articles. Sample data carries NEEDS_REVIEW
or VERIFIED-with-note ("common-knowledge facts only") — never fabricated
verification claims.

## 9. Admin workflow (server-side authz — spec §17/§18)

- `/admin/en/destinations/` — list + search + type filter + per-locale status.
- `…/new/` — create entity anchored to Country/City records + first DRAFT.
- `…/{id}/{locale}/` — full editor: translation group table + add version;
  workflow actions (publish/unpublish/archive/restore, EDITOR+, explicit human
  gates, confirmation on publish); editorial core (BlocksEditor, structured
  blocks only); hero + gallery from the **existing** media library; SEO;
  live quality-gate panel; verification; FAQ builder; curated related
  destinations; topics; incoming article links (read-only view).
- `/admin/en/taxonomy/` — topics + categories with per-locale labels/slugs,
  duplicate prevention, reference-safe archive/delete.
- **Article editor** (existing) extended with a Destinations panel (PRIMARY
  select + SECONDARY list) and Topics panel — saved through the same
  `saveTranslationAction`; no new permissions for AUTHORS.
- Server actions: `requireRole("EDITOR")` on every destinations/taxonomy
  action; admin **pages** additionally gate `requireRole("EDITOR")` — AUTHOR
  gains nothing beyond Phase 2 (verified by E2E).

## 10. Public rendering (`DestinationScreen`)

One reusable server component renders hero (with credit/AI label), official-
source warning, intro, editorial blocks, gallery, child-destination cards,
related guide cards, related-destination chips, FAQ (schema only when present),
breadcrumb JSON-LD. Localized labels en/es/ar; `dir` follows the locale;
only populated fields render (no fabricated placeholders).

## 11. Extensibility (without redesign)

Regions/islands/parks/beaches/attractions/neighborhoods plug in as
`Destination.type` values anchored to whatever structured record applies
(city FK already optional); the reader/renderer/related-engine are type-agnostic.
Discovery beyond the current deterministic tiers (e.g. lightweight internal
search) can extend `related.ts` without schema change.

## 12. Sample data (small, factual, labeled — spec §26)

`scripts/seed-destinations.ts` (idempotent): countries MA/ES/FR; cities
Marrakech/Fes/Casablanca/Barcelona/Paris; 8 destinations, 23 versions
(19 published, 4 drafts demonstrating per-locale independence); one
**published-but-thin** version (Paris/AR) demonstrating the noindex gate;
explicit article links on the 3 existing sample articles; 3 topics; 4 curated
related links; FAQ on Marrakech/EN. Editorial text is common-knowledge,
every version carries a visible SAMPLE label, and **no prices, visa rules,
transport details, opening hours, hotels, flights or statistics are
fabricated**.
