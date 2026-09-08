# JOURIVA — MIGRATION STEP 1

**GitHub Portability + Dependency Hygiene**
Date: 2026-09-08 · Predecessor: docs/PREMIGRATION-PORTABILITY-AUDIT.md
(owner-approved) · Scope honored: documentation-only-adjacent preparation
step; no deployment, no external connections.

---

## 1. Git initialization

- The project was **not** a Git repository → `git init -b main` performed.
- `.gitignore` inspected (unmodified): excludes `node_modules`, `.next`,
  `/build`, `/out`, `next-env.d.ts`, `.env`/`.env.*` (keeps `.env.example`),
  `*.tsbuildinfo`, `scripts/.fonts/`, `*.pem`, debug logs.
- Complete candidate file list inspected before committing (208 files);
  exclusions verified via `git check-ignore`: `.env`, `node_modules`,
  `.next`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/.fonts` — all
  ignored. No `.env`, secret, upload, local-database, or build-output file
  was staged (verified by pattern scan of the staged list).
- **One clean initial commit:**
  - Message: `chore: establish JOURIVA portable baseline`
  - **Hash: `d095a4d`** (full hash available via `git rev-parse HEAD`)
  - **Tracked files: 208** (src 123, docs 22, public 32, prisma 10,
    scripts 13, root configs/README/gitignore/lockfile 8)
  - `.env` tracked: **NO** · `node_modules` tracked: **NO** ·
    `.next` tracked: **NO** · local media uploads tracked: **NO**
    (uploads live outside the repo in `MEDIA_STORAGE_DIR`; nothing
    matching `uploads`/`.pg` was staged)

## 2. Dependency hygiene (only authorized changes)

| Change | From | To |
| --- | --- | --- |
| `server-only` | (none — Arena had a generated shim inside `node_modules` only, never in the repo) | **added to `dependencies`: `^0.0.1`** (real React marker package, resolved `0.0.1`) |
| `sharp` | `devDependencies` `^0.35.4` | **`dependencies` `^0.35.4`** (same range, resolved `0.35.4` — no upgrade/downgrade) |

- `package-lock.json` updated exclusively via npm tooling
  (`npm install`, then `npm ci` from the updated lockfile).
- No other dependency touched — verified resolutions unchanged:
  `next 15.5.25`, `prisma 6.19.3`, `next-intl 4.14.2`, react 19.1.0.
- No repository-local `server-only` shim remains (fresh `npm ci` installs
  the real package from the lockfile; the shim only ever existed in the
  Arena sandbox's generated `node_modules` and was never committed).

## 3. Validation results (all run after the changes)

| Check | Result |
| --- | --- |
| `npm ci` (clean install from updated lockfile) | OK |
| `npm run typecheck` (`tsc --noEmit`) | **PASS (rc 0)** |
| `npm run build` (`next build`) | **PASS (rc 0)** |
| `npx prisma validate` | PASS (schema valid) |
| `npx prisma migrate status` | **"Database schema is up to date!"** |
| Frozen ContentLink FK (`pg_constraint`, live) | `ContentLink_ownerId_fkey` = `r`/`c` → **ON DELETE RESTRICT / ON UPDATE CASCADE preserved** |

## 4. Phase 1–4 regression results (existing suites, unmodified)

| Suite | Result |
| --- | --- |
| `phase3-review-checks.py` | **PASS 24 / FAIL 0** |
| `e2e-destinations.py` | **PASS 59 / FAIL 0** |
| `redir-lab-destinations.py` | **PASS 10 / FAIL 0** |
| `e2e-acceptance.py` | **ALL E2E CHECKS PASSED** |
| `e2e-translations.py` | **TRANSLATION-INDEPENDENCE PASSED** |
| `redir-lab.py` | **PASSED** (old URL 301 → new URL 200) |
| `e2e-search.py` (Phase 4 incl. candidate-cap CAP1–CAP9) | **PASS 76 / FAIL 0** |

Operational note (no test logic altered): `e2e-translations.py` and
`redir-lab.py` reuse the admin session cookie jar created by
`e2e-acceptance.py` and therefore must run after it. Database aftercare:
this step's validation runs left no residue except one `redir-lab` fixture
(created by `redir-lab.py`'s by-design no-cleanup behavior — removed) and
72 `SearchQueryEvent` test events (truncated, per established pre-handoff
hygiene). All audit-era data untouched. Post-run state: 21 article
translations (16 core content + 5 audit-era redir-lab fixtures),
3 topics, 1 author, 0 search events. No `prisma db push`, no reset, no
migrations created or modified.

## 5. Portability verification (post-change)

- Full import scan of `src/**`: every external import resolves to a
  declared npm dependency (`@prisma/client`, `next`, `next-intl`, `pg`,
  `react`, `react-dom`, `server-only`, `zod`, `sharp`), a `next/*` module,
  a Node builtin, or the `@/*` path alias. Nothing else.
- Grep for Arena/e2b/internal hostnames/IPs across `src/`,
  `next.config.ts`, `package.json`: **zero matches**.
- **No Arena runtime dependency.**

## 6. Frozen-state confirmation

- **Phases 1–4 remain FINAL APPROVED + FROZEN.**
- No changes to: routes, UI, CSS, branding, logo assets, SEO behavior,
  i18n, RTL/LTR, Prisma schema, migrations, ContentLink behavior,
  authentication architecture, roles, search behavior/ranking/accent
  behavior, media abstraction, cron behavior, tests, phase reports.
- No features added, nothing redesigned.

## 7. Boundary confirmations

- **GitHub, Vercel, Neon, Supabase and Clerk were NOT connected.**
- No external infrastructure was created; no deployment performed.
- **No database migration was performed** (schema untouched; migrate
  status verified read-only).
- **Phase 5 was NOT started.**

## Files changed by this step

- `package.json` (server-only added to dependencies; sharp moved from
  devDependencies to dependencies)
- `package-lock.json` (npm-generated sync for the two changes)
- `docs/MIGRATION-STEP-1.md` (this document)
- Git metadata (`.git/` — initialization + commits)

Nothing else. `git status` clean after the documentation commit.
