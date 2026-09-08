# JOURIVA — PHASE 1 DELIVERY REPORT

**Scope:** Brand + Product + Technical Foundation
**Date:** 2026-09-03
**Status:** ✅ Complete — all Phase 1 checks passed
**Boundary respected:** No CMS, no full article engine, no quiz logic, no affiliate/ad
integrations, no sports/study-abroad databases, no mass content, no programmatic
generation. **Stopped after Phase 1 — awaiting human review before Phase 2.**

---

## ✅ PHASE 1 APPROVED (human review) — binding decisions recorded

Owner decisions that bind all later phases (do not revert in Phase 2+):

1. **Brand architecture kept.** The reconstructed SVG masters are acceptable provisional
   assets; they remain centralized (`src/lib/brand.ts`) and replaceable **without
   component changes**.
2. **Arabic URLs keep Latin/transliterated slugs** (`/ar/guides/dalil-marrakech-lil-usar/`).
   Do NOT switch to Arabic-script slugs.
3. **Canonical domain stays configurable via `NEXT_PUBLIC_SITE_URL`.** Do not hard-code
   the provisional domain into application logic (the documented fallback in
   `src/lib/config.ts` is the only permitted occurrence).
4. **Multilingual architecture preserved:** `/ar/` `/en/` `/es/` with independent
   localized content, metadata, slugs, canonicals and hreflang.
5. **Prisma relational architecture + typed content shapes preserved.**
6. **Phase 3/4/5+ features must NOT be implemented** until their phases are authorized.
7. **No redesign/replacement of the JOURIVA visual identity** before Phase 2 begins.

---

## 1. What was implemented

| Area | Delivered |
| ---- | --------- |
| **Brand** | Design-token system (5 brand colors + derived AA-safe shades), typography system (Playfair/Inter/Tajawal), logo drop-in layer, Moroccan 8-point-star motif (decorative, not logo), OG banner, favicon placeholder |
| **Product foundation** | Full IA (13 entries), 12 localized section hubs, city destination pattern, article pattern, quiz/tools/deals/updates hub scaffolds with honest "coming soon" states |
| **Technical foundation** | Next.js 15 (App Router, TS strict, Tailwind v4, next-intl v4), static-first rendering (66 prerendered pages), typed sample-content layer, Prisma relational data model |
| **Architecture** | i18n routing + RTL, SEO library, schema builders, ad-slot registry, verification system, author system, provider-agnostic monetization schema |
| **SEO foundation** | Canonical + hreflang (+x-default), OG/Twitter, sitemap, robots, per-locale RSS, 5 JSON-LD schema types, breadcrumbs |
| **Responsive shell** | Editorial header (desktop 2-tier nav / mobile drawer), footer with newsletter, skip link, accessible navigation |

## 2. Files / folders created

88 files (see `docs/01-folder-structure.md` for the annotated tree). Highlights:

- `src/app/[locale]/` — layout + home + 12 hub pages + `morocco/[city]` + `guides/[slug]` + `rss.xml` + 404s
- `src/app/` — `sitemap.ts`, `robots.ts`, `manifest.ts`, root 404
- `src/components/` — 14 reusable components
- `src/lib/` — `seo.ts`, `schema.ts`, `ads.ts`, `verification.ts`, `config.ts`, `fonts.ts`
- `src/i18n/` + `src/messages/{en,es,ar}.json`
- `src/content/` — typed sample layer (3 articles × 3 locale versions, 3 cities, 12 hubs, 1 author)
- `prisma/schema.prisma` — 30 models / 8 enums
- `public/brand/` + `public/images/` (with disclosure READMEs)
- `docs/` — 9 documentation files + this report

## 3. Architecture decisions

| # | Decision | Rationale |
| - | -------- | --------- |
| 1 | **Next.js 15 + TS + Tailwind v4 + next-intl v4** | Owner-confirmed choice |
| 2 | **Static-first** (SSG everything, zero DB at runtime) | Best possible CWV; Phase 2 adds CMS behind the same shapes |
| 3 | **Typed sample-content layer** (`src/content`) mirroring the DB contract | Demonstrates the real content architecture without a CMS |
| 4 | **Base entity + per-locale translation rows** | Spec: related translations, per-locale independence, per-locale slugs |
| 5 | **Provider-agnostic monetization** (providers are data rows; slot/placement registries) | Spec: no hard-coded affiliate/ad provider |
| 6 | **4 client components only** (LanguageSwitcher, MobileNav, SearchBox, NewsletterForm) | Minimal JS (~101 kB first-load shared) |
| 7 | **Light theme only; navy `section` bands** | Spec (no global dark-mode switch) |
| 8 | **Trailing-slash, locale-prefixed URLs** | Spec URL architecture |
| 9 | **Verification as first-class fields + UI** | Spec: time-sensitive content handling |
| 10 | **Brand placeholder strategy** (documented typographic wordmark; swap-in detection) | Owner decision; no logo recreated in CSS |

## 4. Database / data-model foundation

`prisma/schema.prisma` — validated ✅ (PostgreSQL; no DB provisioned in Phase 1).

- **30 models:** Locale, TranslationGroup, Country/City/Destination (+T), Category (tree),
  Tag, Author(+T), MediaAsset(+T), Article(+T), ArticleTag, ContentLink, FaqGroup/Item(+T),
  SportEvent(+T), SportEventEdition(Host), Venue, EditionVenue, StudyDestination(+T),
  University(+T), Scholarship(+T), TravelUpdate(+T), AffiliateProvider/Offer, ArticleOffer,
  AdProvider, AdSlot, NewsletterSubscriber, QuizSubmission. *(+T = per-locale translation table)*
- **8 enums:** Direction, ContentStatus, VerificationStatus, DestinationType, UpdateType,
  OfferVertical, AdPlacement, SubscriptionStatus.
- Covers every Phase 1 requirement: destinations hierarchy, sports event→edition→host→venue
  chain (event-agnostic), study-abroad, verification workflow, provider-agnostic offers
  across 11 verticals, 6 ad placements, FAQ attachable to any entity, managed internal links.

## 5. Routes created (×3 locales each unless noted)

```
/                                   → 307 redirect to /en/
/{locale}/                          home
/{locale}/morocco/                  hub          /{locale}/travel-updates/  hub
/{locale}/morocco/{city}/           ×3 cities    /{locale}/guides/          hub
/{locale}/world/                    hub          /{locale}/deals/           hub
/{locale}/travel-for-moroccans/     hub          /{locale}/tools/           hub
/{locale}/sports-travel/            hub          /{locale}/quiz/            hub
/{locale}/study-abroad/             hub          /{locale}/about/           hub
/{locale}/contact/                  hub
/{locale}/guides/{slug}/            ×3 articles, PER-LOCALE slugs:
   en: marrakech-with-kids-48-hours · visa-free-countries-moroccan-passport · world-cup-2030-moroccan-fans-planning-guide
   es: marrakech-con-ninos-48-horas · paises-sin-visa-pasaporte-marroqui     · mundial-2030-guia-aficionados-marroquies
   ar: dalil-marrakech-lil-usar     · duwal-bila-tashira                    · kass-alalam-2030-dalil
/{locale}/rss.xml                   per-locale RSS 2.0
/sitemap.xml /robots.txt /manifest.webmanifest /brand/favicon/icon.svg
/{locale}/{unknown}/               → localized 404 (HTTP 404)
/{invalid-locale}/…                → root 404 (HTTP 404)
```

66 pages prerendered at build; trailing-slash normalization (308); `/en` → `/en/` verified.

## 6. SEO foundation

- ✅ Canonical URLs (`NEXT_PUBLIC_SITE_URL`-driven) — verified in HTML
- ✅ hreflang: `ar`/`en`/`es` + `x-default`, **with per-locale article slugs** — verified
- ✅ Open Graph (`og:locale` + alternates) + Twitter/X `summary_large_image` — verified
- ✅ XML sitemap: 57 URLs, per-URL hreflang alternates, lastModified — verified
- ✅ robots.txt (allow all, disallow `/api/`, sitemap, host) — verified
- ✅ JSON-LD: Organization, WebSite, Article, FAQPage, BreadcrumbList, Person — verified
- ✅ Author system (real profile: role/bio/expertise per locale — no "By Admin")
- ✅ RSS 2.0 per locale — verified (localized titles)
- ✅ Google Discover readiness (`max-image-preview:large`), social `sameAs` registry
- ✅ Programmatic-SEO *readiness* without generation (quality gate documented in
  `docs/ARCHITECTURE.md` §4 — no pages mass-generated, per spec)

## 7. i18n / RTL implementation

- 3 independent locales, `localePrefix: always`; `/` → `/en/` via middleware
- `<html lang dir>` set per locale — **verified `dir="rtl"` on `/ar/`**
- Full CSS-logical-property layout (ms/me/ps/pe/start/end) + RTL-flipped breadcrumb chevron
- Arabic typography swap to Tajawal via `html[lang="ar"]` variable override
- Content independence demonstrated: per-locale slugs, SEO titles, metas, FAQs, excerpts;
  translation relationships encoded in the model (base-entity grouping → hreflang)
- Language switcher preserves the current path across locales (native `<select>`, accessible)

## 8. Brand implementation

- Tokens: navy `#0D2B45`, terracotta `#C86845`, sand `#F6EFE5`, white, charcoal `#1A1A1A`
  + derived AA-contrast shades (terracotta-ink/bright for small text, navy tints, sand-dark)
- Typography: Playfair Display (EN/ES headings) · Inter (EN/ES UI/body) · Tajawal (AR) —
  self-hosted via `next/font`, zero layout shift
- **Logo system (installed, owner-authorized):** masters built to the approved
  **Horizon Path** direction with strict brand-fidelity rules — stylized J as the
  structure, the journey path integrated as the J's bowl rising to a **clean horizon
  colour-split** (navy/terracotta), the **8-point khatam star as the J's tittle**,
  **no dotted horizon** in the primary (optional editorial asset only:
  `jouriva-horizon-editorial.svg`), no airplane/globe/luggage/compass, no ornament.
  Set: primary lockup + dark lockup (wordmark outlined from real Playfair Display
  Bold via `scripts/build-wordmark.mjs`), symbol-only, dark-background, mono-dark/
  mono-light, simplified favicon master. All centralized in `src/lib/brand.ts` —
  replacement files drop in with zero component changes. Rendered exclusively via
  `<img>` from the masters — never redrawn in CSS/HTML.
- **Favicon package (complete):** `favicon.svg`, multi-size `favicon.ico` (16→256),
  `favicon-16…256.png`, `apple-touch-icon.png` (180), `icon-192/384/512.png` — generated
  by `scripts/build-favicons.mjs` (sharp + custom ICO packer), auto-detected and
  emitted as metadata/manifest links.
- **Size validation:** symbol + favicon tile inspected at **16 / 32 / 48 / 128 / 512 px**;
  the J + horizon split stays legible and the star remains visually integrated at 16 px
  (small-size master keeps the tittle solid).
- Moroccan geometric influence elsewhere: subtle 8-point-star tile motif (CSS/SVG
  decoration) — kept visually distinct from the logo
- OG banner + placeholder photography: **AI-generated, disclosed in `public/images/README.md`**

## 9. Components created

Header · Footer · MobileNav · LanguageSwitcher · SearchBox · Logo · NewsletterForm ·
ArticleCard · DestinationCard · SectionHeader · TopicChip · Breadcrumbs · Faq ·
AuthorBlock · VerificationBadge · VerificationWarning · AdSlot · JsonLd · HubScreen
(inventory + contracts in `docs/06-components.md`).

## 10. Tests / checks performed (all passing)

| Check | Result |
| ----- | ------ |
| `tsc --noEmit` (strict) | ✅ PASS |
| `next build` (production) | ✅ 66/66 pages prerendered, ~101 kB shared first-load JS |
| `prisma validate` | ✅ schema valid |
| Route matrix (30+ URLs × statuses) | ✅ all 200; localized 404 = 404; invalid locale = 404 |
| Redirects | ✅ `/` → `/en/` (307); `/en` → `/en/` (308) |
| RTL/LTR | ✅ `dir` per locale verified; logical properties; chevron flip |
| hreflang/canonical (incl. per-locale slugs + x-default) | ✅ verified in HTML |
| OG / Twitter / JSON-LD / RSS / sitemap / robots / manifest | ✅ verified |
| Accessibility pass | ✅ single h1/page, skip link, landmarks, localized aria-labels, focus-visible, reduced-motion, native select/summary controls |
| Verification UI | ✅ status badge + last-verified date + standing warning present |
| Brand assets & references | ✅ favicon package (svg/ico/png/apple/manifest icons) all 200; zero broken refs (full scan) |
| Missing-message scan (3 locales) | ✅ zero IntlError/MISSING_MESSAGE leaks |
| Ad slots | ✅ CLS-safe reserved slots render with placement data attributes |

## 11. Known limitations

1. **Logo/favicon:** masters are **owner-authorized creations** built to the approved
   visual direction (SVG uploads unsupported; source TXT carried no code). Replace with
   designer source at any time — same filenames, zero code changes;
   `scripts/build-wordmark.mjs` + `node scripts/build-favicons.mjs` regenerate everything.
2. **Photography is AI-generated placeholder** (disclosed); replace before launch.
3. **Content is a curated sample** (3 articles, 3 cities) demonstrating patterns — not launch content.
4. **Search, newsletter delivery, quiz logic, affiliate/ad serving** are foundations only
   (UI + schema + registries), per the phase boundary.
5. Footer legal entries are placeholders (no pages yet — avoids dead links).
6. Schema `logo`/lockup auto-detect the masters (`src/lib/brand.ts`); alternate
   filenames (e.g. `logo-lockup.svg`) take precedence if designer files use them.
7. Mobile search lives in the drawer; desktop search is header-inline (single implementation).

## 12. Assumptions made

- `https://www.jouriva.com` as canonical origin (env-configurable).
- `en` = default locale for `x-default`; `localePrefix: always` (no unprefixed URLs).
- City slugs shared across locales; article slugs independent per locale (both supported).
- Email `hello@jouriva.com` / handle `@jouriva` / social URLs are provisional placeholders.
- Sample author "Salma Benali" is explicitly marked as sample (replace in Phase 2).
- Tailwind v4 (CSS-first tokens) is acceptable as the styling approach for "Tailwind".
- Quiz/tools/deals hubs use honest "coming soon" states rather than fake functionality.

## 13. Open questions

1. ~~Brand assets~~ — **resolved:** reconstruction authorized and installed; designer SVG
   source can still replace it later (same filenames, zero code changes).
2. **Domain:** apex `jouriva.com`, `www.jouriva.com`, or other? (affects `NEXT_PUBLIC_SITE_URL`)
3. **Arabic URL slugs:** current Arabic articles use transliterated Latin slugs
   (`dalil-marrakech-lil-usar`). Keep Latin slugs for AR, or switch to Arabic-script slugs
   (`/ar/دليل-مراكش/`)? (Architecture supports either; Latin is safer for sharing/analytics.)
4. **Hosting target** (Vercel vs Docker/VPS) — no code impact in Phase 1; informs Phase 2 infra.
5. Preferred newsletter provider (Phase 4) and ad/affiliate partners (Phase 3) — needed only later.

## 14. Recommendations for Phase 2

1. **CMS layer**: provision PostgreSQL, implement the Prisma models, replace the
   `src/content` sample source with DB queries (shapes already match).
2. **Editorial workflow** exactly per spec (keyword → brief → AI outline → draft →
   fact-check → SEO analysis → **human review** → translation → **human review** →
   publish; never AI → auto-publish), with verification-status enforcement for
   time-sensitive content.
3. **Author system** with real profiles + avatar upload (MediaAsset).
4. **Redirect management** for slug changes (per-locale).
5. **Internal linking tooling** on top of the `ContentLink` entity.
6. Defer: quiz (P5), affiliate/ad integrations (P3), tools (P4) — dependencies documented
   in `docs/08-roadmap.md`.

---

**Phase 1 is complete and verified. Stopping here — awaiting human review before any
Phase 2 work.**
