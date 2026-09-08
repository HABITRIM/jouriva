# 10 — Editorial workflow & verification (Phase 2)

Status: **implemented**. Source: `src/lib/cms/workflow.ts` (state machine),
`src/lib/cms/articles.ts` (service), `src/app/actions/articles.ts`
(server actions), editor UI in
`src/app/admin/[locale]/(panel)/articles/[id]/[tr]/page.tsx`.

## 1. The pipeline (spec, exact)

```
KEYWORD → BRIEF → AI OUTLINE → AI DRAFT → FACT CHECK → SEO ANALYSIS
        → HUMAN REVIEW → TRANSLATION → HUMAN REVIEW → PUBLISH
```

State machine states: `DRAFT, IN_REVIEW, FACT_CHECK, SEO_REVIEW, APPROVED,
SCHEDULED, PUBLISHED, ARCHIVED`.

**AI never auto-publishes.** The only actions that can produce
`PUBLISHED`/`SCHEDULED` are `publish` and `schedule` — explicit human
actions, EDITOR or ADMIN, listed in `PUBLISH_ACTIONS`
(`isPublishingAction()`). Draft generation, fact-check results, SEO
scores/guidance and translation completion never advance status on their
own.

## 2. Transition table (`TRANSITIONS`)

| Action | From → To | Roles | Notes |
|---|---|---|---|
| `submit_review` | DRAFT → IN_REVIEW | AUTHOR (own), REVIEWER, EDITOR | |
| `reject` | IN_REVIEW/FACT_CHECK/SEO_REVIEW/APPROVED → DRAFT | REVIEWER, EDITOR | **notes required** (stored as review notes) |
| `start_fact_check` | IN_REVIEW → FACT_CHECK | REVIEWER, EDITOR | |
| `pass_fact_check` | FACT_CHECK → SEO_REVIEW | REVIEWER, EDITOR | |
| `pass_seo_review` / `approve` | SEO_REVIEW → APPROVED | REVIEWER, EDITOR | explicit human approval |
| `schedule` | APPROVED → SCHEDULED | EDITOR | future `scheduledAt` required |
| `unschedule` | SCHEDULED → APPROVED | EDITOR | |
| `publish` | APPROVED/SCHEDULED → PUBLISHED | EDITOR | sets `publishedAt` |
| `unpublish` | PUBLISHED → DRAFT | EDITOR | removes from all discovery |
| `archive` | PUBLISHED/… → ARCHIVED | EDITOR | |
| `revive` | ARCHIVED → DRAFT | EDITOR | |

ADMIN passes every role check. Every applied transition writes an
`ArticleTransition` row (actor, from → to, notes, timestamp) — the full
history is visible in the editor.

Rule checks verified by the automated matrix (`scripts/e2e-acceptance.py`
+ state-machine unit checks): publish from DRAFT blocked, AUTHOR/REVIEWER
publish blocked, reject without notes blocked, schedule without a future
date blocked, illegal source states blocked.

## 3. Human gate (UI)

The editor renders **separate explicit buttons** per current status
("Submit for review", "Start fact-check", "Pass fact-check",
"Approve (human approval)", "Publish", "Schedule…", "Unpublish",
"Archive") plus "Save draft". Saving content never changes status.
Publish-grade actions snapshot a revision before applying.

## 4. Scheduled publishing

`schedule` stores a future `scheduledAt`; scheduled content is invisible
to the public site (the visibility predicate excludes it everywhere:
page, listings, sitemap, RSS, hreflang). Promotion happens via
`/api/cron/publish` (Bearer `CRON_SECRET`) → `promoteDueScheduled()` →
`PUBLISHED` + immediate path revalidation + audit row (actor = system).
Platform scheduler wiring is a documented infrastructure dependency
(docs/09 §7).

## 5. Verification & time-sensitive content (spec §7)

Per-translation fields on `ArticleTranslation`:

- `verificationStatus`: `VERIFIED | NEEDS_REVIEW | OUTDATED | ARCHIVED`
- `lastVerifiedAt`, `verifiedById`, `verificationNotes`
- `warningEnabled`: renders the "verify with official sources" warning on
  the public page (used for visas, entry rules, flights, airlines,
  airports, transport, hotel policies, events, sports travel, prices,
  schedules, restrictions).

Guarantees:

- `OUTDATED` never appears current: the public page shows the warning and
  the dated badge; admin defaults the editor banner for stale content and
  the articles list offers a **"Needs Verification"** filter.
- Verification state is per locale (each translation verified
  independently).
- Future tools remain informational and never present legal advice.

## 6. Roles (enforced server-side)

| Role | Can |
|---|---|
| ADMIN | everything, incl. users/roles, redirects, media deletion, settings |
| EDITOR | content, metadata, taxonomy, translations, media, schedule + publish |
| REVIEWER | review, fact-check pass/fail, SEO pass, approve/reject |
| AUTHOR | own articles only: drafts, edits, submit for review |

`requireRole(...roles)` throws `AuthorizationError` (ADMIN always passes);
the users page renders a clean "Not authorized" panel on denial. See
docs/12 for the auth abstraction and provider path.

## 7. Preview (spec §10)

`/{locale}/preview/{translationId}?t={token}` — renders the **real public
components** from the draft/scheduled/unpublished translation:

- Access: valid HMAC token (`exp.signature`, 7-day TTL, scoped to the
  translation id) **or** any authenticated CMS session.
- `X-Robots-Tag: noindex, nofollow` header (next.config) + `<meta robots>`
  + `noindex` metadata; never in sitemap/RSS/listings; no canonical URL.
- Unauthorized requests receive the same 404 as missing content.

## 8. Revisions

Every save and every publish-grade transition snapshots the full
translation (structured JSON) into `ArticleRevision` (status, editor,
timestamp, note). Restore writes the snapshot back into the editor and
**first** records a new snapshot of the current state — history is never
destructive. Limitation (documented per spec): snapshots are structured
content, not pixel-level document history; FAQ/link groups restore with
the translation, media assets are referenced by id.
