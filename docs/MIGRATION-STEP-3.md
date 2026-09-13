# JOURIVA — Migration Step 3

**Neon PostgreSQL — Staging**
Date: 2026-09-12 · Status: **ALL LOCAL PRECONDITIONS VERIFIED GREEN — NEON MIGRATION GATED PENDING OWNER PROVISIONING** (no Neon integration capability exists in the Arena environment — see "Important findings" and the exact owner actions below)

## Neon project

- **NOT CREATED.** No Neon capability is available to this environment (see findings). Recommended (non-secret) identifiers for the owner when provisioning: project name **`JOURIVA-STAGING`**, environment **STAGING**. This database is NOT production; no production database was created or requested.

## Environment

STAGING (target)

## Database migration

- **NOT PERFORMED — blocked on Neon project existence + secure credential mechanism.** Migrations applied to Neon: **0 of 8**. The approved migration chain (8 migrations, `d095a4d`…`20260906175528_phase4_search_query_events`) is untouched and ready; `npx prisma migrate deploy` is the designated command. `prisma db push` was NOT used and will not be. No reset, no schema edits, no migration edits, no local-database destruction (local data verified intact: 21 article translations / 3 topics / 1 author).

## Prisma migration status

- Local (pre-migration source of truth): `npx prisma validate` → **"The schema at prisma/schema.prisma is valid"**; `npx prisma migrate status` → **"Database schema is up to date!"**
- Neon: pending provisioning (see owner actions).

## Schema verification

- Verified against the live local PostgreSQL (same DDL the migrations will emit on Neon): Articles + translations + workflow/status fields, Authors, Destinations + translations, Topics, Categories, ContentLinks (incl. curated-link owner columns), FAQs, CMS/workflow structures, search structures (`SearchQueryEvent`), redirects, sessions/media, indexes and constraints — all present via the approved migrations. **Neon-side verification will be repeated after `migrate deploy`.** No redesign or optimization performed.

## Seed/data status

- **Assessment completed (no seeds executed anywhere this step):**
  - `scripts/seed-destinations.ts` — explicitly **idempotent** (upserts), small/factual/labeled sample content, no fabricated prices/visa/transport/hours/stats. **Safe for staging.**
  - `scripts/seed.ts` — upsert-based sample users/author/categories/articles + editorial links; **safe content-wise, but generates hero images into the LOCAL media directory** (`MEDIA_STORAGE_DIR` via sharp). On a Neon-only staging database these asset rows reference files no app instance can serve → hero images 404 until the Supabase storage step (next migration step) lands. Text/links/FAQ content is unaffected.
  - `scripts/create-admin.ts` — upsert bootstrap; password passed as CLI argument (owner-chosen, ≥10 chars, scrypt-hashed; dev/staging-only, never exposed in reports).
  - **Local development database is NOT copied** (per instructions): its dev/test state (incl. audit-era lab fixtures) stays local-only.
- **Owner decision required (reported, not decided):** (a) run all seeds on Neon staging now and accept hero-image 404s until Supabase is connected, or (b) run `seed-destinations.ts` + `create-admin.ts` now and defer `seed.ts` until the Supabase media step. Either is safe; no production data migration is proposed.

## Database connectivity

- Local PostgreSQL (dev): **working** (Prisma queries, E2E suites, published-content reads — exercised by the regression battery below).
- Neon: **not connected** (nothing to connect to yet). No connection string was invented, requested via chat, printed, or committed.

## Application verification

- `npm run typecheck`: **PASS (rc 0)**
- `npm run build`: **PASS (rc 0)** — with `DATABASE_URL` present (local). The previously discovered behavior is re-confirmed and respected: **`next build` requires `DATABASE_URL` because public pages perform DB-backed prerendering.** Expected and documented; the future Vercel project must set it at build time. The application was not modified to hide this.
- `npx prisma validate` / `npx prisma migrate status`: PASS / up to date (above).

## TypeScript

PASS (rc 0)

## Build

PASS (rc 0)

## Phase 1 regression

FROZEN — intact. This turn's battery on the frozen tree: `phase3-review-checks.py` **24/24**, `e2e-acceptance.py` **ALL PASS** (Phase 1 layout/brand/sample checks included).

## Phase 2 regression

FROZEN — intact. `e2e-acceptance.py` **ALL PASS**; `e2e-translations.py` **TRANSLATION-INDEPENDENCE PASSED** (this turn).

## Phase 3 regression

FROZEN — intact. This turn: `phase3-review-checks.py` **24/24**, `e2e-destinations.py` **59/59**, `redir-lab-destinations.py` **10/10**, `redir-lab.py` **PASSED** (old URL 301 → new URL 200).

## Phase 4 regression

FROZEN — intact. This turn: `e2e-search.py` **PASS 76 / FAIL 0** (incl. candidate-cap CAP1–CAP9).

## Git status

- Branch `main`, root commit `d095a4d`, HEAD `dd4d7f2` before this step's documentation commit; working tree **clean** apart from the approved documentation file; baseline verified against the approved GitHub state (`github.com/HABITRIM/jouriva`). No `DATABASE_URL`, credential, token, or environment file committed (nothing of the sort exists in the working tree; `.env` remains gitignored and unmodified).

## Files changed

- `docs/MIGRATION-STEP-3.md` (this document) — the only repository change.

## Neon connected

NO

## Supabase connected

NO

## Vercel connected

NO

## Cloudflare connected

NO

## Phase 5 started

NO

## Important findings

1. **No Neon integration capability exists in this Arena environment.** Probe results: no `neonctl` binary (installable ad hoc, but only an interactive OAuth browser flow exists — its callback binds to the sandbox's `127.0.0.1`, which a remote owner's browser cannot reach); the attempted `neonctl` auth probe **timed out unauthenticated — no token was issued and none was requested**; no Neon env vars, no credential helpers. Per the task rules (no invented credentials, no secrets pasted into chat), the migration was not faked and the gate is reported honestly.
2. **Exact owner actions required (choose one path):**
   - **Path A — secure in-workspace provisioning (no secrets in chat):** create the Neon project `JOURIVA-STAGING` in the Neon console; copy its **direct** connection string and **pooled** connection string; open this workspace's **`.env`** file yourself (gitignored, never committed, never printed) and set `DATABASE_URL=<direct-connection-string>` (and optionally `DATABASE_URL_POOLED=<pooled>` for later steps). Then approve resuming this step: this session will run `npx prisma migrate deploy` (direct URL), repeat §7 schema verification, run §9 integrity checks + application verification against Neon, and report — without ever printing the URL. Runtime/migration distinction is preserved exactly as specified (pooled = runtime, direct = migrations).
   - **Path B — fully external execution:** from any machine with credentials: `git clone https://github.com/HABITRIM/jouriva.git && cd jouriva`, set `DATABASE_URL` to the Neon **direct** string in the environment, run `npx prisma migrate deploy`, then `npx prisma migrate status` (expect "Database schema is up to date!") and `npx prisma validate`. Runtime `DATABASE_URL` (Vercel step later) should use the **pooled** string.
3. **`prisma migrate deploy` is confirmed as the only sanctioned apply path** — the 8 approved migrations are additive, self-contained SQL, no Arena dependencies; expected to apply cleanly to Neon vanilla PostgreSQL (no extensions required).
4. **Build-time database requirement re-confirmed** (see Application verification) — relevant for the future Vercel step.
5. **Seed sequencing caveat** (see Seed/data status): hero-image binaries depend on the Supabase storage step; content seeds are otherwise staging-safe and (for `seed-destinations.ts`) idempotent.

## Limitations

- Neon-side results (migration apply, schema/integrity verification on Neon, application-against-Neon checks, staging seed execution) are **pending owner provisioning** and were not simulated. Everything verifiable without Neon has been executed and is green.
- The local development database remains the only database this step touched (read/verified; E2E lab byproducts of this turn's regression run were removed afterwards per established hygiene — post-battery state verified identical to pre-turn state: 21 article translations / 3 topics / 1 author / 0 search events).
