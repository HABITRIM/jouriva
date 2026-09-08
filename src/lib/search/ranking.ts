import "server-only";

/**
 * Deterministic ranking (Phase 4, spec §7).
 *
 * Score composition — magnitudes are chosen so RELEVANCE ALWAYS OUTRANKS
 * FRESHNESS: every relevance tier gap is ≥ 80 points while the freshness
 * boost is capped at 25 points (spec: "relevance must outrank freshness";
 * never sort by createdAt alone).
 *
 *  Relevance component                     Points
 *  ──────────────────────────────────────  ──────
 *  exact match on destination/title name     1000
 *  startsWith on name/title                   600
 *  word-boundary match in name/title          400
 *  substring match in name/title              300
 *  destination relationship (article's
 *    linked destination name matches)         +180
 *  topic relationship (shared topic name)     +140
 *  category relationship (category name)      +120
 *  match only in excerpt/description/bio       +80
 *  editorial priority (isFeatured destination) +50  (existing field, spec §7.6)
 *  ──────────────────────────────────────  ──────
 *  freshness (publishedAt/updatedAt age)      ≤ 25   (spec §7.7 — tie-break only)
 *
 * Deterministic tie-breakers after score: title (locale compare), then type,
 * then id. No randomness anywhere.
 */

export const FRESHNESS_CAP = 25;

const exact = 1000;
const startsWith = 600;
const wordBoundary = 400;
const substring = 300;

/** Name/title relevance tier for one normalized haystack. */
export function titleMatchScore(titleNormalized: string, queryNormalized: string, queryTokens: string[]): number {
  if (!queryNormalized) return 0;
  if (titleNormalized === queryNormalized) return exact;
  if (titleNormalized.startsWith(queryNormalized)) return startsWith;
  if (titleNormalized.includes(queryNormalized)) {
    const boundary = new RegExp(`(^| )${escapeRegExp(queryNormalized)}( |$)`);
    return boundary.test(titleNormalized) ? wordBoundary : substring;
  }
  // all-query-tokens match (order-independent, e.g. "marrakech family")
  if (queryTokens.length > 1 && queryTokens.every((t) => titleNormalized.includes(t))) return wordBoundary;
  // any single token prefix-match (weak relevance — lets multi-word content rank)
  if (queryTokens.some((t) => t.length >= 3 && titleNormalized.includes(t))) return substring;
  return 0;
}

/** Body/description relevance (only used when the title did not match). */
export function bodyMatchScore(bodyNormalized: string, queryNormalized: string, queryTokens: string[]): number {
  if (!queryNormalized) return 0;
  if (bodyNormalized.includes(queryNormalized)) return 80;
  if (queryTokens.length > 1 && queryTokens.every((t) => bodyNormalized.includes(t))) return 80;
  if (queryTokens.some((t) => t.length >= 3 && bodyNormalized.includes(t))) return 60;
  return 0;
}

export const SCORE_RELATIONSHIP = {
  destination: 180,
  topic: 140,
  category: 120,
  contextDestOnly: 100, // result IS a destination matching via child/description context
} as const;

/** Editorial priority from existing fields (destinations: isFeatured, spec §7.6). */
export function editorialBoost(isFeatured: boolean): number {
  return isFeatured ? 50 : 0;
}

/**
 * Freshness boost (spec §7.7): linear decay over one year, capped at 25 —
 * strictly smaller than the smallest relevance tier gap (80).
 */
export function freshnessBoost(date: string | Date | null, now = new Date()): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  const ageDays = Math.max(0, (now.getTime() - d.getTime()) / 86_400_000);
  return Math.round(FRESHNESS_CAP * Math.max(0, 1 - ageDays / 365));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
