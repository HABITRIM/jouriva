# JOURIVA — Migration Step 4B — Readiness

**Staging Data Seed — READINESS AUDIT ONLY**
Date: 2026-09-21 · Status: **AUDIT COMPLETE — ONE BLOCKER IDENTIFIED (seed media path is local-filesystem-bound); NO SEED EXECUTED** · Phases 1–4 frozen and untouched.

Context verified at audit time: GitHub `main` = `56b4b48` (Source of Truth) · Migration Step 4A CLOSED (live Supabase round-trip PASSED, owner-side) · Neon STAGING provisioned with all 8 approved migrations applied · Supabase STAGING bucket `jouriva-media` live.

## A. Current seed scripts

| Script | Purpose | Media behavior |
| --- | --- | --- |
| `scripts/create-admin.ts` | Creates **or promotes** a real ADMIN user (email/name/password as CLI args, scrypt-hashed, ≥10-char password enforced; upsert by email) | none (pure DB) |
| `scripts/seed.ts` | Initial editorial state: 4 dev users (admin/editor/author/reviewer `@jouriva.test`), 1 author profile (+3 locale bios, linked to the AUTHOR user), 4 categories (+3 translations each), 3 AI-labeled hero images as `MediaAsset`s, 3 articles × 3 locales (9 PUBLISHED translations with FAQ groups, VERIFIED status, audit transitions), 9 article↔article `ContentLink`s (3 per locale via the anchors map) | **`ingestImage()` implements its OWN local-disk persistence** — see Blocker (H1) |
| `scripts/seed-destinations.ts` | Phase 3 sample geography + taxonomy: 3 countries (+9 translations), 5 cities (+15), 3 topics (+9), 8 destinations (+23 translations incl. drafts + one deliberately thin Paris/AR), Marrakech FAQ group, 8 `ArticleDestination` links, topic relations (articles AND destinations), 4 curated destination→destination `ContentLink`s, per-translation destination FAQs | **none** — reuses existing `MediaAsset`s as destination heroes (`mediaAsset.findMany()`); zero uploads |

All three are plain `tsx` scripts using `PrismaClient` + `dotenv/config`. No web fetches, no email, no queues, no external calls (grep-verified) — the only side effects are database rows and (for `seed.ts`) local image files.

## B. Exact prerequisites

1. **Database:** target `DATABASE_URL` pointing at the (staging) PostgreSQL with all 8 migrations applied — Neon STAGING satisfies this (owner-reported); verified locally this audit (`prisma validate` PASS, `migrate status` "up to date").
2. **`seed.ts` source images:** the three hero source files are **committed in the repository** (`public/images/hero-marrakech-family.jpg`, `world-dolomites.jpg`, `sports-stadium.jpg` — presence verified). No local-only assets needed. `sharp` (runtime dependency since Step 1) is required for image metadata.
3. **`seed-destinations.ts` hard prerequisite:** `admin@jouriva.test` must exist **before** it runs — it throws `"Run scripts/create-admin.ts + scripts/seed.ts first (admin user missing)."` otherwise. That user is created by `seed.ts` itself (or manually).
4. **`create-admin.ts`:** independent of both seeds; needs only the target DB and an owner-chosen password (passed as argv — never committed).
5. **Env:** `DATABASE_URL` required by all three; `SEED_PASSWORD` optional (overrides the dev default in `seed.ts`); the S3 variable set (`MEDIA_STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_REGION`) is relevant **only after H1 is fixed** (see Blocker).
6. **Toolchain:** `npx tsx` (devDependency present); no Arena-specific tooling.

## C. Execution order recommendation (when authorized)

```
1. npx tsx scripts/create-admin.ts "<staging-admin@email>" "<owner-chosen-strong-password>" "<Full Name>"   # real staging admin
2. MEDIA_STORAGE_PROVIDER=s3 + S3_* + SEED_PASSWORD set → npx tsx scripts/seed.ts                          # content seed (AFTER H1 fix)
3. npx tsx scripts/seed-destinations.ts                                                                    # geography/taxonomy seed
```
Rationale: the real staging admin should exist from the start (and is independent); `seed.ts` must precede `seed-destinations.ts` (hard admin-user check + the destination↔article links resolve via `findFirst` on seed.ts slugs — without `seed.ts` they silently skip, leaving destinations unlinked). Running the seeds without `create-admin.ts` is technically possible (seed.ts creates its own dev admin) but leaves staging without the owner's real admin account.

## D. Expected Neon records (fresh staging DB, after 1→2→3)

| Area | Expected |
| --- | --- |
| Users | 5 = 4 seed (`@jouriva.test`, scrypt) + 1 real staging admin |
| Author | 1 (`salma-benali`) + 3 biography translations, linked to the AUTHOR user |
| Categories | 4 × 3 translations = 12 |
| MediaAssets | 3 (+9 alt translations) — **URLs `/media/<key>` under current code; Supabase public URLs only after H1 fix** |
| Articles / translations | 3 articles · **9 translations, all PUBLISHED** (3 locales each), VERIFIED, `publishedAt` 2026-07/08 |
| FAQ groups (articles) | 9 groups (+items + per-locale item translations) |
| ArticleTransitions | 9 (one per translation, APPROVED→PUBLISHED, editor-attributed) |
| ContentLinks (article↔article) | 9 (3 anchors × 3 locales) |
| Countries / Cities / Topics | 3 (+9 translations) / 5 (+15) / 3 (+9) |
| Destinations | 8 entities · **23 translations** (published en/es/ar mixes + drafts + 1 intentionally thin Paris/AR demonstrating the thin-content gate) |
| ArticleDestination | 8 · Destination→Destination curated ContentLinks: 4 → **ContentLinks total 13** (matches the local reference DB exactly) |
| Destination FAQs | Marrakech group + per-translation groups (reference DB: 33 FAQ groups total incl. article ones) |
| DestinationMedia | 0 (upsert code exists; the sample set registers none) |

Reference: the local dev DB — which is exactly seeds + clearly-identified lab fixtures — reconciles with the above to the row (13 ContentLinks, 8 ArticleDestinations, 23 destination translations). The 7 orphaned `rabat-weekend-*` DRAFT rows and 5 `redir-lab-*` rows in the local DB are **dev-era test residue, not seed output** — a fresh staging DB seeded per this order will NOT contain them.

## E. Expected Supabase objects (`jouriva-media`)

- **With the code as-is: ZERO objects land in Supabase.** `seed.ts` bypasses the storage abstraction and writes 3 JPEGs to `MEDIA_STORAGE_DIR` on the machine running the seed, storing `/media/<key>` URLs in the DB (see H1).
- **After the H1 fix** (routing `ingestImage` through `storage().put`): exactly **3 objects** (JPEG, opaque random keys like `m1a2b3…f4.jpg`, correct `ContentType`) in `jouriva-media`, public URLs of the form `https://<ref>.supabase.co/storage/v1/object/public/jouriva-media/<key>` (derived from `S3_ENDPOINT` — verified live in Step 4A). Re-runs add **no** new objects (the `(filename, credit)` existence check short-circuits before any upload).

## F. Idempotency assessment

Verified line-by-line; **all three scripts are safe to re-run** (the header claim in `seed.ts` holds):

| Entity | Mechanism |
| --- | --- |
| Users / Author / Categories / Topics / Countries / Cities translations / Destination translations / DestinationMedia / ArticleDestination / ArticleTopic / DestinationTopic | `upsert` keyed on real `@@unique` constraints (`email`, `slug`, `key`, `iso2`, `countryId_locale`, `cityId_locale`, `topicId_locale`, `destinationId_locale`, `destinationId_assetId`, `articleId_topicId`, `destinationId_topicId`, `articleId_locale`, `locale_slug`) |
| Articles | `findFirst` by first-translation slug → create only if missing |
| Article translations | `findUnique(locale_slug)` → skip if exists |
| FAQ groups / transitions | created only inside the translation-create branch (no orphans, no duplicates) |
| Media | `findFirst({ filename, credit })` → skip entirely (no duplicate objects) |
| ContentLinks | `findFirst(owner+target)` dup-guard before create |

Minor caveat (informational): the media skip-key is `(filename, credit)` — if a bucket object were deleted while its DB row remains, a re-run would still skip (row-without-object). Not a staging concern; noted for completeness.

## G. Security assessment

- **Hard-coded dev credentials:** `seed.ts` creates 4 `@jouriva.test` users with password `jouriva-dev-2026` (override via `SEED_PASSWORD` env). These are documented dev-only fixtures (approved in Phases 1–2). **Two staging notes:** (a) `SEED_PASSWORD` should be set to a strong unique value when seeding staging, and (b) the final `console.log` prints the literal dev password regardless of override — cosmetic, but the report flags it so the owner is not misled; the line is dev-console output only and no secret beyond the documented fixture.
- **Real admin:** `create-admin.ts` takes the password via CLI argv (owner-chosen, ≥10 chars, scrypt-hashed immediately); it is never logged or committed. Use a unique staging password; never reuse production secrets.
- **No external side effects:** no HTTP calls, no email, no third-party SDK usage in any seed script (grep-verified). Side effects are limited to the target database + local files (until H1 is fixed, after which: the configured staging bucket).
- **No production bleed:** scripts read only `DATABASE_URL`/`SEED_PASSWORD`/media variables from the environment; nothing targets or references production; `.env` remains gitignored and was untouched throughout this audit.
- **Content safety:** sample content is labeled (`AI-generated placeholder photography`, visible sample-content labels), contains no fabricated prices/visa/transport/hours/stats — consistent with the frozen Phase 3 constraints.

## H. Blockers

1. **`seed.ts` media path bypasses the `StorageProvider` abstraction (BLOCKS staging seed correctness; does NOT block the audit).** `ingestImage()` (scripts/seed.ts, ~lines 32–68) writes directly to `MEDIA_STORAGE_DIR` via `node:fs/promises` and stores `url: "/media/<key>"`. Answer to audit question 8: **NO** — with `MEDIA_STORAGE_PROVIDER=s3` and all S3 variables set, `seed.ts` will still write local files and local URLs (the adapter is never invoked by the seed). Answer to question 12: **YES** — `seed.ts` depends on local filesystem media storage. Consequence on hosted staging (Vercel + Neon + Supabase): the 3 hero `MediaAsset` rows would reference `/media/…` URLs that no server can resolve → hero images 404 (article text/metadata unaffected). `seed-destinations.ts` is unaffected (pure DB).
   **Required future change (NOT made — application code is out of scope this step):** reroute `ingestImage` through the existing `storage()` abstraction — read source file → `storage().put(buf, mime)` → store `stored.key`/`stored.url` — a small, single-function change consistent with the already-approved 4A adapter; then seed with `MEDIA_STORAGE_PROVIDER=s3` so objects land in `jouriva-media` and rows carry public Supabase URLs. **No other seed change is needed.**

No other blockers. Schema, migrations, and the S3 adapter itself are ready as-is.

## I. Exact owner-side actions required

1. **Authorize the H1 micro-fix** (single-function change in `scripts/seed.ts` routing `ingestImage` through `storage().put`) as a future explicitly-scoped step — this audit was forbidden from making it.
2. **Choose the staging admin identity/password** and run `create-admin.ts` (order C.1).
3. **Set the staging environment** (owner-side, never in chat/repo): `DATABASE_URL` = Neon direct string for the seed run, `SEED_PASSWORD` = strong unique value, and after H1: `MEDIA_STORAGE_PROVIDER=s3`, `S3_BUCKET=jouriva-media`, `S3_ENDPOINT` = the Supabase S3 URL, `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` (already configured on the owner machine per Step 4A).
4. **Execute in order C.1→C.3**, then verify: record counts per section D, 3 objects in `jouriva-media` (post-H1), hero images rendering on the staging frontend.
5. Optional but recommended: snapshot (`pg_dump`) the freshly seeded Neon staging DB before any editorial work begins.

## J. Seed execution statement

**NO SEED WAS EXECUTED** — not against Neon, not against the local database, not in whole, not in part, not in dry-run form that writes. This step performed static inspection, schema/constraint verification, dependency inspection, and non-destructive validation only (`npm ci`, `typecheck` PASS, `prisma validate` PASS, `migrate status` "up to date" — local DB untouched, no Neon connection attempted from this workspace). No application code, schema, migration, or infrastructure file was modified; the only repository change is this report.

---

Phases 1–4 remain FINAL APPROVED + FROZEN · Phase 5 NOT started · no seeds run · no Neon data modified · no production infrastructure touched.
