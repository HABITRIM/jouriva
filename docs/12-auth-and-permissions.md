# 12 — Auth & permissions (Phase 2)

Status: **implemented** (first-party credential auth). Sources:
`src/lib/auth.ts` (hashing, sessions, tokens, guards),
`src/middleware.ts` (cookie gate), `src/app/actions/auth.ts` (login/
logout), `src/app/admin/[locale]/login/page.tsx` (login UI).

## 1. Credentials & sessions

- Passwords: **scrypt** (`scrypt$N$r$p$salt$hash`, N=16384, r=8, p=1,
  64-byte key, 16-byte random salt). No plaintext, no reversible storage.
- Sessions: random 32-byte token; the cookie carries
  `token.hmac-sha256(token, SESSION_SECRET)[0:32]` (HttpOnly, SameSite=Lax,
  `Secure` in production). The database stores only
  `sha256(token)` — a DB leak does not leak usable cookies.
- TTL 14 days, sliding on activity; logout deletes the session row.
- Disabling a user (`isActive = false`, ADMIN action) deletes their
  sessions immediately.

## 2. Session secret

`SESSION_SECRET` (≥ 32 random chars, `.env`, never client-side).
Rotating it invalidates every session and every preview token at once.

## 3. Authorization model

- `requireUser()` — any active session; throws otherwise.
- `requireRole("EDITOR", ...)` — session + role check; **ADMIN always
  passes**. Throws `AuthorizationError` (mapped to a friendly form error
  by `actionErrorMessage`, or a "Not authorized" panel on pages).
- Ownership: `AUTHOR` may only act on articles whose `authorId` equals
  their linked `Author` profile (`user.authorProfileId`).
- Every mutation path (server action → service) enforces authorization
  **server-side**; the middleware cookie gate is UX only, never the
  security boundary.

Roles: ADMIN / EDITOR / REVIEWER / AUTHOR — capability matrix in docs/10 §6.

## 4. Bootstrap & user management

- `scripts/create-admin.ts <email> <password> "<Name>"` — production
  bootstrap (ADMIN), scrypt-hashed.
- `scripts/seed.ts` — dev seed creating `admin@/editor@/author@/
  reviewer@jouriva.test` (password `jouriva-dev-2026`, **dev only**, do
  not use in production).
- ADMIN UI: `/admin/en/users/` — create users, change roles at creation,
  enable/disable (disable revokes sessions).

## 5. Login flow

`POST /admin/en/login/` (server action, works without JavaScript) →
`verifyCredentials` → session row + cookie → redirect to `?next=` target
(same-origin only). Failure returns a generic error — no user existence
leaks. The login page renders its own `<html>` shell outside the admin
panel group.

CSRF posture: Next.js server actions require same-origin POSTs of their
encrypted action references; cookies are SameSite=Lax. Remaining
deployment hardening (rate limiting, IP allowlists) is listed in docs/09 §9.

## 6. Preview tokens (separate from sessions)

`createPreviewToken(translationId)` = `{expiryMs}.{hmac(expiry.translationId, SESSION_SECRET)[0:32]}`
— 7-day TTL, scoped to one translation, verified by
`verifyPreviewToken(id, token)`. Preview access requires a valid token OR
a CMS session; anything else gets a 404 identical to missing content.

## 7. Provider path (documented abstraction)

Phase 2 ships first-party credential auth per spec ("documented provider
path", no fake auth). The session layer is isolated in `src/lib/auth.ts`
(`createSession`, `getSessionUser`, `destroySession`,
`verifyCredentials`). To adopt an external identity provider (e.g.
Auth.js/OIDC) later: implement those four functions against the provider,
keep `User`/`Session` tables (provider id in a column), and leave
`requireUser/requireRole` untouched — no call sites change.
