# 09 — CMS architecture (Phase 2)

Status: **implemented in Phase 2**. This document describes the CMS layer as
built: data model, read/write paths, caching, media storage, and the
deployment dependencies that remain.

## 1. Principles

1. **One system.** The CMS extends the existing Prisma schema — no parallel
   content store, no second source of truth. Phase 1 models are untouched.
2. **Structured content, not HTML blobs.** Article bodies are stored as
   JSON block arrays, validated with zod at the boundary
   (`src/lib/cms/blocks.ts`) and rendered server-side to semantic React
   elements (`src/components/cms/BlocksRenderer.tsx`). No
   `dangerouslySetInnerHTML` anywhere.
3. **Static-first public reads.** The public site never queries PostgreSQL
   per request. All public reads go through `unstable_cache`
   (`src/lib/cms/public-queries.ts`, tags `["articles"]`, revalidate 300).
   CMS mutations invalidate precisely (`src/lib/cms/revalidate.ts`).
4. **No mocks.** Publishing publishes, scheduling schedules, uploads persist
   to disk, preview renders the real components. External systems that are
   not configurable yet are marked **infrastructure dependencies** below.

## 2. Data model (summary)

Full definitions in `prisma/schema.prisma` (migration
`20260904211007_phase2_init`, 50 tables).

- **Article** — locale-independent core: author, category, featured image
  (`heroImage`), tags.
- **ArticleTranslation** — everything per-locale: title/slug/h1/excerpt/
  `blocks` (JSON) + all editorial fields: `workflowStatus`, verification
  (`verificationStatus`, `lastVerifiedAt`, `verifiedById`,
  `verificationNotes`), SEO (`seoTitle`, `metaDescription`,
  `canonicalOverride`, `ogImageId`, `noindex`), scheduling
  (`publishedAt`, `scheduledAt`), `readingMinutes`, `faqGroupId`,
  `warningEnabled`. Uniques: `[locale, slug]` and `[articleId, locale]`.
  **Each locale is independently editable and independently publishable.**
- **ArticleRevision** — structured snapshots (JSON) taken before every edit
  and before publish-grade transitions; restore creates a new revision
  first (nothing is destroyed).
- **ArticleTransition** — workflow audit: actor, from → to, notes, time.
- **User / Session** — scrypt password hashes; sessions store only a
  SHA-256 token hash.
- **MediaAsset** (+ per-locale translations) — opaque storage keys, MIME,
  dimensions, credit/source/license, `aiGenerated` disclosure flag.
- **Redirect** — per-locale 301 mappings, unique `[locale, sourcePath]`.
- **ContentLink** — editor-curated internal links between translations.
- **Author / AuthorTranslation, Category / CategoryTranslation,
  Tag / TagTranslation, FaqGroup / FaqItem / FaqItemTranslation** —
  localized taxonomy and FAQ.

## 3. Read paths

| Surface | Module | Notes |
|---|---|---|
| Article page | `getPublishedArticle(locale, slug)` | cached, ISR `revalidate = 300` |
| Listings (home, hubs) | `listPublishedArticles(locale, …)` | cached, tag `articles` |
| Sitemap | `publishedForSitemap()` | published + indexable only |
| RSS | `publishedForRss(locale)` | dynamic route, always fresh |
| Author pages | `publishedByAuthor(locale, slug)` | active author, published only |
| Preview | `getTranslationForPreview(id)` | **uncached**, auth/token-gated |

**Visibility predicate (hard rule):** `workflowStatus = PUBLISHED AND
(publishedAt IS NULL OR publishedAt ≤ now)`. Implemented as
`PUBLISHED_FILTER()` — a function, because a module-level constant would
freeze its `new Date()` at server start (this exact bug was caught by E2E).

> **Cache-staleness contract:** public pages are ISR with a 300 s window.
> CMS mutations call `revalidateTag("articles")` + `revalidatePath` for the
> affected article, hub, home, sitemap and RSS paths, so *CMS-driven*
> changes are visible immediately. A change made directly in the database
> (bypassing the CMS) becomes visible within the ISR window.

## 4. Write paths

All mutations are Next.js **server actions**
(`src/app/actions/{auth,articles,media,admin}.ts`) → service layer
(`src/lib/cms/{articles,media,authors,redirects}.ts`):

1. `requireUser()` / `requireRole(...)` — server-side authorization.
2. zod validation (blocks schema, slug charset, SEO field lengths,
   canonical-override shape).
3. Ownership rule: `AUTHOR` may only edit/submit their own articles.
4. Revision snapshot **before** every change.
5. Mutation.
6. Side effects: audit transition, slug-change 301 creation, public
   revalidation (tag + paths).

## 5. Media pipeline

`src/lib/storage.ts` defines `MediaStorage` with a **local-disk driver**
(opaque keys `{timestamp36}{16hex}.{ext}` under `MEDIA_STORAGE_DIR`) and an
S3 driver that **throws "not configured"** — the documented infrastructure
dependency. Uploads: magic-byte sniffing, real image decode (sharp) for
dimensions, size cap (`MEDIA_MAX_MB`), localized alt/caption, credit,
source URL, license, and an `aiGenerated` flag that is surfaced on the
public site ("AI-generated image") — AI media is never presented as real
photography. Files are served through `/media/[key]` with immutable
caching; original filenames/paths are never exposed. Hard delete is blocked
while any article references the asset.

## 6. Redirects

- Created automatically when a **live** translation's slug changes
  (301 old → new) and manageable by ADMIN at `/admin/en/redirects/`.
- Applied by Node-runtime middleware (`src/middleware.ts`, pg pool with a
  60 s in-process TTL cache, loop guard, fail-open on DB error).
- **Instant fallback:** the article page performs one uncached redirect
  lookup on its 404 path, so slug-change 301s are effective immediately
  even if the middleware cache still holds a "no mapping" entry
  (emitted as 308, the permanent equivalent; the middleware emits exact 301).

## 7. Scheduled publishing

`publish` and `schedule` are separate explicit human actions (EDITOR+).
`/api/cron/publish` (Bearer `CRON_SECRET`) promotes due `SCHEDULED`
translations (`scheduledAt ≤ now` → `PUBLISHED`, `publishedAt` set) and
revalidates their public paths; the promotion is recorded in the audit
trail with actor = system.

> **Infrastructure dependency:** the cron endpoint must be called by the
> platform scheduler (e.g. every minute: Vercel Cron / systemd timer /
> k8s CronJob). Until a scheduler is configured, scheduled articles
> promote on the first cron call — no mock timer is embedded.

## 8. Middleware composition (Node runtime)

1. `/admin/*` — cheap cookie-signature gate (HMAC); the real session and
   role checks happen server-side in layouts and actions.
2. DB-backed 301 redirects for `/{locale}/…` paths.
3. next-intl locale negotiation for the public site (admin is excluded).

Enabled via `export const config = { runtime: "nodejs" }` (stable in
Next 15.5; the `experimental.nodeMiddleware` flag no longer exists).

## 9. Remaining deployment security (not certification)

- Serve the admin area behind HTTPS; session cookies are `Secure` in
  production builds.
- `SESSION_SECRET` must be 32+ random chars and rotated to invalidate all
  sessions; `CRON_SECRET` must be unique per environment.
- PostgreSQL must not be exposed publicly; the app connects over a private
  network in production.
- Rate-limit the login action at the edge/proxy layer (not implemented
  in-app in Phase 2).
- Object storage (S3 driver) needs bucket + CDN wiring at deploy time.
