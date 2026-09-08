# Data model foundation

`prisma/schema.prisma` defines the relational model that Phase 2's CMS will
run on. Phase 1 ships it as the **contract** — no database is provisioned.

## Core pattern: locale-independent facts + translation tables

Every localized entity is split:

- **Base entity** — invariants + relations + workflow state
  (`Article`, `City`, `Country`, `TravelUpdate`, …).
- **`*Translation` table** — one row per locale, `UNIQUE(entityId, locale)`
  and `UNIQUE(locale, slug)`. All localized fields live here: name, slug,
  SEO title, meta description, canonical override, body, FAQ reference…

Consequences (all required by the spec):

- A translation is **optional**: `/es/` can have an article `/en/` lacks.
- Slugs are **independent per locale** (see the sample articles: three
  different slug sets, related by one base `Article` row).
- The base row is the **translation-group anchor** → hreflang/alternates
  come free (`translationGroupId` also exists for explicit grouping).

## Entity map

| Domain | Entities |
| ------ | -------- |
| Languages | `Locale`, `TranslationGroup` |
| Geography | `Country(Translation)`, `City(Translation)`, `Destination(Translation)` |
| Editorial | `Category` (tree), `Tag`, `Author(+Translation)`, `MediaAsset(+Translation)`, `Article(+Translation)`, `ArticleTag`, `ContentLink` |
| FAQ | `FaqGroup` → `FaqItem` → `FaqItemTranslation` (attachable to any entity) |
| Sports | `SportEvent` → `SportEventEdition` → hosts (`*Host`), `Venue`, `EditionVenue` |
| Study abroad | `StudyDestination`, `University`, `Scholarship` (+translations) |
| Updates | `TravelUpdate(+Translation)` with `UpdateType`, `VerificationStatus`, `lastVerifiedAt`, `expiresAt`, `sourceUrl` |
| Monetization | `AffiliateProvider` → `AffiliateOffer(vertical)` → `ArticleOffer`; `AdProvider` → `AdSlot(placement, formats)` |
| Audience | `NewsletterSubscriber(email, locale, status, source)`, `QuizSubmission(answers JSON)` |

## Verification workflow (first-class)

`VerificationStatus = VERIFIED | NEEDS_REVIEW | OUTDATED | ARCHIVED`
plus `lastVerifiedAt` live on both `Article` and `TravelUpdate`, with
`warningEnabled` controlling the "verify with official sources" banner.
The UI counterpart is `src/components/Verification.tsx` + `src/lib/verification.ts`.

## Sports architecture (event-agnostic)

`SportEvent` ("world-cup", "afcon", "olympics"…) → `SportEventEdition`
("2030") → host countries → venues. Nothing is specific to one event, so any
future edition/competition is data, not code. Articles can attach to the
event and/or edition (`eventId`, `editionId`).

## Monetization (provider-agnostic)

Providers are rows, not SDKs: `AffiliateProvider.key` + `AffiliateOffer` with
`urlTemplate` + `trackingParams` + `vertical` (flights, hotels, event tickets,
insurance, travel cards, eSIM, gear, tours, apartments, trains, study-abroad
services). Swapping or adding an affiliate/ad provider is data entry, and
Phase 3 adapters map placement keys → provider units without layout changes.

## Extensibility notes

- `Category` is a self-referencing tree → new verticals without migrations.
- `Destination.type` covers country/city/region/attraction/venue.
- `FaqGroup(ownerType, ownerId)` attaches FAQs to any content type.
- `ContentLink(ownerType, ownerId, target…)` powers managed internal linking.
- Enum-driven statuses everywhere — no free-text state.
