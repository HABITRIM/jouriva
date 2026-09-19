# JOURIVA — Migration Step 4A

**Real S3-compatible Storage Adapter (Supabase Storage)**
Date: 2026-09-12 · Status: **IMPLEMENTED + VERIFIED — CLOSED (offline checks PASS in the workspace; live Supabase S3 round-trip PASS, executed owner-side 2026-09-19 — see "Live round-trip closure")** · Phases 1–4 frozen and untouched.

> **REPOSITORY-STATE CORRECTION (2026-09-12, owner-reported inconsistency resolved).**
> The owner reported `scripts/verify-storage.ts` absent from the GitHub
> repository and their local checkout. Investigation (public raw-file probes
> of `github.com/HABITRIM/jouriva`) confirmed the cause: **the GitHub Source
> of Truth was 2 commits behind the approved workspace** — GitHub `main` was
> at `dd4d7f2` (Migration Step 2 era: Step-2 doc present, Step-3 doc absent),
> so it contained **neither** this adapter **nor** the dependency, script, or
> this document. Nothing was lost or misdocumented: the workspace repository
> (branch `main`, commit `b2fb11b`, clean tree) contains all three Step-4A
> artifacts, verified byte-present in commit `b2fb11b`:
> - `src/lib/storage.ts` — real `S3Storage` adapter (S3 command usage verified in-tree)
> - `package.json` / `package-lock.json` — `@aws-sdk/client-s3@^3.1135.0`
> - `scripts/verify-storage.ts` — the verification suite (re-verified: offline
>   checks, credential auto-detection from the environment only, zero
>   credential-print sites, byte-equality round-trip with guaranteed `finally`
>   cleanup, no CMS/DB records)
> `scripts/verify-storage.ts` was therefore **not recreated** — it already
> existed at HEAD; recreating it would have been a duplicate. The correction
> consists of this documentation note, the full verification battery re-run
> (below), and a refreshed full-history `jouriva-baseline.bundle` delivered
> so the owner can fast-forward GitHub (no force push required — `dd4d7f2` is
> an ancestor of the new head).

## Objective

Replace the `S3Storage` placeholder in `src/lib/storage.ts` (throwing stub) with a real, production-safe S3-compatible adapter for Supabase Storage's S3 gateway, preserving the existing `StorageProvider` abstraction exactly and keeping every caller (`storage().put/get/delete/exists`) unchanged.

## Supabase S3 configuration (reported by owner)

- Staging project provisioned; PUBLIC bucket **`jouriva-media`**; S3 endpoint `https://<project-ref>.storage.supabase.co/storage/v1/s3` (project reference intentionally not reproduced here); region **eu-west-1**. Credentials exist and are configured on the **owner's local machine** — they are NOT present in this workspace environment and were never requested, displayed, logged, or committed.

## Environment variables (exactly the existing project convention)

| Variable | Role |
| --- | --- |
| `MEDIA_STORAGE_PROVIDER=s3` | selects the S3 adapter (`local` remains the default driver) |
| `S3_BUCKET` | required — target bucket (`jouriva-media` in staging) |
| `S3_ENDPOINT` | required — Supabase S3 gateway URL |
| `S3_ACCESS_KEY_ID` | required — server-side only |
| `S3_SECRET_ACCESS_KEY` | required — server-side only |
| `S3_REGION` | **optional** — pins the SigV4 signing region (AWS `us-east-1` default when unset; set to the Supabase project region, e.g. `eu-west-1`, for strictness) |

No new required variables were introduced; no `NEXT_PUBLIC_` variables were added; no values appear anywhere in the repository or this document.

## Implementation summary

- `src/lib/storage.ts` — `StorageProvider` interface, `StoredObject`, `LocalStorage`, `storage()` factory selection, and the `/media/[key]` route **unchanged**; the placeholder `S3Storage` replaced by the real adapter:
  - **Constructor validation (fail-fast):** missing `S3_BUCKET`/`S3_ENDPOINT`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` throws immediately with a message naming the variables — never their values.
  - **`put(data, mime)`:** generates the same opaque key design as local (`timestamp36 + 16 hex random + extension` — shared exported helper `generateStorageKey`, original filenames never enter keys), uploads via `PutObjectCommand` with correct `ContentType`, returns `{ key, url }`.
  - **Public URL derivation:** derived from `S3_ENDPOINT`, nothing hardcoded — a `*.storage.supabase.co` endpoint maps to the project's public object URL (`https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>`); any other S3-compatible provider falls back to a path-style public URL (portability).
  - **`get(key)`:** `GetObjectCommand` → Buffer; missing/unreadable → `null`; SDK errors never surface to callers (same contract as `LocalStorage.get`).
  - **`delete(key)`:** idempotent; missing objects are not failures.
  - **`exists(key)`:** `HeadObjectCommand` (metadata only, no download); missing → `false`.
  - **Key sanitization:** flat key space enforced (basename-equivalent guard, no traversal, no dot-keys) mirroring the local driver.
  - **Client:** `@aws-sdk/client-s3` `S3Client`, `forcePathStyle: true` (Supabase gateway), lazily imported per operation and module-cached (serverless cold-start friendly; local-driver deployments never load the SDK).
  - **`server-only` import preserved** — adapter is unreachable from client bundles; credentials stay server-side.

## Dependency changes

| Package | Change | Resolved |
| --- | --- | --- |
| `@aws-sdk/client-s3` | **added to `dependencies`** (the single authorized addition; maintained AWS SDK v3, Supabase-S3-compatible) | `3.1135.0` |

- `package.json` + `package-lock.json` updated via npm tooling only. No unrelated packages added, removed, or upgraded.

## Tests performed

New focused suite `scripts/verify-storage.ts` (runs with `npx tsx scripts/verify-storage.ts`; note: requires `NODE_OPTIONS=--conditions=react-server` so the real `server-only` marker package resolves as it does inside Next.js):

- ✓ missing S3 configuration → construction throws safely
- ✓ error names the required variables
- ✓ error does NOT contain variable values (dummy-value leak scan)
- ✓ `MEDIA_STORAGE_PROVIDER=s3` → s3 provider; unset → local provider
- ✓ keys match the opaque pattern; keys are random; keys carry no filenames/directories
- • **LIVE ROUND-TRIP SKIPPED — S3 credentials are not present in this workspace environment** (by design; never prompted for or accepted via chat). The suite auto-detects credentials and performs the real round-trip (upload 1×1 PNG → `exists()` → byte-equal `get()` → `delete()` → `exists() === false`, cleanup guaranteed in `finally`, no CMS records) the moment it runs in a credential-configured environment.

### Live round-trip closure (2026-09-19)

The owner executed the verification suite in their credential-configured
environment — from the **GitHub-synced `jouriva-sync-new` clone** — and
reported the **live Supabase S3 round-trip: PASSED**. A passing run
demonstrates, against the real `jouriva-media` bucket, the full contract:
`put()` of a tiny temporary 1×1 PNG with an opaque key and correct content
type → `exists() === true` → `get()` returns byte-identical data →
`delete()` → `exists() === false`, with guaranteed cleanup and **no
CMS/database records created**. No credential values, endpoint internals,
or bucket keys were emitted by the suite or are recorded here or anywhere in
the repository; adapter behavior, `StorageProvider`, and `LocalStorage` are
unchanged by this closure note. **Migration Step 4A is closed.**

## Verification results

| Check | Result |
| --- | --- |
| `npx tsx scripts/verify-storage.ts` (offline checks) | **PASS (rc 0)** |
| `npm run typecheck` | **PASS (rc 0)** |
| `npm run build` (production, with `DATABASE_URL`) | **PASS (rc 0)** |
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | **"Database schema is up to date!"** (local; Neon untouched by this step) |
| Phase 1–4 regression battery (this turn, after the change) | `phase3-review-checks` **24/24** · `e2e-destinations` **59/59** · `redir-lab-destinations` **10/10** · `e2e-acceptance` **ALL PASS** · `e2e-translations` **PASS** · `redir-lab` **PASS** · `e2e-search` **76/76** (incl. CAP1–CAP9) |

Not run (per instructions): `seed.ts`, `seed-destinations.ts`, `prisma db push`, `prisma migrate dev/reset`, any Neon data changes, Vercel/Cloudflare configuration.

## Limitations

1. **Live Supabase round-trip — RESOLVED (2026-09-19).** The workspace itself never held S3 credentials (owner keeps them locally; the task forbids transferring secrets through chat), and the live verification was executed owner-side from the GitHub-synced `jouriva-sync-new` clone: **PASSED** (see "Live round-trip closure"). The storage adapter is therefore verified offline (workspace) and live (owner environment). `seed.ts` remains intentionally **not run** — seeding is a decision for the next migration step, not part of 4A.
2. `MEDIA_MAX_MB` upload-size governance is enforced at the CMS layer exactly as before (unchanged); serverless body-size limits remain a future Vercel-step consideration (documented in the portability audit).
3. The public-URL derivation rule is Supabase-specific for `*.storage.supabase.co` endpoints with a documented generic fallback — portability to another S3-compatible provider is preserved but its public-URL rule would be reviewed at migration time.

## Files changed

- `src/lib/storage.ts` — placeholder → real adapter (+ shared key helper, config validation, cached client, URL derivation; `LocalStorage` untouched)
- `package.json`, `package-lock.json` — `@aws-sdk/client-s3@^3.1135.0` added to dependencies
- `scripts/verify-storage.ts` — new focused verification suite
- `docs/MIGRATION-STEP-4A.md` — this document

## Boundary confirmations

Phases 1–4 unchanged and frozen · no schema/migration changes · no Neon data changes · no seeds run · no Vercel/Cloudflare configuration · no Clerk · no authentication changes · no media database-model changes · single `StorageProvider` abstraction preserved · Phase 5 NOT started.
