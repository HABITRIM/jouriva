# Folder structure

```
jouriva/
├── docs/                        # project documentation (this folder)
│   └── PHASE1-REPORT.md         # Phase 1 delivery report
├── prisma/
│   └── schema.prisma            # relational data-model foundation
├── public/
│   ├── brand/
│   │   ├── logo/                # SVG logo masters (drop-in, see README)
│   │   └── favicon/             # favicon master + fallbacks (see README)
│   └── images/                  # placeholder photography (see README)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # passthrough root (shell lives in [locale])
│   │   ├── not-found.tsx        # 404 for invalid locale paths
│   │   ├── sitemap.ts           # XML sitemap (hreflang alternates)
│   │   ├── robots.ts            # robots.txt
│   │   ├── manifest.ts          # PWA manifest
│   │   └── [locale]/
│   │       ├── layout.tsx       # <html lang dir> shell, header/footer, Org schema
│   │       ├── page.tsx         # homepage
│   │       ├── hub-screen.tsx   # shared section-hub screen + metadata factory
│   │       ├── morocco/         # /{locale}/morocco/ + /[city]/ pattern
│   │       ├── world/ … contact/# 12 section hubs (thin pages, one per IA entry)
│   │       ├── guides/[slug]/   # article pattern (per-locale slugs)
│   │       ├── rss.xml/         # per-locale RSS 2.0 feed
│   │       ├── not-found.tsx    # localized 404
│   │       └── [...rest]/       # catch-all → localized 404
│   ├── components/              # reusable UI foundation
│   │   ├── Header.tsx  Footer.tsx  MobileNav.tsx  LanguageSwitcher.tsx
│   │   ├── SearchBox.tsx  Logo.tsx  NewsletterForm.tsx
│   │   ├── cards.tsx            # ArticleCard · DestinationCard · SectionHeader · TopicChip
│   │   ├── Breadcrumbs.tsx  Faq.tsx  Verification.tsx  AdSlot.tsx  JsonLd.tsx
│   ├── content/                 # typed sample content layer (Phase 2 → CMS)
│   │   ├── types.ts  authors.ts  articles.ts  cities.ts  hubs.ts  index.ts
│   ├── i18n/                    # next-intl wiring
│   │   ├── routing.ts           # locales, direction, defaults
│   │   ├── navigation.ts        # locale-aware Link/router
│   │   └── request.ts           # per-request messages
│   ├── lib/                     # framework-agnostic foundations
│   │   ├── config.ts            # site config, nav IA, socials (non-secret)
│   │   ├── seo.ts               # canonical/hreflang/OG/Twitter metadata builder
│   │   ├── schema.ts            # JSON-LD builders (Org/WebSite/FAQ/Breadcrumb/Article)
│   │   ├── ads.ts               # ad-slot placement registry + demo toggle
│   │   ├── verification.ts      # verification statuses & styles
│   │   └── fonts.ts             # next/font (Playfair, Inter, Tajawal)
│   ├── messages/                # UI strings per locale (en/es/ar)
│   ├── styles/globals.css       # Tailwind v4 @theme design tokens
│   └── middleware.ts            # locale negotiation (/ → /en/)
├── next.config.ts               # trailingSlash, security headers, images
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── .env.example                 # env template (secrets never committed)
└── .gitignore
```

Conventions: `@/*` path alias → `src/*`. Section hubs are deliberately thin
files binding a key to the shared `HubScreen` — adding an IA entry means
adding one folder with a 10-line page plus one entry in `src/content/hubs.ts`.
