# PHASE 3 DELIVERY REPORT — Destination, Taxonomy & Content Discovery Engine

Date: 2026-09-05 · Status: **DELIVERED — FINAL APPROVAL CONFIRMED 2026-09-06**.
Phase 3 is FROZEN together with Phases 1–2. No further Phase 3 changes;
awaiting the explicit Phase 4 specification.

Phase 1 (foundation) and Phase 2 (CMS + article engine) remain CLOSED, APPROVED
and FROZEN. All Phase 3 work extends them without parallel systems.

---

## 1. Files changed / created

**Services (server-only)**
- `src/lib/cms/destinations.ts` — NEW: destination services (create/save with
  zod validation + per-locale slug uniqueness + automatic 301 on live slug
  change; quality gate; workflow transitions; article link management).
- `src/lib/cms/public-destinations.ts` — NEW: cached public reads (by anchor
  — rename-tolerant —, by id, sitemap query, preview), decoration (breadcrumbs,
  children, curated/sibling related destinations, hreflang group, quality).
- `src/lib/cms/related.ts` — NEW: deterministic related-content engine.
- `src/lib/cms/taxonomy.ts` — NEW: topics/categories save + reference-safe
  archive + topic linking.
- `src/lib/cms/admin-queries.ts` — EXTENDED: destinations list/edit, pickers,
  topics, category tree.

**Server actions**
- `src/app/actions/destinations.ts` — NEW (EDITOR-gated: create/save/
  transitions/translation create).
- `src/app/actions/taxonomy.ts` — NEW (EDITOR-gated).
- `src/app/actions/articles.ts` — EXTENDED: article save also persists
  destination (PRIMARY/SECONDARY) + topic links.

**Public routes**
- `src/app/[locale]/morocco/page.tsx` — UPGRADED to DB-first hub (frozen Phase 1
  hub only when no Destination entity exists).
- `src/app/[locale]/morocco/[city]/page.tsx` — UPGRADED: DB-first → 301 →
  strict 404 → frozen Phase 1 sample page.
- `src/app/[locale]/[dest]/page.tsx` — NEW dynamic country route (nested types
  301 to canonical path).
- `src/app/[locale]/[dest]/[city]/page.tsx` — NEW dynamic city route.
- `src/app/[locale]/topics/[slug]/page.tsx` — NEW topic article listings.
- `src/app/[locale]/preview/[id]/page.tsx` — EXTENDED: destination previews
  behind the same session/token gate.
- `src/app/sitemap.ts` — destinations (quality-gated, indexable-only) +
  dedupe against static Phase 1 entries.

**Components**
- `src/components/destination/DestinationScreen.tsx` — NEW reusable public
  screen (hero, warning, blocks, gallery, children, related, FAQ, JSON-LD).

**Admin UI**
- `src/app/admin/[locale]/(panel)/destinations/page.tsx` — NEW list.
- `…/destinations/new/page.tsx` — NEW create form.
- `…/destinations/[id]/[tr]/page.tsx` — NEW full editor (translation group,
  workflow, blocks, media, SEO, quality panel, verification, FAQ, curated
  related, topics, article links).
- `…/taxonomy/page.tsx` — NEW topics + categories manager.
- `…/articles/[id]/[tr]/page.tsx` — EXTENDED: destinations + topics panels.
- `…/layout.tsx` — sidebar: Destinations + Taxonomy entries.

**Data**
- `prisma/schema.prisma` — Phase 3 models (details §2).
- `prisma/migrations/20260905205332_phase3_destinations`,
  `20260905205428_phase3_destination_links`,
  `20260905210535_phase3_curated_link_owner`,
  `20260905210734_phase3_curated_link_plain_owner`,
  `20260905210816_phase3_contentlink_owner_nullable`,
  `20260906112541_phase3_restore_owner_fk_restrict` (review addendum §15) — applied.
- `scripts/seed-destinations.ts` — NEW idempotent sample-data seeder.

**Tests**
- `scripts/e2e-destinations.py` — NEW 59-check HTTP matrix.
- `scripts/redir-lab-destinations.py` — NEW destination slug-change 301 lab.

**Docs**
- `docs/13-destinations.md` — NEW architecture doc (§ references in spec order).
- `docs/08-roadmap.md` — Phase 3 (authorized scope) marked DELIVERED; original
  "Phase 3 — Monetization" explicitly marked NOT STARTED / re-numbering left
  to the owner.

## 2. Models & migrations

- `Destination` (+isActive/sortOrder/heroAssetId→MediaAsset; indexes
  countryId, cityId, isFeatured+sortOrder)
- `DestinationTranslation` (+blocks Json, faqGroupId→FaqGroup,
  workflowStatus/publishedAt/archivedAt, verification fields, warningEnabled,
  noindex; indexes locale+workflowStatus, workflowStatus+publishedAt;
  unique [locale,slug] and [destinationId,locale])
- `ArticleDestination` (role PRIMARY|SECONDARY, unique pair)
- `DestinationMedia` (unique pair, position)
- `Topic` / `TopicTranslation` / `ArticleTopic` / `DestinationTopic`
- `Category.isActive`; `ContentLink.targetDestinationId` +
  `ContentLink.ownerDestinationTranslationId` (plain reference — polymorphic
  owner pattern like `FaqGroup.ownerId`; `ownerId` made nullable)
- Inverse arrays on User/MediaAsset/FaqGroup/Article preserved/extended.

## 3. Routes (public)

`/{locale}/morocco/` (DB-first) · `/{locale}/morocco/{city}/` (DB-first) ·
`/{locale}/{dest}/` · `/{locale}/{dest}/{city}/` · `/{locale}/topics/{slug}/` ·
destination previews · sitemap.xml (destinations included, deduped) · RSS
unchanged (destinations excluded by spec).

## 4. Admin

Destinations list/new/editor; taxonomy manager; article-editor destinations +
topics panels; sidebar entries. All mutations behind `requireRole("EDITOR")`
server actions; admin pages also role-gated server-side.

## 5. Localization

23 destination versions (19 PUBLISHED, 4 DRAFT) across en/es/ar; independent
per-locale publishing verified E2E (DRAFT locale → 404 while other locales
serve 200); hreflang published-only with x-default; AR RTL with Latin slugs;
frozen Phase 1 routes switch to strict DB-first mode when a Destination entity
exists (drafts can never leak through the frozen fallback).

## 6. SEO

Canonical `${SITE.url}/${locale}${path}`; hreflang published-only + x-default;
`noindex` for below-threshold content (meta rendered, sitemap-excluded);
BreadcrumbList + FAQPage-only-with-visible-FAQ JSON-LD; sitemap 68 URLs /
258 hreflang alternates (Phase 2: 57/228) with static/DB duplicates removed;
RSS unchanged (no destination URLs — verified).

## 7. Performance

Static-first: ISR (revalidate 300) on all public destination routes; cached
public reads (tag `destinations`, 300 s); related engine returns cards only —
no article bodies for lists; no N+1 (single decorated include per page);
minimal client JS (server components; editors reuse existing client widgets).
Build: `tsc --noEmit` clean · `next build` OK (production bundle same size
class as Phase 2).

## 8. Tests & results (all against the real production server + PostgreSQL)

| Suite | Result |
| --- | --- |
| `scripts/e2e-destinations.py` (59 checks: rendering, locale independence, thin gate, hreflang, SEO/JSON-LD, permissions, 404s/precedence, related content, taxonomy, sitemap/RSS, RTL, redirect serving) | **59/59 PASS** |
| `scripts/redir-lab-destinations.py` (live slug change via real admin UI → automatic 301 → restore → cleanup) | **10/10 PASS** |
| `scripts/e2e-acceptance.py` (Phase 2 regression) | **ALL PASS** |
| `scripts/e2e-translations.py` (Phase 2 regression) | **PASSED** |
| `scripts/redir-lab.py` (Phase 2 article 301 regression) | **PASS** |
| Workflow unit matrix (Phase 2, unchanged files) | 13/13 (last run) |
| `npx tsc --noEmit` | clean |
| `npx prisma validate` + 4 migrations applied | clean |
| `rm -rf .next && npx next build` | OK |

## 9. Bugs found & fixed during Phase 3

1. **ContentLink FK blocked destination-curated links** — `ownerId` had an FK
   to ArticleTranslation. Fixed with a dedicated plain-reference column
   (`ownerDestinationTranslationId`, polymorphic-owner pattern) + nullable
   `ownerId`; Phase 2 links untouched.
2. **Seed created CITY destinations without `countryId`** — broke the
   relationship-derived dynamic city route, breadcrumbs and sibling links.
   Fixed in the seeder; idempotent re-run healed the data.
3. **Frozen Phase 1 fallback leaked unpublished locales** — a DRAFT locale
   fell through to the static sample page (200). Fixed with strict DB-first
   mode (`destinationEntityExists`).
4. **Static/DB sitemap duplicates** — Phase 1 static city/hub entries
   duplicated (and contradicted) DB entries, advertising 404ing URLs.
   Fixed: DB wins; static entries for DB-managed destinations are dropped.
5. **hreflang hrefs missing the locale segment** — alternates pointed to
   locale-less paths. Fixed in all four destination routes.
6. **Renamed destination slugs didn't resolve as anchors** — after a live
   slug change the new URL 404ed (anchor lookup only knew City/Country record
   slugs). Fixed: anchor resolution now tries the destination translation slug
   first (country level) and as a country-scoped fallback (city level), while
   staying relationship-derived.
7. **Nested-type duplicate URLs** — `/en/paris/` rendered the Paris city page
   with a duplicate URL; now 301s to the canonical `/en/france/paris/`.
8. **Curl-based labs** — `-F` parsed `{...}` values as file globs (rc 3);
   switched labs to `--form-string`; server-action forms require scraped
   hidden action fields + a fresh form per POST (documented in the labs).

## 10. Limitations (explicit)

- Topic/category pickers in the admin are ID-list + reference datalists (small
  taxonomy assumption) — a searchable picker component can replace them
  without changing services/actions.
- Article→destination *contextual* ContentLinks (anchor text inside article
  bodies) exist at schema/service level but have no dedicated admin UI yet;
  article↔destination relationships (ArticleDestination) are fully managed.
- No internal search in Phase 3 (spec allows lightweight search as optional —
  not built to avoid scope creep).
- Scheduling for destinations is not wired (spec said "schedule-if-appropriate";
  article scheduling infra exists and can be attached later).
- Middleware keeps a 60 s redirect TTL cache — a slug revert can serve a stale
  301 for ≤60 s (documented Phase 2 behavior; the destination lab waits it out).

## 11. Infrastructure dependencies

None new. PostgreSQL 17 (existing), filesystem media storage (existing),
`NEXT_PUBLIC_SITE_URL` (existing). No external APIs, no secrets added.

## 12. Sample data (as seeded — clearly labeled)

Countries Morocco/Spain/France (+ CountryTranslations en/es/ar) · cities
Marrakech, Fes, Casablanca, Barcelona, Paris (+ CityTranslations) ·
8 destinations: morocco/es/ar, spain/en+es, france/en+es+ar,
marrakech/en+es+ar (+hero, gallery, FAQ), fes/en+es (+AR draft),
casablanca/en+es (+AR draft), barcelona/en+es (+AR draft), paris/en (+ES
draft, +AR **published-but-thin** noindex demo) · explicit links: Marrakech
guide → PRIMARY Marrakech + SECONDARY Morocco/Casablanca; visa guide →
SECONDARY Morocco/Spain; World Cup guide → SECONDARY Morocco/Barcelona/
Casablanca · topics family-travel / entry-requirements / major-events
(en/es/ar) relating 2 articles and 6 destinations · 4 curated related links
(Marrakech↔Fes/Casablanca, Barcelona↔Paris). Every version carries a visible
SAMPLE label; zero fabricated prices/visa/transport/hours/hotels/flights/stats.

## 13. Acceptance criteria (spec §28) — status

1. Real DB entities, no static scaffolding for managed destinations — ✅ (E2E A-block)
2. Localized editorial core (intro/blocks) per destination — ✅
3. Independent per-locale publish (draft → 404, publish → 200) — ✅ (B-block)
4. Explicit article↔destination links (PRIMARY/SECONDARY) — ✅ (seed + E2E I-block)
5. Dynamic assembly of hubs/cities from structure + editorial + links — ✅
6. `/morocco/` DB-driven — ✅ (A1/A2)
7. Breadcrumbs from relationships — ✅ (A7, JSON-LD)
8. Localized SEO metadata — ✅ (E-block)
9. hreflang published-only + x-default — ✅ (D-block)
10. Thin-content protection (noindex + sitemap exclusion, still linkable) — ✅ (C-block)
11. Slug-change → per-locale 301, loop-safe — ✅ (destination redirect lab 10/10)
12. Media reuse (MediaAsset only) — ✅ (hero/gallery via existing library)
13. Verification reuse — ✅ (badge/warning rendered; sample states honest)
14. Article workflow intact — ✅ (Phase 2 suites ALL PASS)
15. Article URLs unchanged — ✅ (`/guides/…` regression green)
16. No later-phase features — ✅ (see §15)
17. No duplicate CMS (single Destination/Translation system; taxonomy extends
    existing Category/Tag) — ✅
18. No mass-generated pages (8 destinations total; all editorial) — ✅
19. `tsc` + production build pass — ✅
20. Real HTTP E2E passes — ✅ (59/59 + all regression suites)

## 14. Binding rules honored

AI never auto-published (all publishing in sample seed data is explicit sample
fixture creation; CMS transitions remain human EDITOR actions — unit matrix +
E2E verified). No mocks. Slugs unique per locale. Latin AR slugs. Brand
untouched. Light theme. Never "By Admin". No client-side secrets.

## 15. Explicit confirmation: Phases 4–10 NOT started

No quiz, no personalization engine, no affiliate engine, no booking, no hotel/
flight APIs, no sports-event engine, no study-abroad engine, no newsletter, no
advertising management, no payments, no large-scale programmatic SEO. Schema
tables for later phases remain exactly as Phase 1/2 left them, untouched by
Phase 3.

---

## 15. ADDENDUM — Human review verification (2026-09-06)

Conditional-approval checks re-verified against the shipping production build
(`scripts/phase3-review-checks.py`, 24/24) plus the full E2E battery
(59/59 destinations, 10/10 destination redirect lab, Phase 2 acceptance /
translation-independence / article-redirect suites ALL PASS; tsc clean;
production build clean; `prisma migrate status` up to date).

**Finding + fix during review:** making `ContentLink.ownerId` nullable had
made Prisma re-add the `ContentLink_ownerId_fkey` constraint with its
optional-relation default (`ON DELETE SET NULL`) instead of the frozen Phase 2
definition (`ON DELETE RESTRICT`, phase2_init migration line 907). No Phase 2
code path deletes article translations, so no behavior was reachable — but the
weaker action was a silent deviation. Restored verbatim via migration
`20260906112541_phase3_restore_owner_fk_restrict` + explicit
`onDelete: Restrict, onUpdate: Cascade` on the schema relation (Prisma-stable).
Live constraint re-verified `RESTRICT/CASCADE`; zero orphans; all Phase 2
suites re-run green after the fix.

Also verified explicitly: APPROVED / SCHEDULED / ARCHIVED states were
empirically probed (temporary state flips, exact-reverted and re-checked) —
routes 404 and sitemap excludes them, exactly as for DRAFT. PUBLISHED is the
only publicly renderable/indexable state on every surface (routes, anchors,
breadcrumbs, related content, hreflang, canonical, sitemap, JSON-LD).

## 16. Explicit confirmation: Phases 4–10 NOT started
