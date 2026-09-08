# PHASE 4 DELIVERY REPORT — Search, Discovery & Content Navigation Engine

Date: 2026-09-06 · Status: **PHASE 4 — DELIVERED + FINAL APPROVAL — 2026-09-06 — FROZEN**.
The final technical audit (§21) is reviewed and closed; all §17 limitations —
including accent-sensitive ILIKE recall — are reviewed and accepted by the
owner (accent-insensitive recall is a future enhancement only and is NOT to
be reopened within Phase 4). Phases 1–4 are FINAL APPROVED and FROZEN.

Phases 1–3 remain FINAL APPROVED and FROZEN. Phase 4 is purely additive: one
new table, one new service layer, one public route family, one API route, one
admin page. No frozen behavior was modified.

---

## 1. Executive summary

JOURIVA now has a production-ready, PostgreSQL-first search and discovery
system at `/{ar,en,es}/search?q=…` with deterministic ranking (relevance
always outranks freshness), type filters, bounded pagination (20/page),
privacy-conscious query analytics, an admin Search Insights page, and a
lightweight autocomplete API. Strictly PUBLISHED content of the current locale
is searchable across Articles, Destinations, Topics and Authors. The
PostgreSQL implementation sits behind a `SearchProvider` interface so a future
external engine can replace it without UI changes. No AI, vectors, embeddings
or external providers (spec §25) — none installed, none stubbed.

## 2. Architecture

```
src/lib/search/
  types.ts              SearchProvider interface + result/suggestion/discovery shapes
  normalize.ts          sanitizeRawQuery (safety) + normalizeForMatch (matching; Latin+Arabic safe)
  ranking.ts            deterministic scoring (documented magnitudes, §6 below)
  postgres-provider.ts  PostgresSearchProvider: bounded PUBLISHED-only candidate queries (4 parallel),
                        ranking, pagination, suggest, discovery
  analytics.ts          recordSearch + topSearches/zeroResultSearches (aggregation)
  index.ts              getSearchProvider() factory (the future swap point) + re-exports
```

Consumers:
- `src/app/[locale]/search/page.tsx` — public search (server component, dynamic)
- `src/app/api/search/suggest/route.ts` — autocomplete endpoint
- `src/components/search/SearchBox.tsx` — client box (debounce 250 ms, keyboard nav; plain GET form without JS)
- `src/components/search/SearchResultCard.tsx` — result rendering
- `src/app/admin/[locale]/(panel)/search-insights/page.tsx` — admin insights

Discovery (spec §14) does **not** rebuild the Phase 3 engine: the empty-query
and no-results states render existing published content through a bounded
cached read (`discovery()`), and related-content behavior remains exactly the
Phase 3 engine (untouched, regression-verified).

## 3. Files changed / created

**Created:** `src/lib/search/{types,normalize,ranking,postgres-provider,analytics,index}.ts`,
`src/app/[locale]/search/page.tsx`, `src/app/api/search/suggest/route.ts`,
`src/components/search/{SearchBox,SearchResultCard}.tsx`,
`src/app/admin/[locale]/(panel)/search-insights/page.tsx`,
`scripts/e2e-search.py`, `docs/PHASE4-REPORT.md`.

**Modified:** `prisma/schema.prisma` (+`SearchQueryEvent`),
migration `2026090618…_phase4_search_query_events` (new table + 2 indexes),
`src/messages/{en,es,ar}.json` (+`search` namespace, 29 keys each),
`src/app/admin/[locale]/(panel)/layout.tsx` (+1 sidebar entry).

**NOT modified:** all Phase 1–3 services, routes, components, sitemap, RSS,
robots, middleware, workflow, redirect, media, destination and taxonomy logic.

## 4. Database changes

`SearchQueryEvent { id, locale, query, normalized, resultCount, createdAt }`
with `@@index([createdAt])` (30-day insights window) and
`@@index([normalized, locale])` (group-by aggregation). Both indexes are
evidence-based: existing indexes already cover all content queries
(`ArticleTranslation [locale, workflowStatus]`, `DestinationTranslation
[locale, workflowStatus]`, `TopicTranslation [locale, slug]`), so **no new
content-table indexes were added**. Migration is purely additive (verified
SQL: one CREATE TABLE + two CREATE INDEX). The frozen `ContentLink` FKs are
untouched — re-verified live after migration: `ownerId_fkey = RESTRICT/CASCADE`.

## 5. Search provider abstraction

`SearchProvider { search, suggest, discovery }` (types.ts) is the only
contract the UI knows. `getSearchProvider()` (index.ts) is the single factory
point. `PostgresSearchProvider` is the initial implementation: PostgreSQL
only, ORM-parameterized (Prisma), bounded candidate sets (60 articles / 40
destinations / 12 topics / 12 authors per query), no extensions, no external
services. A future provider (e.g. Meilisearch/Typesense/Algolia) implements
the same interface in the factory — routes, page and components unchanged.

## 6. Ranking algorithm (spec §7 — deterministic, documented)

| Component | Points |
| --- | --- |
| Exact match on destination/title name | 1000 |
| startsWith on name/title | 600 |
| Word-boundary match in name/title | 400 |
| Substring match in name/title (or all-token / any-token tiers) | 300 |
| Destination relationship (article's linked destination matches) | +180 |
| Topic relationship (shared topic name) | +140 |
| Category relationship (category name) | +120 |
| Excerpt/description/bio-only match | +80/+60 |
| Editorial priority (existing `Destination.isFeatured`) | +50 |
| **Freshness boost (publishedAt/updatedAt age, 1-year linear decay)** | **≤ 25** |

Critical rule enforced by construction: the freshness cap (25) is far below
the smallest relevance tier gap (80), so relevance always outranks freshness;
nothing sorts by `createdAt` alone. Deterministic tie-breakers: score → title
(locale compare) → type → id. No randomness.

## 7. Query normalization (spec §6)

Two operations, never mixed:
- **sanitizeRawQuery** (safety): control-char removal, whitespace collapse,
  100-char cap, `% _ \` (LIKE metacharacters) stripped — applied server-side
  to every query/suggestion.
- **normalizeForMatch** (matching only, never display): lowercase + NFKD +
  combining-mark strip (Spanish accents: `guia` matches `guía`), Arabic
  ḥarakāt/tatwīl removal, alef unification (أ إ آ → ا) and ى→ي — improving
  Arabic recall without damaging base letters. Verified: Marrakech /
  marrakech / MARRAKECH / MaRrAkEcH equal; `مراكش` == `مَرَاكش`; Marruecos /
  marruecos equal.

## 8. Autocomplete

`GET /api/search/suggest/?locale&q` — server-side validation (locale
whitelist, 2-char minimum, 60-char cap), published-only, ≤ 8 suggestions,
bounded queries, per-type caps (≤ 4 per type) with score-interleaving so eight
near-identical entries never fill the list, `no-store`. Client: 250 ms
debounce, keyboard navigation, ARIA listbox, plain GET form fallback without
JavaScript.

## 9. Discovery integration

Phase 3's deterministic related-content engine is reused untouched. The
search empty/no-results states render existing published content only
(featured destinations with heroes, active topics, latest published guide
titles — bounded, no bodies). Priority order of the Phase 3 engine (explicit
links → city/country → topics → category → freshness) is regression-verified
unchanged.

## 10. Search analytics

`SearchQueryEvent` stores **only**: sanitized query, normalized key, locale,
result count, timestamp (verified: no other columns exist). Recorded on
first-page searches only (pagination doesn't inflate counts); zero-result
searches recorded (spec §13). Recording failures never break search
(`.catch(() => undefined)`). No name/email/IP/session/profile data — schema
asserted by E2E (G4).

## 11. Admin Search Insights

`/admin/en/search-insights/` — **Top searches** and **No-result searches**
(query, locale, count, result availability; 30-day window, aggregated by
normalized query with most-recent display form). Authorization reuses the
existing model: `requireRole("EDITOR")` server-side; anonymous → 404 (E2E
M1/M2). No new permission system.

## 12. SEO

Search pages render `robots: noindex, follow` (existing `buildMetadata`
already emitted `follow: true` — zero SEO code changed), canonical is the
clean `/{locale}/search/` URL, and they are **not** in the sitemap, **not**
in RSS, and not part of content canonical discovery (E2E E1–E4). No
indexable pages exist for arbitrary queries. Phase 1–3 SEO behavior is
byte-identical (regression suites pass).

## 13. Security

- All queries ORM-parameterized; LIKE metacharacters stripped pre-query
  (injection probes pass, DB intact — E2E S16/S20/A11/M4).
- Server-side validation everywhere: locale whitelist, query length caps
  (100 search / 60 suggest), page ∈ [1..50] clamped, pageSize hard-capped 20.
- Published-only enforced in every provider WHERE clause (equality on
  `workflowStatus`), verified by 7-state flip probes on articles AND
  destinations (E2E P1–P6) plus suggest probes (A9).
- No internal metadata leakage: results expose title/excerpt/type/url/context
  chips only; no draft info, no scores, no workflow data in the UI.
- Admin insights behind the existing server-side role gate.

## 14. Performance

Bounded everything: 4 parallel candidate queries per search with server caps;
single decorated include per type (no N+1 — rendering uses only data already
fetched); autocomplete bounded (≤ 8, ≤ 4/type); safe pagination (20/page,
page-count clamped); discovery cached read; `search` route ships 1.36 kB
route JS (client JS: one small SearchBox component); server-first rendering.
Only evidence-based indexes added (2, on the new table).

## 15. Tests

`scripts/e2e-search.py` — **76/76 PASS** against the production build
(67 original checks + 9 candidate-cap audit checks, §21):
- SEARCH (S1–S24): EN/ES/AR, case variants, Arabic harakat normalization,
  accent-insensitivity, exact/partial matches, filters, bogus-filter
  fallback, overlong/injection/wildcard/HTML-safe/malformed-param probes,
  empty-query behavior, ranking sanity.
- PUBLISHING (P1–P6): DRAFT/IN_REVIEW/FACT_CHECK/SEO_REVIEW/APPROVED/
  SCHEDULED/ARCHIVED invisible in search AND suggest (exact-reverted state
  flips), PUBLISHED visible.
- AUTOCOMPLETE (A1–A11): minimum length, limits, type diversity, invalid
  locale 400, locale isolation (EN vs ES), published-only, oversized +
  injection-safe.
- PAGINATION LAB (PL0–PL6): 25 real lab articles inserted → 25-result count,
  page-2 controls, page-2 content, beyond-range clamp, single analytics
  event, full cleanup verified.
- DISCOVERY (D1–D5): destinations/topics/guides panels; no fabricated results.
- SEO (E1–E4): noindex,follow; absent from sitemap and RSS; clean canonical.
- ANALYTICS (G1–G5): recorded, zero-result recorded, locale + count stored,
  schema has no PII columns, pagination doesn't duplicate events.
- SECURITY/ADMIN (M1–M4): role-gated insights, insights show recorded data,
  DB intact after probes.

## 16. Regression tests (spec §23)

| Suite | Result |
| --- | --- |
| Phase 3 review checks (`phase3-review-checks.py`) | **24/24 PASS** |
| Phase 3 destination E2E (`e2e-destinations.py`) | **59/59 PASS** |
| Phase 3 destination redirect lab (`redir-lab-destinations.py`) | **10/10 PASS** |
| Phase 2 acceptance (`e2e-acceptance.py`) | **ALL PASS** |
| Translation independence (`e2e-translations.py`) | **PASSED** |
| Article redirect regression (`redir-lab.py`) | **PASS** |
| `npx tsc --noEmit` | clean |
| `rm -rf .next && npx next build` | clean (search route 1.36 kB) |
| `npx prisma validate` / `migrate status` | valid / up to date |
| Frozen `ContentLink_ownerId_fkey` | RESTRICT/CASCADE (verified live post-migration) |

The Phase 2 workflow state machine is untouched by Phase 4 (no Phase 4 file
imports or modifies `workflow.ts`) and its behavior is exercised end-to-end by
the passing acceptance suite. The Phase 2 "13/13 matrix" was an ephemeral tsx
script (documented in PHASE2-REPORT); its coverage is reproduced by the HTTP
workflow flow in `e2e-acceptance.py`, which passes.

## 17. Known limitations

1. PostgreSQL `ILIKE` matching is substring-based and accent-SENSITIVE:
   an unaccented query does not recall accented titles (e.g. `guia` does not
   recall `guía`) and vice versa; case-insensitivity always holds. No
   stemming/fuzzy matching (by design — no external engines). Morphological
   variants ("searches" vs "search") don't cross-match. (Corrected during the
   §21 audit — the original claim of accent-insensitive recall was wrong.)
2. Ranking runs in JS over tiered, keyset-complete candidate sets (§21);
   matches are complete up to the documented per-tier caps (600/300/400/300/
   200/150), beyond which truncation is deterministic (alphabetical tail of a
   single equal tier). A future provider swap (same interface) is the
   intended path at larger scale.
3. Article context chips show the PRIMARY (or first) linked destination only;
   secondary destinations aren't rendered as chips.
4. Insights aggregate the last 30 days only (fixed window; parameter is a
   one-line change).
5. Author matching is name/bio-based (Author names are locale-independent by
   Phase 2 design; per-locale author names don't exist).
6. Sample data yields < 20 natural results for most queries; pagination was
   verified with the dedicated lab corpus (PL0–PL6).
7. No search box in the site header — deliberately: adding one touches the
   frozen global navigation; search is reachable at `/search` and the empty
   discovery state is fully navigable.

## 18. Infrastructure dependencies

None new. PostgreSQL (existing), Prisma (existing). No external search
provider, no extensions, no env vars, no secrets.

## 19. Acceptance matrix (spec §26)

| Area | Checks | Result |
| --- | --- | --- |
| Search (multilingual, normalization, filters, safety) | 24 | **24 PASS** |
| Publishing isolation (7 non-published states × search+suggest) | 6 | **6 PASS** |
| Autocomplete | 11 | **11 PASS** |
| Pagination | 7 | **7 PASS** |
| Discovery | 5 | **5 PASS** |
| SEO (noindex / sitemap / RSS / canonical) | 4 | **4 PASS** |
| Analytics (recorded, zero-result, locale, count, no PII) | 5 | **5 PASS** |
| Security / Admin | 5 | **5 PASS** |
| Candidate-cap audit (post-review regression) | 9 | **9 PASS** |
| **Phase 4 total** | **76** | **76 PASS / 0 FAIL** |
| Phase 3 regression | 93 (24+59+10) | **93 PASS / 0 FAIL** |
| Phase 2 regression | 3 suites | **ALL PASS** |
| TypeScript | project-wide | **clean** |
| Production build | `next build` | **PASS** |
| Prisma validation | `prisma validate` | **PASS** |
| Migrations | applied + additive-only verified | **PASS** |
| ContentLink frozen FK | live catalog check | **RESTRICT/CASCADE ✓** |

## 20. Final status

**PHASE 4 — DELIVERED + FINAL APPROVAL — 2026-09-06 — FROZEN**

Human approval recorded (post-audit): the owner reviewed the updated report
including §21 (candidate-cap/pagination audit and fix) and confirmed every
result — 76/76 Phase 4 E2E (including CAP1–CAP9 over the 231-article corpus,
exact-match ranking, complete deterministic pagination, 15 topics / 15
authors, ≤8 autocomplete, corpus cleanup), all Phase 1–3 regression suites,
TypeScript/build/Prisma/migrations, the frozen RESTRICT/CASCADE ContentLink
FK, and the post-audit database baseline. The owner explicitly accepted the
§17 limitations: **accent-sensitive ILIKE recall** ("guia" and "guía" are not
guaranteed to cross-match at the database recall stage — accepted; do NOT
reopen this behavior in Phase 4; accent-insensitive recall is a future
enhancement only), plus no stemming/fuzzy matching, bounded deterministic
tier-based candidate retrieval with documented per-tier caps, JS ranking over
those sets, primary/first destination context chip only, 30-day insights
window, locale-independent author names, limited natural sample corpus, and
no global header search in this phase.

With this approval, **Phases 1–4 are FINAL APPROVED and FROZEN**:
Phase 1 — FINAL APPROVED + FROZEN · Phase 2 — FINAL APPROVED + FROZEN ·
Phase 3 — FINAL APPROVED + FROZEN · Phase 4 — FINAL APPROVED + FROZEN.

No further code, schema, migration, UI, search-behavior or test changes; no
search-UI redesign; no header search; no Phase 5+ work started.

Scope protection (spec §25): no AI search, no vector search, no embeddings,
no chatbot, no personalization, no booking, no affiliate/deals engine, no
quiz, no newsletter, no advertising engine, no sports-event engine, no
study-abroad engine, no mass programmatic SEO, no external search provider.
Visual identity untouched.

STOP — awaiting the explicit Phase 5 specification.

---

## 21. ADDENDUM — Final technical audit: candidate caps & pagination (2026-09-06)

**Audit finding (confirmed real).** The original provider fetched each content
type with a single bounded query (`take: 60/40/12/12`) and **no deterministic
ordering**, then ranked/paginated in JS. When the match set for one type
exceeded the cap, rows beyond it were never fetched: `total` under-reported
and later pages omitted valid results. Arbitrary truncation could also drop
the highest-relevance match (e.g. an exact-title match alphabetically late in
a large match set). The 25-article pagination lab could not have caught this
(below the cap), as the auditor suspected.

**Minimum production-safe fix (implemented).** Candidate fetching in
`postgres-provider.ts` was redesigned — ranking semantics, filters, provider
interface, UI, SEO, analytics and all Phase 1–3 code are unchanged:

- Candidates are fetched per **relevance tier**, strongest first:
  Articles: (A) title startsWith → (B) title contains-not-startsWith →
  (C) excerpt-only. Destinations: name startsWith → name contains →
  tagline/description-only. Topics: name startsWith → contains. Authors:
  name startsWith → name contains → biography-only.
- Each tier is **keyset-paginated** (cursor + `orderBy title/name asc, slug asc`
  — slug unique per locale) until the tier is exhausted or its documented cap
  is reached (articles 600/tier + 300 body, destinations 400 + 300, topics
  200, authors 150 + 75).
- Truncation beyond caps is now **deterministic and relevance-preserving**:
  only the alphabetically-late tail of a single equal tier can be affected,
  and the strongest tiers (exact/startsWith matches) are structurally
  retained first. Autocomplete uses a compact single-batch mode (60/tier).
- Bounded resource usage preserved: fixed loop count (≤ ⌈cap/200⌉ batches per
  tier), ≤ 11 tier queries per search (4–6 typical), zero per-result queries
  (no N+1), ORM-parameterized only, published-only filters unchanged in
  every WHERE clause.
- Preserved verbatim: relevance > freshness (ranking.ts untouched),
  deterministic tie-breakers, published-only isolation, per-locale behavior,
  filters, pagination contract, SEO (noindex / not-in-sitemap / not-in-RSS),
  analytics behavior, the frozen ContentLink FK, and all Phase 1–3 files
  (only `src/lib/search/postgres-provider.ts` changed).

**Regression test added (audit items 5/7).** `scripts/e2e-search.py` now
contains the CANDIDATE-CAP AUDIT section (CAP1–CAP9): a temporary corpus of
**231 matching articles** (110 + 120 + one exact-match title placed
alphabetically LAST), **15 topics** and **15 authors** (old caps 12/12):

- CAP1: `total` = exactly 231 (old cap would have reported ≤ 60) — PASS
- CAP2: the exact-match title ranks #1 despite alphabetical-last position — PASS
- CAP3: pages 2 and 3 serve exactly 20 rendered results each — PASS
- CAP4: union of all 12 pages = **231 distinct results, none omitted** — PASS
- CAP5: repeated page-1 fetches are byte-identical (deterministic) — PASS
- CAP6/CAP7: 15 topics / 15 authors all reported (old caps 12/12) — PASS
- CAP8: autocomplete still ≤ 8 suggestions over the large corpus — PASS
- CAP9: audit corpus fully cleaned (DB restored to baseline) — PASS

**Honest correction found during the audit.** The original S8 check
("accent-insensitive recall: `guia` finds `guía`") was a false positive — it
passed on static UI strings, not on results. Candidate recall is PostgreSQL
`ILIKE`-based and therefore accent-SENSITIVE: an unaccented query does not
recall accented titles (case-insensitivity still holds everywhere).
Accent-insensitivity applies to the ranking of already-recalled candidates
and to aggregation. §17 states this limitation explicitly; S8 now verifies
the true guarantee (accented query → accented content).

**Post-fix verification (all re-run on the shipping build).** Phase 4 E2E
**76/76** (67 prior + 9 audit) · Phase 3 review **24/24** · Phase 3
destinations **59/59** · destination redirect lab **10/10** · Phase 2
acceptance ALL PASS · translation independence PASS · article redirect
regression PASS · TypeScript clean · production build clean · Prisma valid ·
migrations up to date · frozen `ContentLink_ownerId_fkey` = RESTRICT/CASCADE
(verified live) · database restored to pre-audit baseline.
