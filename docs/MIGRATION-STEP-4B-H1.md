# JOURIVA — Migration Step 4B-H1

**Seed image ingestion routed through the StorageProvider abstraction**
Date: 2026-09-21 · Status: **FIXED + VERIFIED** · One clean commit · not pushed to GitHub.

## 1. Date

2026-09-21

## 2. Baseline commit before H1

`3a03bc6` (workspace `main`; the Step 4B readiness audit commit — includes
`56b4b48`, the GitHub Source-of-Truth head, as an ancestor). Working tree was
clean before the change.

## 3. Problem identified by the Step 4B readiness audit (blocker H1)

`scripts/seed.ts` → `ingestImage()` implemented its **own** persistence:
it derived a directory from `MEDIA_STORAGE_DIR`, called `mkdir` +
`writeFile` directly, generated its own key, and stored a hand-built
`/media/<key>` URL in `MediaAsset`. It therefore bypassed the
`StorageProvider` abstraction entirely: with `MEDIA_STORAGE_PROVIDER=s3`
(and all S3 variables configured), seed images would still have landed on
the local filesystem, and hosted staging (Neon + Supabase) would show
broken hero images. Answers as audited: Q8 "does seed.ts use Supabase when
s3 is configured?" — **NO (before)**; Q12 "does seed.ts depend on local
filesystem media storage?" — **YES (before)**.

## 4. Exact code path changed

- `scripts/seed.ts` → `ingestImage()` only (plus the file docblock and the
  import line — `writeFile`/`mkdir` removed; `storage` imported from
  `../src/lib/storage`).
- `src/lib/storage.ts` (interface, `LocalStorage`, `S3Storage`, `storage()`
  factory), the `MediaAsset` Prisma model, schema, migrations, routes, and
  all Phase 1–4 implementation files: **unchanged** (verified by diff below).

## 5. Before behavior

`ingestImage` → mkdir under `MEDIA_STORAGE_DIR` → own key generation →
`fs.writeFile(dir, key, buf)` → `MediaAsset { storageKey: key, url:
"/media/" + key }`. Storage-provider selection (`storage()`) was never
consulted; the URL only ever worked behind the local `/media/[key]` route.

## 6. After behavior

Existence check first (unchanged) → source file read from the committed
`public/images/` path (unchanged) → `sharp` metadata (unchanged) →
`const stored = await storage().put(buf, mime)` →
`MediaAsset { storageKey: stored.key, url: stored.url }`. The configured
provider now decides persistence: `local` driver in development (same
behavior as before, via the abstraction) or the real S3-compatible adapter
in staging (`MEDIA_STORAGE_PROVIDER=s3` → objects land in `jouriva-media`
with provider-derived public Supabase URLs). No fallback logic exists: if
the provider or its configuration is missing, `storage()`/`S3Storage`
throws with variable names only and the seed fails loudly — it can never
create rows pointing at invalid/local URLs when S3 is configured.

## 7. StorageProvider method actually used

`put(data: Buffer, filename: string): Promise<StoredObject>` where
`StoredObject = { key: string; url: string }` (verified against the actual
interface in `src/lib/storage.ts`; the second parameter is the MIME/content
type in both implementations). `get`/`delete`/`exists` are not used by the
seed. No S3 SDK import, no key generation, and no URL construction exist in
`seed.ts`.

## 8. Idempotency preservation

The existing `findFirst({ where: { filename: file, credit: "AI-generated
placeholder photography" } })` check remains the first statement of
`ingestImage`, with `if (existing) return existing;` **before** any read or
upload — proven positionally by verification check E (index order) and by
the diff (the check is untouched). Re-runs therefore upload nothing and
create no duplicates when the `MediaAsset` already exists. No new lookups
or mechanism were introduced.

## 9. Tests / checks executed

- **New narrowly-scoped verification** `scripts/verify-seed-media-path.ts`
  (`NODE_OPTIONS=--conditions=react-server npx tsx …`) — **12/12 PASS**:
  (A) source image read from `public/images`; (B) `storage().put(buf, mime)`
  called; (C) `stored.key`/`stored.url` drive the `MediaAsset`; (D) no
  `writeFile`/`mkdir`, no `process.env.MEDIA_STORAGE_DIR`, no hand-built
  `/media/${…}` anywhere in `seed.ts`; (E) `(filename, credit)` check
  positionally before the upload; no `@aws-sdk` import in the seed; plus a
  dynamic isolated **local-driver** round-trip (opaque provider key,
  provider-generated URL, byte-identical `get`, `delete`) in a throwaway
  temp directory. **Limitation (honest):** `ingestImage` could not be
  unit-tested directly because `seed.ts` executes `main()` on import —
  importing it would run the seed, which this task forbids; per the task's
  allowance, static verification + the isolated provider-contract test were
  used instead of an invasive refactor.
- `scripts/verify-storage.ts` (existing suite): **PASSED (offline checks)**
  — adapter unchanged.
- `npm ci`: **PASS** (443 packages) · `npm run typecheck`: **PASS (rc 0)**
- `npm run build` (production, local `DATABASE_URL`): **PASS (rc 0)**
- Phase 1–4 regression battery (this turn, after the change):
  `phase3-review-checks` **24/24** · `e2e-destinations` **59/59** ·
  `redir-lab-destinations` **10/10** · `e2e-acceptance` **ALL PASS** ·
  `e2e-translations` **PASS** · `redir-lab` **PASS** · `e2e-search`
  **76/76** (incl. CAP1–CAP9). (Lab fixtures from the battery were removed
  afterwards per established hygiene; DB back to 21 article translations /
  0 search events.)

## 10. Database migration status

`npx prisma validate` → schema valid; `npx prisma migrate status` →
**"Database schema is up to date!"** (local reference DB). No schema change,
no migration created or modified, no destructive command run.

## 11. Confirmation — no seed executed

**NO seed was executed**: not `seed.ts`, not `seed-destinations.ts`, not
`create-admin.ts` — not against Neon, not against the local database, in
whole or in part.

## 12. Confirmation — Neon not modified

Neon was never connected from this workspace this turn; `DATABASE_URL`
pointed at the local development reference DB for read-only validation
(`prisma validate`/`migrate status`). Zero Neon data or schema changes.

## 13. Confirmation — no Supabase objects created

No S3 call was made: the dynamic test exercised the **local** driver in a
temp directory and deleted it. `jouriva-media` is untouched; zero objects
created or deleted. No live Supabase seed verification is claimed.

## 14. Confirmation — Phases 1–4 remain frozen

No application component, route, SEO, search, auth, content-architecture,
or storage-provider redesign was touched. `git diff --stat` for this commit:
`scripts/seed.ts` (+21/−13), new `scripts/verify-seed-media-path.ts`, new
this document. Nothing else.

## 15. Confirmation — Phase 5 not started

Phase 5 was NOT started; no feature work of any kind was performed.

## 16. Files changed

1. `scripts/seed.ts` — the H1 fix (function + docblock + imports)
2. `scripts/verify-seed-media-path.ts` — new isolated verification suite
3. `docs/MIGRATION-STEP-4B-H1.md` — this document

No dependency changes (`storage()` and the adapter already existed).

## 17. Final git status

Working tree **clean** after the commit (`git status --porcelain` = 0).
Branch `main`.

## 18. Commit hash

Single commit, message `fix: route seed media through storage provider`:
see the delivery report accompanying this document (short hash recorded
there at commit time).

Operational note for the eventual staging seed (owner-side, not performed
here): run the seed with
`NODE_OPTIONS=--conditions=react-server npx tsx scripts/seed.ts` so `tsx`
resolves the real `server-only` marker exactly as Next.js does (the seed
now imports the storage abstraction, which is `server-only`).
