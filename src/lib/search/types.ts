/**
 * Search types (Phase 4, spec §5/§8). Provider-agnostic contracts: the public
 * search UI depends only on these shapes, so a future external search provider
 * can replace the PostgreSQL implementation without touching the UI.
 */

export type SearchResultType = "ARTICLE" | "DESTINATION" | "TOPIC" | "AUTHOR";

export const RESULT_TYPES: readonly ("ALL" | SearchResultType)[] = ["ALL", "ARTICLE", "DESTINATION", "TOPIC", "AUTHOR"];

/** A single search result (spec §8). Missing metadata stays null — never fabricated. */
export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  url: string;
  description: string | null;
  image: string | null;
  /** Relevant published context chips (e.g. the article's primary destination, its topics). */
  context: { label: string; url: string }[];
  publishedAt: string | null;
  updatedAt: string | null;
  /** Deterministic ranking score (see ranking.ts) — exposed for debugging/tests only. */
  score: number;
}

export interface SearchInput {
  locale: string;
  /** Sanitized query (see normalize.ts). Empty → caller renders discovery instead. */
  q: string;
  type?: "ALL" | SearchResultType;
  page: number; // 1-based
  pageSize: number; // hard cap enforced by the route/service (spec §10: 20)
}

export interface SearchResponse {
  query: string;
  locale: string;
  type: "ALL" | SearchResultType;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  zeroResults: boolean;
  results: SearchResult[];
}

/** Autocomplete suggestion (spec §11) — minimal payload, published-only. */
export interface Suggestion {
  type: SearchResultType;
  title: string;
  url: string;
}

export interface SuggestInput {
  locale: string;
  q: string;
  limit: number; // hard cap 8
}

/** Discovery/navigation data for the empty-query state (spec §12). */
export interface SearchDiscovery {
  destinations: { title: string; url: string; description: string | null; image: string | null }[];
  topics: { title: string; url: string }[];
  articles: { title: string; url: string; description: string | null }[];
}

export interface SearchProvider {
  search(input: SearchInput): Promise<SearchResponse>;
  suggest(input: SuggestInput): Promise<Suggestion[]>;
  discovery(locale: string): Promise<SearchDiscovery>;
}
