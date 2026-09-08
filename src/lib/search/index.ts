import "server-only";
import { PostgresSearchProvider } from "./postgres-provider";
import type { SearchProvider } from "./types";

/**
 * Search provider factory (Phase 4, spec §5). The public search UI depends
 * only on the SearchProvider interface — swapping in an external provider
 * later is a change to this factory, not to routes or components.
 */
let provider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (!provider) provider = new PostgresSearchProvider();
  return provider;
}

export type { SearchProvider, SearchInput, SearchResponse, SearchResult, SearchResultType, Suggestion, SearchDiscovery } from "./types";
export { MAX_PAGE_SIZE } from "./postgres-provider";
export { sanitizeRawQuery, normalizeForMatch, MIN_AUTOCOMPLETE_LENGTH, MAX_AUTOCOMPLETE_QUERY_LENGTH } from "./normalize";
export { recordSearch } from "./analytics";
