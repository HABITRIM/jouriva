import "server-only";

/**
 * Query normalization (Phase 4, spec §6).
 *
 * Two distinct operations:
 *  - sanitizeRawQuery: makes an arbitrary user string SAFE to store/search
 *    (whitespace collapsing, control-char removal, length cap, removal of the
 *    SQL/LIKE metacharacters % _ \). Applied server-side to every query and
 *    suggestion request (spec §19).
 *  - normalizeForMatch: locale-safe matching form. Lowercase + NFKD +
 *    combining-mark strip removes Latin diacritics (marruecos == Marruecos)
 *    and Arabic ḥarakāt/tatwīl; alef/ya unification (أ إ آ ا / ى ي) improves
 *    Arabic recall. Base Arabic letters are untouched — the normalization is
 *    non-destructive: it is only ever used for MATCHING/aggregation, never
 *    for display (spec §6: never damage Arabic or Spanish).
 */

export const MAX_QUERY_LENGTH = 100;
export const MIN_AUTOCOMPLETE_LENGTH = 2;
export const MAX_AUTOCOMPLETE_QUERY_LENGTH = 60;

/** Safe storage/search form of a raw user query. */
export function sanitizeRawQuery(input: string): string {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ") // control chars
    .replace(/[%_\\]/g, " ") // LIKE/ILIKE metacharacters — never treated as wildcards
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** Locale-safe matching form (Latin + Arabic). Non-destructive: display text never passes through here. */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Latin diacritics (á→a, ü→u, …)
    .replace(/[\u064b-\u0652\u0670\u0640]/g, "") // Arabic ḥarakāt, dagger alif, tatwīl
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627") // أ إ آ ٱ → ا (alef unification)
    .replace(/\u0649/g, "\u064a") // ى → ي (alef maqṣūra → yā)
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation → space (keeps ALL scripts' letters/digits)
    .replace(/\s+/g, " ")
    .trim();
}

/** Word tokens of the normalized form (for word-boundary ranking tiers). */
export function tokenize(input: string): string[] {
  const normalized = normalizeForMatch(input);
  return normalized ? normalized.split(" ") : [];
}
