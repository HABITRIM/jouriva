# Environment configuration & portability

## Policy

- Environment variables are **never committed** (`.env*` ignored except
  `.env.example`).
- Source code never contains secrets. Client-exposed values use the
  `NEXT_PUBLIC_` prefix **only** when they are non-secret by definition.
- Provider keys (ads, affiliate, newsletter, DB) are server-side only and
  arrive in their phases.

## Variables (Phase 1)

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | prod builds | Canonical origin for canonicals, hreflang, sitemap, RSS, OG (default `https://www.jouriva.com`) |
| `NEXT_PUBLIC_ADS_DEMO` | optional | `true`/`false` — show demo ad placeholders (default true) |
| `DATABASE_URL` | Phase 2 | PostgreSQL connection for Prisma |

See `.env.example` for the annotated template.

## Portability

- **No vendor SDKs** in Phase 1 — the runtime only needs Node + npm.
- Deployment targets: any Node host (Vercel, Netlify, Docker, VPS with
  `next start`). No provider-specific APIs are used.
- Fonts self-hosted at build time (no Google Fonts runtime dependency).
- Static assets are local; swap to a CDN/DAM later without code changes
  (images resolve from `/public` or absolute URLs).

## Run

```bash
npm install
npm run dev            # dev server, http://localhost:3000
npm run build          # production build
npm run start          # serve production build
npm run typecheck      # strict TypeScript check
npm run prisma:validate # data model check (needs DATABASE_URL placeholder)
```
