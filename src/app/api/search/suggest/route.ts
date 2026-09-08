import { getSearchProvider, sanitizeRawQuery, MIN_AUTOCOMPLETE_LENGTH, MAX_AUTOCOMPLETE_QUERY_LENGTH } from "@/lib/search";
import { LOCALES } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Autocomplete endpoint (Phase 4, spec §11): GET /api/search/suggest?locale=..&q=..
 * Server-side validation of every parameter; published-only by the provider;
 * bounded to 8 suggestions; no caching (freshness over unpublished content).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "";
  const rawQ = url.searchParams.get("q") ?? "";
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
    return Response.json({ error: "invalid locale" }, { status: 400 });
  }
  const q = sanitizeRawQuery(rawQ).slice(0, MAX_AUTOCOMPLETE_QUERY_LENGTH);
  if (q.length < MIN_AUTOCOMPLETE_LENGTH) {
    return Response.json({ suggestions: [] });
  }
  const suggestions = await getSearchProvider().suggest({ locale, q, limit: 8 });
  return Response.json(
    { suggestions },
    { headers: { "cache-control": "no-store" } }
  );
}
