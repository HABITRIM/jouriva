# Component system (Phase 1 foundation)

All components are React Server Components unless marked (client).

## Layout

| Component | File | Notes |
| --------- | ---- | ----- |
| `Header` | `components/Header.tsx` | Responsive editorial header: logo · search · language · CTA + two-tier desktop nav; mobile drawer via `MobileNav` |
| `Footer` | `components/Footer.tsx` | Mission, IA columns, socials, legal, newsletter |
| `MobileNav` (client) | `components/MobileNav.tsx` | Full IA drawer: nav, search, language, CTA; Escape/scrim close, focus management |
| `LanguageSwitcher` (client) | `components/LanguageSwitcher.tsx` | Native `<select>`; keeps the same path across locales |
| `SearchBox` (client) | `components/SearchBox.tsx` | Semantic `role="search"`; honest "later phase" response |
| `Logo` | `components/Logo.tsx` | Renders supplied SVG master when present, else documented placeholder |
| `NewsletterForm` (client) | `components/NewsletterForm.tsx` | Capture foundation (email+locale+source), demo behaviour |

## Editorial content

| Component | File | Notes |
| --------- | ---- | ----- |
| `ArticleCard` | `components/cards.tsx` | Image + stretched-link title + meta (author/date) |
| `DestinationCard` | `components/cards.tsx` | City destination card |
| `SectionHeader` | `components/cards.tsx` | Kicker + title + optional "view all" |
| `TopicChip` | `components/cards.tsx` | Hub topic chip (links only to existing routes) |
| `Breadcrumbs` | `components/Breadcrumbs.tsx` | Logical-property layout, RTL-aware chevron |
| `Faq` | `components/Faq.tsx` | `<details>/<summary>`, no-JS friendly |
| `AuthorBlock` | `components/Verification.tsx` | Role, bio, expertise, updated date — no "By Admin" |
| `VerificationBadge` | `components/Verification.tsx` | Status + last-verified date |
| `VerificationWarning` | `components/Verification.tsx` | Standing "verify with official sources" note |
| `AdSlot` (async) | `components/AdSlot.tsx` | Reserved-height placement frame; `mobileSticky` variant |
| `JsonLd` | `components/JsonLd.tsx` | JSON-LD injector |
| `HubScreen` | `app/[locale]/hub-screen.tsx` | Shared section-hub composition + metadata factory |

## Conventions

- Server-first; only 4 client components (header interactions, forms).
- Content-agnostic: cards/FAQ/etc. take typed props from `src/content/types.ts`.
- Accessibility built in: semantic landmarks, `aria-*`, visible focus,
  contrast-checked color pairings, reduced-motion support.
- Adding a section hub = folder + `hubGenerateMetadata("key")` + hub entry.
