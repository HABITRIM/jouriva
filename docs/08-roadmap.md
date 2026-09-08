# Roadmap — phase dependencies

Phase 1 delivers the foundation. Nothing below should be started without
explicit authorization; this document records what later phases plug into.

## Phase 2 — CMS + Article engine — ✅ DELIVERED + APPROVED (2026-09-04; FROZEN)
**Delivered:** migration `20260904211007_phase2_init` (50 tables),
editorial workflow state machine with human publish gate + audit trail,
per-locale independent editing/publishing, verification system, preview
tokens, media library (local driver real, S3 = documented dependency),
authors with public pages, per-locale 301 redirects, scheduled publishing
via `/api/cron/publish`, DB-backed public reads (SSG/ISR + tag/path
revalidation). Reports: `docs/PHASE2-REPORT.md`; docs 09–12.
**Frozen decisions preserved:** Phase 1 architecture, brand, i18n and URL
strategy unchanged; AI never auto-publishes; no mocks.
**Open infrastructure (deploy-time):** cron scheduler endpoint, S3/CDN
storage driver, edge rate limiting (docs/09 §7/§9, docs/11 §7).
**Plugs into (for later phases):** `AdSlot` placements unchanged;
`NewsletterSubscriber`, quiz, deals and tools entities already in the
schema and untouched by Phase 2.

## Phase 3 — Destination, Taxonomy & Content Discovery Engine — ✅ DELIVERED + FINAL APPROVAL (2026-09-06; Phase 3 FROZEN)

Authorized spec: destinations as structured entities + editorial core +
related content; topics/categories taxonomy; deterministic discovery;
DB-driven hubs (`/morocco/`, city pages); thin-content protection; per-locale
independent publishing; destinations in the quality-gated sitemap only (never
RSS). See `docs/13-destinations.md` + `docs/PHASE3-REPORT.md`.
Sample data: Morocco/Spain/France + Marrakech/Fes/Casablanca/Barcelona/Paris
(labeled, factual). All Phase 3 acceptance criteria verified (E2E 59/59 +
Phase 2 regression suites green).

## Phase 4 — Search, Discovery & Content Navigation Engine — ✅ DELIVERED + FINAL APPROVAL (2026-09-06; Phase 4 FROZEN)

PostgreSQL-first, provider-agnostic search at /{locale}/search with
deterministic ranking (relevance > freshness), filters, bounded pagination,
autocomplete, privacy-conscious query analytics + admin Search Insights,
noindex/follow SEO (never in sitemap/RSS). Published-only, current-locale
enforced server-side. SearchProvider abstraction allows a future external
engine without UI changes. E2E 67/67 + all Phase 1–3 regression suites green.
See docs/PHASE4-REPORT.md. E2E 76/76 after the candidate-cap audit fix.
**Approved 2026-09-06 — Phase 4 FROZEN** (audit closed; accent-sensitive
ILIKE recall accepted as a documented limitation — future enhancement only;
no header search in this phase).

## Monetization — originally listed as Phase 3 — **NOT STARTED** (numbering to be re-confirmed by the owner)

**Plugs into:** `AdSlot` placement registry (`src/lib/ads.ts`),
`AffiliateProvider`/`AffiliateOffer`/`AdSlot` entities, `.env` policy
(server-side keys only).
**Scope hints:** affiliate provider adapters (provider-agnostic), ad provider
integration, deals pipeline, disclosure components near offers.

## Travel Tools + Newsletter — originally listed as Phase 4 — NOT STARTED (renumbering to be re-confirmed by the owner)
**Plugs into:** Tools hub page, `NewsletterSubscriber` entity,
`NewsletterForm` (form contract: email + locale + source).
**Scope hints:** currency converter, trip budget calculator, packing
checklist, timezone/distance tools, trip planner, informational-only visa
checker (never presents as legal advice or guarantees).

## Smart Destination Quiz — originally listed as Phase 5 — NOT STARTED (renumbering to be re-confirmed by the owner)
**Plugs into:** Quiz hub page, `QuizSubmission` entity, destination content,
affiliate offers.
**Scope hints:** inputs (departure, budget, duration, party, style, climate,
visa-free preference, region, comfort, sports) → outputs (top-5 destinations
with why/budget/season/visa/hotels/tours/flights/guides) →
Quiz → Destination Content → Affiliate Offers.

## Programmatic SEO + Sports/Study-abroad databases — originally listed as Phase 6 — NOT STARTED (renumbering to be re-confirmed by the owner)
**Plugs into:** sitemap builder, `SportEvent*` entities, `StudyDestination`/
`University`/`Scholarship` entities, quality gate (ARCHITECTURE §4).
**Gate:** unique value · search intent · useful content · internal links ·
metadata · quality threshold · editorial review. No thin/doorway pages.

## Standing rules (from Phase 1 spec + owner approval)

- Translations related, never duplicated; per-locale independence everywhere.
- Time-sensitive content always carries verification status + warning.
- Advertising/affiliate must never damage UX or Core Web Vitals.
- Portability: no hard vendor lock-in; secrets never client-side.

## Owner decisions binding Phase 2+ (approved 2026-09)

1. Brand assets: keep centralized/replaceable architecture; reconstructed masters are
   acceptable provisional assets.
2. Arabic URLs: **Latin/transliterated slugs only** — no Arabic-script slugs.
3. Canonical domain: `NEXT_PUBLIC_SITE_URL`-driven only; no hard-coded domains in logic.
4. Keep `/ar/` `/en/` `/es/` architecture with independent content/metadata/slugs/hreflang.
5. Keep the Prisma relational model and typed content shapes.
6. Do not implement Phase 3/4/5+ features before their authorization.
7. Do not redesign or replace the JOURIVA visual identity before Phase 2 begins.
