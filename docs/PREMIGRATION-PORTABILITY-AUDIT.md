# JOURIVA — PRE-MIGRATION PORTABILITY AUDIT

Date: 2026-09-06 · Scope: readiness of the frozen JOURIVA baseline
(Phases 1–4) for migration to GitHub + Vercel + Next.js 15 + Prisma + Neon
PostgreSQL, with Supabase Storage as the media target.

**This is an audit only. No code, schema, migration, configuration, content,
or infrastructure was created or modified.** Runtime restoration performed for
validation used only lockfile-faithful `npm ci` (generated `node_modules`) and
the local dev database — the repository itself is untouched. Validation run
results are reported in §15.

> **Phases 1–4 remain unchanged and frozen.**

---

## 1. Executive Summary

JOURIVA is **highly portable**. The application is a standard Next.js 15 App
Router project with zero Arena-specific runtime dependencies, a single-domain
configuration point (`NEXT_PUBLIC_SITE_URL`), a fully relational PostgreSQL
schema with a clean additive migration chain, and self-contained
authentication (scrypt + DB sessions + HMAC cookies — no external identity
provider).

Four items require preparation before staging works end-to-end:

| # | Item | Severity |
| --- | --- | --- |
| 1 | **The repository has no Git history** — it is not a Git repository at all. `git init` + first commit is required before anything can reach GitHub. | Blocking (trivial) |
| 2 | **Media storage writes to local disk** (`MEDIA_STORAGE_DIR`). Vercel serverless filesystems are ephemeral — the existing `S3Storage` placeholder throws by design and a real S3/Supabase adapter must be implemented, and the 3 existing sample media files must be re-uploaded. | Blocking for media (planned for) |
| 3 | **`sharp` is a devDependency but is imported at runtime** by the media upload path (`src/lib/cms/media.ts`). Vercel's build tracing will likely include it, but production dependency hygiene requires moving it to `dependencies` before migration. | High (latent) |
| 4 | **Cron precision on Vercel Hobby is daily only** — scheduled publishing (minute-level) needs Pro, `vercel.json` crons config, or an external pinger. Staging can still validate the endpoint manually. | Medium |

Everything else — routing, i18n, SEO, search, CMS, redirects, workflow — is
portable as-is or needs only environment-variable configuration.

## 2. Current Architecture (inventory)

| Item | Value / status |
| --- | --- |
| Framework | Next.js `^15.5.25` (App Router, RSC, Server Actions, Route Handlers, ISR) |
| React | 19.1.0 / react-dom 19.1.0 |
| Node (dev) | v20.20.2 · **no `engines` field in package.json** (see §3) |
| Package manager | npm 10.8.2 + `package-lock.json` (`lockfileVersion: 3`). No yarn/pnpm files. No `packageManager` field. |
| Production deps | `@prisma/client ^6.19.3`, `next`, `next-intl ^4.0.0`, `pg ^8.23.0`, `react`, `react-dom`, `zod ^4.5.4` |
| Dev deps | `@tailwindcss/postcss`, `@types/node`, `@types/pg`, `@types/react`, `@types/react-dom`, `eslint-config-next`, `opentype.js`, `prisma`, **`sharp ^0.35.4` (⚠ used at runtime — §6)**, `tailwindcss ^4.0.0`, `tsx`, `typescript ^5.9.3` |
| TS config | strict, bundler resolution, `@/*` → `./src/*`, noEmit |
| Styling | Tailwind CSS v4 via `@import "tailwindcss"` + `@theme` tokens in `src/styles/globals.css` (PostCSS plugin) — no tailwind.config file (v4 style) |
| i18n | next-intl v4 (`createNextIntlPlugin` default; `src/i18n/routing.ts`, `src/i18n/request.ts`, static JSON messages `src/messages/{ar,en,es}.json`) |
| Prisma | `prisma-client-js`, `provider = "postgresql"`, `url = env("DATABASE_URL")`; client singleton `src/lib/prisma.ts` (globalThis caching, dev only) |
| Migrations | 8 (see §4) |
| Scripts | `dev`, `build`, `start`, `typecheck`, `prisma:validate` — **no `test` script** (tests are Python E2E scripts run against a live server) |
| Middleware | `src/middleware.ts` — **Node.js runtime** (`export const config = { runtime: "nodejs" }`): admin cookie gate, DB-backed 301 redirects w/ 60 s in-process TTL cache, next-intl locale negotiation |
| Routes | 42 page/route files (public site, 3 locales, CMS admin, sitemap, robots, RSS, media, cron, suggest API) |
| Public assets | `public/brand/**` (logo/favicon set), OG default, misc — all committed content |
| Scripts (dev tooling) | `seed.ts`, `seed-destinations.ts`, `create-admin.ts`, `dev-db.sh` (Arena/local-only), `build-favicons.mjs`, `build-wordmark.mjs` (asset generators, write `scripts/.fonts/` — gitignored), 7 Python E2E suites |
| Docs | 13 numbered docs + ARCHITECTURE + 5 phase reports |
| Repo size | 3.7 MB / 211 files (excluding node_modules/.next) |
| Git | **Not a Git repository** (no `.git`) — `.gitignore` exists and is adequate |

**Classification:**
- **A. Portable as-is:** all application source (`src/**`), public assets, docs, Prisma schema + migrations, package.json (with §6 caveat), lockfile, tsconfig, PostCSS, next-intl config.
- **B. Requires external configuration:** all 7 environment variables (§5), DNS/domain, cron schedule, storage provider selection.
- **C. Arena-specific:** `scripts/dev-db.sh` + the local PG cluster convention (`~/.pg/jouriva`) and the `MEDIA_STORAGE_DIR` local-directory value in `.env` (dev convenience only — nothing in `src/` references Arena). The sandbox itself (resetting node_modules, ephemeral processes) is Arena-specific but invisible to the repo.
- **D. Unknown / needs verification:** Vercel file-tracing of `sharp` for serverless functions (§6); exact Vercel Hobby behavior with Node-runtime middleware at scale (documented as stable in Next 15.5).

## 3. Next.js / Vercel Compatibility

Every construct in use is first-class Vercel functionality:

| Feature | Usage | Verdict |
| --- | --- | --- |
| App Router / RSC / Server Actions / Route Handlers | throughout | Portable as-is |
| ISR (`export const revalidate = 300`) | all public destination/article/topic/author pages | Portable (Vercel ISR native) |
| `unstable_cache` (tag-based) | public content reads, search | Portable (mapped to Vercel Data Cache) |
| `dynamic = "force-dynamic"` | admin, search, RSS, suggest API, cron | Portable |
| `generateMetadata` / sitemap / robots / RSS | standard metadata routes | Portable (§9) |
| `permanentRedirect` 301s | destination/article slugs | Portable |
| Middleware | **Node.js runtime** (DB-backed redirects). `pg` Pool created per lookup (`max: 2`, closed after query) | Portable, with notes: (a) per-request pool creation adds connection churn — harmless at staging scale; on Neon use the pooled connection string; (b) in-process 60 s redirect cache is per-lambda-instance (acceptable, stale-redirect window ≤ 60 s already documented) |
| `node:crypto` (scrypt, HMAC, timingSafeEqual) | auth, session cookies | Portable (Node runtime functions) |
| Filesystem | `src/lib/storage.ts` writes/reads `MEDIA_STORAGE_DIR`; `src/lib/brand.ts` `existsSync` over `public/` (read-only, module scope); seed scripts write uploads (dev-only) | ⚠ **Uploads incompatible with ephemeral Vercel FS** → external storage required (§7). `public/` reads are fine (public/ ships with deployments) |
| `process.env` usage | 7 active vars + 4 S3 placeholders + NODE_ENV | Portable (§5) — none Arena-specific |
| server-only / client-only boundaries | `server-only` package imported via a local shim on Arena | ⚠ **The shim must NOT be committed** — on GitHub/Vercel, install `server-only` from npm (it is a real 30-byte package) — 1-line dependency addition, future action |
| Edge incompatibilities | none declared (`runtime: nodejs` everywhere relevant); no edge APIs used | None |
| Build-time assumptions | brand detection reads `public/brand/**` at build; DB-backed sitemap prerender guarded by try/catch (DB down → static URLs still emitted) | Portable |
| Absolute paths / temp files / local persistence | `MEDIA_STORAGE_DIR` (media), `scripts/.fonts/` (asset generation, gitignored) | Media → §7; fonts are a local asset-generation step, outputs committed to `public/` |
| Arena-specific APIs / env vars | none found (grepped `process.env` exhaustively; no Arena hostnames, no internal SDKs) | None |

**Issues list (report-only, recommended future actions):**
1. `package.json` has no `engines` field — recommend `"engines": { "node": ">=20" }` when preparing the Vercel project (pinning Node 20/22 consistently). *Recommended action, not performed.*
2. `sharp` in devDependencies while imported at runtime — move to `dependencies`. (§6, severity High-latent.)
3. `server-only` npm package must replace the local shim when the repo leaves Arena (the shim directory `node_modules/server-only` is generated here and never committed — but a fresh `npm install` on GitHub would fail to resolve it without adding the real package). *1-line dependency addition, before first Vercel deploy.*
4. No `vercel.json` — needed only when wiring Vercel Cron (§8).

## 4. Prisma / PostgreSQL / Neon Audit

- Schema: single `postgresql` datasource, standard `prisma-client-js` generator, **no `binaryTargets`**, no `directUrl` (fine — see note), no extensions required, no raw SQL beyond the middleware's one parameterized query and E2E fixtures.
- Client init: singleton with `globalThis` caching — serverless-safe (one client per warm instance).
- Transactions: service layer uses straightforward awaited queries; no long-running transactions, no interactive transactions that would clash with pooler mode; no prepared-statement assumptions (Prisma manages its own).
- Pooling assumptions: default Prisma connection pool; serverless-compatible. For Neon: point runtime `DATABASE_URL` at the **pooled** endpoint and run `prisma migrate deploy` against the **direct** endpoint (both are provided by Neon; this is pure environment configuration — **no schema change required**).
- Serverless compatibility: no `pg`-only features outside middleware (which imports `pg` directly and works on TCP); Prisma engine runs on Vercel Node functions (x64 binaries auto-selected; no `binaryTargets` override needed for Amazon Linux 2 — Prisma's default detection covers it; verify on first deploy).
- **Development-only DB logic:** `scripts/dev-db.sh`, `create-admin.ts`, `seed.ts`, `seed-destinations.ts` — clearly separated under `scripts/`; the `.pg` cluster convention is dev convenience.
- **Frozen ContentLink behavior — VERIFIED live during this audit:**
  `ContentLink_ownerId_fkey` → `ON DELETE RESTRICT / ON UPDATE CASCADE` (`r`/`c` in `pg_constraint`), matching `phase2_init` migration line 907 exactly. **Preserved.** No migration touches it after `20260906112541_phase3_restore_owner_fk_restrict`.

## 5. Migration Safety (`prisma/migrations/`)

| # | Migration | Content |
| --- | --- | --- |
| 1 | `20260904211007_phase2_init` | Full baseline schema (Phase 1 entities + Phase 2 CMS tables + ContentLink FK `RESTRICT/CASCADE`) |
| 2 | `20260905205332_phase3_destinations` | Destination/translation/topic tables + indexes |
| 3 | `20260905205428_phase3_destination_links` | ArticleDestination, DestinationMedia, ContentLink target column |
| 4 | `20260905210535_phase3_curated_link_owner` | ownerDestinationTranslationId column + FK (later dropped in #5) |
| 5 | `20260905210734_phase3_curated_link_plain_owner` | Drops that FK → plain reference (polymorphic-owner pattern) |
| 6 | `20260905210816_phase3_contentlink_owner_nullable` | `ownerId` nullable (FK re-added SET NULL by tooling) |
| 7 | `20260906112541_phase3_restore_owner_fk_restrict` | Restores FK to RESTRICT/CASCADE (Phase 2 fidelity) |
| 8 | `20260906175528_phase4_search_query_events` | SearchQueryEvent table + 2 indexes |

- Count: **8**, strictly additive after #1, chronological ordering is correct, `migration_lock.toml` = postgresql.
- Completeness: `npx prisma migrate status` reports **"Database schema is up to date!"** against the live database — migration chain = actual schema.
- Arena dependencies in migrations: **none** (pure SQL DDL).
- **`prisma migrate deploy` compatibility: YES.** It is exactly the intended production path (`.env.example` documents it). No seed migration exists (seeding is explicit scripts — good).
- Concerns: none blocking. (Migrations 4–7 record the audit-visible evolution of the curated-link owner design; they replay cleanly in order.)

## 6. Authentication / Authorization

Mechanism (self-contained, zero third-party identity providers):
- Passwords: **scrypt** (node:crypto, per-user salt) — `hashPassword`/`verifyPassword`.
- Sessions: **server-side in PostgreSQL** (`Session` table stores only SHA-256 token hashes); cookie `jv_session` = `token.HMAC-Signature` (SESSION_SECRET), `httpOnly`, `sameSite=lax`, `secure` in production, 30-day TTL.
- Authorization: `requireUser()` / `requireRole(ADMIN|EDITOR|AUTHOR|REVIEWER)` enforced server-side in every admin page and every server action; middleware adds a cheap HMAC cookie gate for `/admin/**` UX redirect (full check stays server-side); preview route gated by session **or** signed TTL token; cron gated by `CRON_SECRET` Bearer.
- Classification: **A. Portable as-is** (pure Node stdlib + DB; nothing Arena-dependent). **D. Future integration optional** — a production identity provider could be added later behind `verifyCredentials()`/`createSession()` without changing the permission model (documented in docs/12-auth-and-permissions.md). No Clerk or any provider is introduced by this audit.

## 7. Media / File Storage

- Current driver: `LocalStorage` — writes under `MEDIA_STORAGE_DIR` (fallback `cwd/.uploads`), served publicly via `/media/[key]` route handler with metadata from the `MediaAsset` table; opaque random keys; `basename()` traversal guard; immutable cache headers; archived assets 404.
- Abstraction: `StorageProvider` interface (`put/get/delete/exists`) + factory keyed on `MEDIA_STORAGE_PROVIDER`. An `S3Storage` class exists as an **intentional placeholder that throws without credentials** — documented as shipping with the production deployment phase. **No fake success paths.**
- Upload flow: admin server action → mime sniffing + allowlist → real decode via **sharp** (dimensions; rejects corrupt files) → `storage().put()` → `MediaAsset` row (+ per-locale alt translation).
- **Supabase Storage attachability: YES, without redesign.** Supabase Storage is S3-compatible; the `S3Storage` adapter maps 1:1 onto the existing interface (S3_ENDPOINT = Supabase S3 gateway URL). Required env vars (all already named in code/.env.example): `MEDIA_STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Public bucket recommended (content is editorial media); CDN/public-URL decision: either keep the `/media/[key]` proxy (URL stability for existing `/media/...` URLs stored in the DB — streams from Supabase, costs function invocations) or rewrite stored URLs to public Supabase URLs (needs a small data migration + `next.config` image host allowlist). **Decision deferred to migration planning — no change made.**
- **Arena-specific:** the 3 existing sample media files live only on the Arena local disk (`MEDIA_STORAGE_DIR` / `~/.pg/jouriva-uploads`, 3 files). DB rows reference `/media/<key>` — on external infrastructure the **files must be re-uploaded to Supabase** (or re-seeded) or those assets 404.
- Upload size limit `MEDIA_MAX_MB` (default 10 MB) — also relevant to serverless body limits (Vercel server actions accept up to ~4.5 MB request bodies on Hobby; uploads above that need direct-to-bucket upload — **flag for migration planning**).

## 8. Cron / Scheduled Publishing

- Endpoint: `GET /api/cron/publish` — Bearer `CRON_SECRET` (header or `?key=`), 503 if unset, 401 on mismatch.
- Action: `promoteDueScheduled()` — promotes due `SCHEDULED` → `PUBLISHED` article translations (state-machine-guarded), `revalidatePath` per promoted article.
- Idempotent: yes (promotion is a guarded transition on `scheduledAt <= now`; re-running promotes nothing new).
- DB ops: bounded read of due rows + per-row update (small, transactional-safe).
- Arena assumptions: none.
- **Vercel Cron compatibility: YES** (GET + `Authorization: Bearer $CRON_SECRET` is injected automatically when `CRON_SECRET` is defined in Vercel env). Requires a `vercel.json` `crons` entry (config creation = future action).
- **Hobby limitations:** crons are limited to **once-per-day granularity** on Hobby → adequate to *test* the endpoint (manual curl or daily trigger) but NOT adequate for minute-level scheduled publishing. For the intended production schedule: **Vercel Pro is required** (minute-level cron) — or an external scheduler (e.g. cron-job.org hitting the endpoint with the secret every minute) during staging.

## 9. SEO Portability

- Single domain source of truth: `NEXT_PUBLIC_SITE_URL` (approved decision #3; fallback `https://www.jouriva.com` in `src/lib/config.ts`). Canonical, hreflang, x-default, sitemap, RSS, OG all derive from it.
- **Arena-URL dependence: NONE** — no Arena hostname anywhere in `src/`. Setting `NEXT_PUBLIC_SITE_URL=https://<staging-domain>` fully re-targets SEO output.
- sitemap: static routes + DB-backed published content (try/catch → DB down still emits static URLs); robots: `robots.ts` metadata route (indexables allowed, admin/preview excluded); RSS: per-locale DB-backed `force-dynamic`; preview pages: `noindex` meta + `X-Robots-Tag` header (next.config).
- Redirects: DB-backed 301s (middleware) + slug-change 301s — portable.
- RTL/LTR: locale-driven (`dir` per locale), locale-prefixed routes — portable.
- Staging indexing behavior: staging can be kept out of engines by either a staging-domain `X-Robots-Tag` (config addition later) or simply not linking the domain; **no code dependency**. (`vercel.json` header config is a future action, not performed.)

## 10. Search Portability (Phase 4 — frozen)

- `PostgresSearchProvider` uses only Prisma-parameterized SQL constructs supported by vanilla PostgreSQL: `ILIKE` (case-insensitive recall — accent-sensitive, accepted limitation), tiered candidate queries with keyset cursors (`orderBy …, slug asc` + `cursor`), JS ranking — **no extensions, no full-text index, no vectors, no external provider**.
- Fully Neon-compatible (plain TCP PostgreSQL). `SearchQueryEvent` writes are plain inserts.
- Published-only + per-locale filters are WHERE-clause level — environment-independent.
- Caching: `unstable_cache` on public reads — works identically under Vercel's data cache.
- **No search changes made or proposed.** Provider abstraction unchanged.

## 11. Content / Seed Data

- **Database-backed (must migrate):** users, sessions, authors, categories, tags, articles + translations (+revisions, transitions, redirects), media metadata, destinations + translations + links, topics, curated links, search events. Current data volume is sample-scale (20 article translations, 23 destination translations, 3 media assets, 4 users) — a one-time `pg_dump`/restore into Neon or migrations + seed re-run reproduces everything.
- **Static/sample (repo-committed):** Phase 1 frozen sample pages (hubs/cities fallbacks), brand assets, OG image, messages JSON.
- **Seed scripts:** `create-admin.ts` (users), `seed.ts` (categories/authors/articles + generated hero images written to local uploads dir via sharp), `seed-destinations.ts` (Phase 3 sample). They depend on local FS + `MEDIA_STORAGE_DIR` → **on external staging, media files must be pushed to Supabase** (adapter first) or images 404 while all text content works.
- **Arena-dependent content:** none. Content recreates fully from migrations + seeds, or via direct data export.

## 12. Filesystem / Runtime State Audit (exhaustive)

| Location | Operation | Vercel compatibility |
| --- | --- | --- |
| `src/lib/storage.ts` | `mkdir`/`writeFile`/`readFile`/`unlink`/`stat` under `MEDIA_STORAGE_DIR` | ❌ Runtime writes lost on serverless → **external storage required** (planned: Supabase) |
| `src/app/media/[key]/route.ts` | reads via storage abstraction | Works once adapter is external |
| `src/lib/brand.ts` | `existsSync` over `process.cwd()/public/brand/**` (read-only, module scope) | ✅ `public/` ships with deployments |
| `scripts/seed.ts` | writes generated hero images to uploads dir | Dev-only — not deployed |
| `scripts/build-favicons.mjs`, `build-wordmark.mjs` | write `public/` outputs + `scripts/.fonts/` (opentype/sharp) | Local asset generation only; outputs committed |
| `/tmp` usage | none found in `src/` | — |
| SQLite / local DBs | none (PostgreSQL only) | — |
| `process.cwd()` assumptions | brand.ts (public), storage.ts fallback | Safe on Vercel |
| Generated runtime files | none besides uploads | — |

## 13. External Services

| Service | Classification |
| --- | --- |
| Neon PostgreSQL | Required for migration (target) |
| Supabase Storage | Required before media works on Vercel (target; adapter is prepared-for, not implemented) |
| YouTube (`youtube-nocookie.com` iframe embeds in video blocks) | Optional runtime embed (client-side; no keys) |
| Vercel Cron (or external scheduler) | Required for scheduled publishing |
| Future ad/affiliate/newsletter providers | Future phases only (placeholders in `.env.example`, none active) |
| Arena | Current hosting only — zero code references |

## 14. Security Audit (portability-relevant; report-only)

- **Secrets:** `.env` is gitignored (`.env` + `.env.*`, `!.env.example`); `.env.example` contains placeholders only. No secret values in `src/`, `scripts/`, `docs/`, or migrations. Dev seed credential (`jouriva-dev-2026`) appears in E2E scripts — dev-only fixture credential, not a production secret; acceptable in-repo (documented in phase reports).
- **Client leakage:** only `NEXT_PUBLIC_*` vars are public (`SITE_URL`, ads-demo toggle); secrets (`SESSION_SECRET`, `CRON_SECRET`, `DATABASE_URL`, S3 keys) are server-referenced exclusively (`grep`-verified: no `NEXT_PUBLIC_` prefix on secrets; no secret values interpolated into client components).
- **Preview:** session-or-signed-token gate + `noindex` meta + `X-Robots-Tag` header — portable.
- **Auth bypass:** admin pages/actions re-check roles server-side (middleware gate is UX only, correctly labeled); API surface is 3 endpoints (media serving, suggest, cron) — suggest/validate inputs server-side; cron Bearer-gated.
- **Unsafe redirects:** middleware redirect targets come from the DB (`destinationPath`, internal paths, loop-guarded); login `?next=` is same-origin admin path. Slug 301s derive from service-computed paths.
- **File upload security:** mime sniffing + allowlist, real decode (sharp), size cap, opaque keys, traversal-guarded reads (`basename`), no filename exposure.
- **Database access:** exclusively parameterized (Prisma + one `$1` parameterized `pg` query in middleware).
- **Staging notes:** rotate `SESSION_SECRET` + `CRON_SECRET` for staging; new admin passwords via `create-admin.ts`; DB users scoped per environment.

## 15. Build / Deployment Readiness — validation results (this machine, non-destructive)

| Command | Result |
| --- | --- |
| `npm ci` (lockfile-faithful restore) | OK |
| `npm run typecheck` (`tsc --noEmit`) | **PASS (rc 0)** |
| `npm run build` (`next build`) | **PASS (rc 0)** |
| `npx prisma validate` | PASS (valid) |
| `npx prisma migrate status` | "Database schema is up to date!" |
| ContentLink FK live check | `r`/`c` = RESTRICT/CASCADE ✓ |

`npm test`: **no `test` script exists** — testing is the documented Python E2E suites (not modified, not run as part of this audit beyond prior phase evidence).

## 16. GitHub Readiness

- Not yet a Git repository → `git init` + initial commit required (nothing exists to push).
- `.gitignore` (already correct, unmodified): excludes `node_modules`, `.next`, `build`, `next-env.d.ts`, `.env*` (keeps `.env.example`), `*.tsbuildinfo`, `scripts/.fonts/`.
- Repo size 3.7 MB / 211 files — no large binaries beyond committed brand assets/docs screenshots (intentional).
- No secrets in tracked-candidate files (§14). `.env` must obviously never be committed (already ignored).
- No Arena-specific files inside the repo; `scripts/dev-db.sh` is a documented local-dev convenience.
- Housekeeping (optional, later): remove `tsconfig.tsbuildinfo` from disk before first commit (it is gitignored anyway).

## 17. Vercel Hobby Staging Plan (~3 months)

- **Can Hobby technically run staging? YES** — standard Next.js 15 app, ISR, force-dynamic routes, Node middleware (stable in 15.5), external Postgres over TCP, image optimization.
- Hobby-relevant limits: cron = **1×/day max** (§8), serverless function payload/body limits (~4.5 MB request bodies — affects large media uploads through server actions), no advanced observability, fair-use bandwidth.
- ISR: fully testable. External PostgreSQL (Neon): fully supported. Media: **must be external** (Supabase) for any upload/persistence to work.
- Adequate on Hobby for staging: yes, with media adapter + daily/manual cron tests.
- Must wait for Pro (or pre-launch): minute-level scheduling cron, longer log retention, faster builds — none block staging.

## 18. Neon Free Staging Plan

- Compatibility: full (plain PostgreSQL; nothing beyond vanilla SQL in use).
- Migration strategy: `prisma migrate deploy` against the **direct** connection string; runtime `DATABASE_URL` = **pooled** string. Both come from the Neon dashboard — environment configuration only.
- Connection considerations: serverless functions scale horizontally — pooled endpoint + Prisma's default pool is correct at staging scale; middleware's per-request pool is acceptable (§3).
- Branching: Neon branching (main/dev) can map to staging/preview — optional; Vercel preview deployments would need per-branch `DATABASE_URL` (Neon–Vercel integration exists; using it is optional and is a post-migration convenience).
- Seed strategy: run `create-admin.ts` + `seed*.ts` from a developer machine against Neon (media files then need the Supabase path — §7/§11).
- Free-tier limits: storage/compute ceilings are ample for the sample-scale dataset; cold starts on free compute are acceptable for staging.

## 19. Supabase Storage Staging Plan

- Abstraction sufficiency: **sufficient** — `StorageProvider.put/get/delete/exists` covers the media flow; `S3Storage` is the intended landing spot (constructor already validates `S3_BUCKET`/`S3_ENDPOINT` + key id/secret).
- What an adapter implementation would need (future code action — NOT performed): implement the five methods against Supabase's S3-compatible gateway (or native API); keep opaque keys; decide URL strategy (keep `/media/[key]` proxy for URL stability vs. public bucket URLs).
- Env vars: `MEDIA_STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (already named in code).
- Public vs private: public bucket recommended (all current media is published editorial content; `/media/[key]` already enforces archived-invisibility at the DB level — preserving the proxy keeps that behavior).
- Migration of the 3 existing files: re-upload with the same opaque keys (then the existing DB rows keep working).

## 20. Migration Risk Matrix

| Area | Status | Risk | Arena Dependency | Action Later |
| --- | --- | --- | --- | --- |
| Application source (`src/**`) | GREEN | Low | None | None |
| Prisma schema + 8 migrations | GREEN | Low | None | `migrate deploy` to Neon |
| DB data (sample scale) | GREEN | Low | Local cluster only | `pg_dump` → restore, or migrations + seed |
| i18n / next-intl | GREEN | Low | None | None |
| SEO configuration | YELLOW | Low | None | Set staging `NEXT_PUBLIC_SITE_URL` |
| Middleware (Node runtime, DB redirects) | GREEN | Low-medium | None | Verify on Vercel; Neon pooled URL |
| Auth (scrypt + DB sessions + HMAC) | GREEN | Low | None | New `SESSION_SECRET`; create staging admin |
| Cron / scheduled publishing | YELLOW | Medium | None | `vercel.json` crons; Hobby = daily; Pro for minute precision |
| **Media storage** | **ORANGE** | High (blocks media on Vercel) | Files on local disk | Implement S3/Supabase adapter; re-upload 3 files; decide URL strategy; check body-size limits |
| **`sharp` runtime dependency** | **ORANGE** | Medium-high (latent) | None (masked by Arena dev install) | Move `sharp` to `dependencies` |
| **`server-only` package** | **ORANGE** | Medium (build blocker on fresh installs) | Local shim in `node_modules` | Add real `server-only` npm package |
| **Git repository** | **RED (trivial)** | Blocking (nothing to push) | Entire repo un-versioned | `git init` + commit |
| Search (Phase 4) | GREEN | Low | None | None (frozen) |
| GitHub hygiene | YELLOW | Low | None | First-commit review (no `.env`) |
| E2E suites | GREEN | Low | 127.0.0.1 assumption (dev tooling) | Point at staging URL when run |
| Docs | GREEN | None | None | Add deployment doc after migration |

## 21. Required Actions Before Migration (planning output — none executed)

**MUST DO BEFORE MIGRATION**
1. `git init` + initial commit (repository does not exist yet); verify `.env` excluded.
2. Add real `server-only` package; move `sharp` to `dependencies` (2-line package.json preparation).
3. Provision Neon → `DATABASE_URL` (direct for deploy, pooled for runtime) → `prisma migrate deploy` → run `create-admin.ts` + seeds (or data import).
4. Provision Supabase bucket → implement the `S3Storage` adapter → re-upload the 3 media files → set the 5 media env vars.
5. Create Vercel project (GitHub-connected), set env vars: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (staging domain), `SESSION_SECRET` (new), `CRON_SECRET` (new), media vars.
6. Post-deploy verification: locales render, login works, publish flow works, sitemap/robots/RSS reflect the staging domain, media serves, cron endpoint authorizes.

**CAN DO AFTER MIGRATION**
- Neon branch/preview integration, Vercel analytics/observability choices, E2E suites pointed at staging, documentation of the deployment pipeline, staging `X-Robots-Tag` header config.

**ONLY NEEDED BEFORE OFFICIAL LAUNCH**
- Production domain + DNS cutover, minute-level scheduling (Vercel Pro or equivalent), real ad/affiliate/newsletter provider keys (future phases), production auth-provider decision (optional, Phase 5+ scope), load/soak review of candidate caps and insights windows.

**Actions that must NOT be taken (per frozen scope):** no schema/migration edits; no ContentLink FK changes; no auth redesign; no search behavior changes (incl. accent recall); no UI/brand changes; no Phase 5+ features; no secret values committed.

**Recommended migration order:** Git init → dependency hygiene (server-only/sharp) → Neon provision + migrate deploy → seed/admin → Supabase + adapter → Vercel project + env vars → deploy staging → post-deploy verification checklist → cron config.

## 22. Open Questions / Unknowns

1. Supabase adapter flavor: S3-gateway (fits existing placeholder, no SDK additions) vs. native Supabase JS SDK (nicer CDN controls, adds a dependency) — owner decision at implementation time.
2. Media URL strategy: `/media/[key]` proxy (URL stability, function cost) vs. public bucket URLs (CDN-cheap, needs URL rewrite for existing rows) — owner decision.
3. Media upload path on Vercel: server-action body limits (~4.5 MB Hobby) vs. future direct-to-bucket signed uploads — relevant only if editors upload large images during staging.
4. Target Vercel Node version (20 vs 22) and whether to pin `engines` — recommendation: pin Node 20 to match the validated toolchain.
5. Whether Vercel's file tracing includes `sharp` for the upload path in practice (expected yes; verify on first staging deploy — the dependency move in Action 2 makes it moot).
6. Domain/DNS ownership and the final production hostname (needed only pre-launch).
7. Whether Vercel–Neon official integration (auto branch env vars) is desired, or manual env management for staging.

---

**Phases 1–4 remain unchanged and frozen.**

This audit made **no changes** to source code, UI, CSS, branding, routes, SEO
behavior, Prisma schema, migrations, database data, search, ContentLink,
authentication, media behavior, cron behavior, tests, dependencies, or
configuration. No deployment, no external connections, no infrastructure
creation. Validation commands were read-only with respect to the repository
(generated `node_modules` and `.next` build output only).

**STOP — awaiting human review and explicit approval of the migration plan.**
