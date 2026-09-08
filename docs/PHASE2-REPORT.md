# PHASE 2 REPORT — CMS + Article Engine + Editorial Workflow + Media + Authors + Publishing Infrastructure

Date: 2026-09-04 · Status: **DELIVERED — awaiting human review.**
Phase 1 remains closed, approved and frozen; nothing in it was redesigned
(brand, i18n, URL strategy, visual system, Prisma architecture all preserved).

---

## 1. What was delivered (spec section → implementation)

| # | Spec area | Delivered |
|---|---|---|
| 1 | DB extension | Migration `20260904211007_phase2_init` — 50 tables, all Phase 1 models preserved, no parallel systems. FKs + indexes on locale/slug/status/publishedAt/updatedAt/category/author/verification; slugs unique per (locale) and per (article, locale). |
| 2 | Article model | `Article` (core) + `ArticleTranslation` (editorial, SEO, verification, scheduling, content) — structured JSON blocks, no opaque HTML, no content hard-coded in React. |
| 3 | Multilingual | Per-locale independent editing AND publishing; translation-group status table in the editor; hreflang only over PUBLISHED versions; editing one locale never touches another. |
| 4 | Editorial workflow | Exact pipeline with states DRAFT→IN_REVIEW→FACT_CHECK→SEO_REVIEW→APPROVED→(SCHEDULED)→PUBLISHED→ARCHIVED; guarded transitions + notes; full audit (`ArticleTransition`); **AI never auto-publishes**; publish/schedule are explicit human (EDITOR+) actions. 13/13 state-machine checks pass. |
| 5 | Verification | VERIFIED/NEEDS_REVIEW/OUTDATED/ARCHIVED + lastVerifiedAt/verifiedBy/notes per translation; official-source warning flag; OUTDATED never appears current; "Needs Verification" admin filter. |
| 6 | Editor | Title, slug, excerpt, structured blocks editor (headings, paragraphs, lists, quotes, images+caption+alt, links, safe embeds), FAQ editor, author/category/tags pickers, verification panel, SEO panel with 8 explicit rule checks (no fake scores). Minimal client JS; RTL for /admin/ar. |
| 7 | Preview | `/{locale}/preview/{id}?t=token` — real public components, token- or session-gated, noindex (header + meta), never in sitemap/RSS/listings, no canonical. |
| 8 | Publishing | Publish now / schedule / unpublish / archive / revive; scheduled invisible before time (verified); publish refreshes sitemap/RSS/listings/canonical/hreflang/JSON-LD via tag+path revalidation; unpublish removes from all discovery (verified). |
| 9 | Revisions | Snapshot before every edit and publish-grade transition; non-destructive restore; editor + status + note recorded. |
| 10 | Authors | CMS-managed profiles (name, Latin slug, avatar=MediaAsset, localized bio/role/expertise, socials, active flag), public SEO author pages with Person/ProfilePage JSON-LD; seeded real author (Salma Benali); "By Admin" does not exist. |
| 11 | Media | Real uploads (magic bytes + sharp decode + size cap), opaque keys, `/media/[key]` immutable serving, localized alt/caption, credit/source/license, mandatory AI-generated disclosure surfaced publicly, archive + reference-safe delete. Local driver real; S3 driver throws = documented infrastructure dependency. |
| 12 | SEO CMS | seoTitle/metaDescription/canonical override/OG image/robots/noindex + rule-based guidance (8 checks, no fake scores); FAQPage JSON-LD only when a visible FAQ exists; internal links via ContentLink with a simple picker (no mass linking). |
| 13 | Redirects | Per-locale 301s; auto-created on published-slug change; ADMIN management UI (create/toggle/delete); loop-safe (creation-time chain check + serve-time guard); middleware (60s TTL cache) + instant page-level fallback. |
| 14 | Dashboard & lists | 8 workflow counts + Needs Verification + Recently Updated; articles list with filters (locale/status/author/category/verification + search). JOURIVA visual system throughout (no separate CMS identity). |
| 15 | Permissions | ADMIN/EDITOR/REVIEWER/AUTHOR enforced server-side (`requireUser`/`requireRole` + ownership rule); clean denial UI; user management (create/role/disable+session-revoke); auth abstraction + documented provider path. No fake auth. |
| 16 | Public integration | Home, hubs (guides/morocco/travel-for-moroccans/sports-travel), article pages, author pages, sitemap, RSS all read from PostgreSQL via cached public queries; static-first (SSG + ISR 300s); sample layer retained only as Phase 1 demo data, no longer drives articles. |

## 2. Steps 1–20 completion

Steps 1–3 were complete on entry. This turn completed:

- **Step 4–9 (UI/actions)** — all admin pages now exist: media library + asset editor, authors (list/form/edit), redirects, users; editor OG-image picker fixed (real `ogImageId` field).
- **Step 10** — preview route + `/media/[key]` serving route.
- **Step 11** — `/api/cron/publish` (CRON_SECRET) → `promoteDueScheduled()` (verified live: promotes only due items, audit actor = system).
- **Step 12** — `scripts/create-admin.ts` (production bootstrap) + `scripts/seed.ts` (idempotent dev seed: 4 users, author, categories, 3 media assets through the real storage contract, 3 articles × 3 locales PUBLISHED, FAQ, internal links, audit transitions).
- **Step 13–16** — tsc PASS; 3× consecutive `next build` PASS; runtime E2E (below).
- **Step 17** — 5 sample consumers wired to public queries (home, hub-screen, article page, RSS, sitemap) + author pages.
- **Step 18–19** — tests + fixes (§4).
- **Step 20** — this report + docs 09–12 + roadmap update.

## 3. Test evidence (all run against the production build + live server)

**Static gates**
- `npx tsc --noEmit` — **PASS** (strict).
- `npx next build` — **PASS**, 3× consecutively (flake fixed, §4). 51 routes: 9 article pages prerendered from the DB (SSG/ISR), admin + preview + media + cron dynamic.
- `prisma validate` + migration applied (50 tables).

**Live acceptance (`scripts/e2e-acceptance.py` — real HTTP, no-JS server-action posts):**
login → create article → save full content (blocks/FAQ/SEO/verification) →
submit for review → start fact-check → pass fact-check → approve → publish →
DB PUBLISHED → **public page 200** with canonical, real byline, verification
warning, JSON-LD → **in sitemap, RSS, home listing** → slug change on live
article → **301 old→new** → new URL live → unpublish → **page 404, removed
from sitemap/RSS/home**. **ALL CHECKS PASSED.**

**Translation independence (`scripts/e2e-translations.py`):**
EN published + ES draft (added via the real "Create version" action) →
EN public 200, ES 404, hreflang for the group lists EN only, sitemap lists
EN only. **PASSED.**

**State machine matrix:** 13/13 (roles, ownership, notes-required reject,
schedule-future requirement, illegal source states).

**Other verified live:** admin gate redirects (307→login), author-role denial
(clean UI, not 500), login sets HttpOnly session cookie, cron 401 without /
200 with secret, media 200 (correct MIME) + 404 unknown, preview 200 with
valid token / 404 anonymous / 200 with session / 404 forged token, middleware
301 + loop guard, seeded sitemap = 57 URLs with 228 hreflang alternates,
AR article renders RTL.

## 4. Real bugs found & fixed during verification (no silent failures)

1. **`PUBLISHED` filter froze `new Date()` at module load** — anything
   published after server start was invisible. Now a per-call function
   (caught by E2E; also explains an ISR-flake class).
2. **`unstable_cache` JSON-decay of `Date` fields** — intermittent build
   crash (`toISOString is not a function`). `PublicArticle` now carries ISO
   strings by design.
3. **`translationInputSchema.articleId.min(1)`** broke article creation
   (empty on create). Split: optional on create, required in save.
4. **`faqItem.createMany` with nested translations** — invalid Prisma;
   replaced with per-item creates.
5. **Middleware redirect lookup** ignored trailing-slash variants → 301s
   never matched. Normalized both sides.
6. **Redirect propagation race** — middleware's 60s null-cache delayed
   slug-change 301s; added an instant uncached fallback on the article
   page's 404 path (308 permanent) + bounded-retry evidence in E2E.
7. **AUTHOR hitting /admin/users → 500** — now a clean "Not authorized" panel.
8. **`reject` accepted empty notes** — `requiresNotes` was declared but
   never checked; now enforced in `canTransition`.
9. **Next 15.3 doesn't support Node middleware** — upgraded within v15 to
   **15.5.25** (stable `runtime: "nodejs"` middleware; experimental flag
   removed from config). No other stack changes.
10. **Editor OG image never persisted** (`ogImageId_unused`) — picker now
    drives the real field (found in review, fixed pre-build).

## 5. Infrastructure dependencies (documented, not faked)

- **Cron scheduler** must call `/api/cron/publish` (Bearer `CRON_SECRET`)
  every minute in production — otherwise scheduled articles promote on the
  first manual call. No in-app fake timer.
- **Object storage**: S3 driver throws "not configured"; local driver is
  real. Production needs bucket + CDN wiring.
- **Rate limiting / WAF** for login at the edge (docs/09 §9).

## 6. Environment & operations

`.env.example` updated: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`,
`SESSION_SECRET` (32+ chars), `CRON_SECRET`, `MEDIA_STORAGE_DIR`,
`MEDIA_MAX_MB`. Dev seed logins (dev only):
`{admin,editor,author,reviewer}@jouriva.test` / `jouriva-dev-2026`.
Useful commands: `bash scripts/dev-db.sh`, `npx prisma migrate deploy`,
`npx tsx scripts/seed.ts`, `npx tsx scripts/create-admin.ts …`,
`python3 scripts/e2e-acceptance.py`.

## 7. Acceptance criteria (spec) — verified

| Criterion | Result |
|---|---|
| Full editor flow → article live on page/listings/sitemap/RSS/canonical/hreflang/JSON-LD/breadcrumbs/internal links | ✅ E2E |
| Slug change → 301 → canonical + sitemap follow | ✅ E2E |
| EN published + ES draft + AR absent → only EN public | ✅ E2E |
| Unpublished never leaks (page/listings/sitemap/RSS/hreflang/JSON-LD) | ✅ E2E (unpublish + archived-ISR-window checks) |
| tsc / build / prisma validate / migration / tests | ✅ all PASS |

## 8. Known limitations (documented, none blocking)

- ISR window: direct-to-DB changes (bypassing the CMS) become public within
  ≤ 300 s; CMS-driven changes are immediate.
- Page-level redirect fallback emits 308 (permanent equivalent); middleware
  emits exact 301 — Next pages cannot emit a bare 301.
- Revisions are structured snapshots (per spec, documented in docs/10 §8).
- Sample article layer remains in `src/content` as Phase 1 demo data for
  cities/about content; articles/hubs/home/RSS/sitemap no longer read it.
- Dev seed password is documented dev-only; production uses create-admin.

## 9. Docs

- `docs/09-cms-architecture.md` — data model, read/write paths, caching,
  media pipeline, redirects, cron, middleware, deployment security.
- `docs/10-editorial-workflow.md` — pipeline, transition table, human gate,
  scheduling, verification, preview, revisions.
- `docs/11-media.md` — storage abstraction, validation, rights/AI
  disclosure, serving, deletion rules, production checklist.
- `docs/12-auth-and-permissions.md` — sessions, roles, bootstrap, provider
  path, preview tokens.
- `docs/08-roadmap.md` — Phase 2 marked delivered (Phase 1 decisions and
  Phase 3+ planning untouched).

---

## STOP — awaiting human review

Phase 2 is complete and verified. **No Phase 3–10 work has been started and
none will be until explicitly authorized**, per the phase gate.
