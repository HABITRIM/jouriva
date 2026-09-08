import "server-only";
import { prisma } from "@/lib/prisma";
import { sanitizeRawQuery, normalizeForMatch } from "./normalize";

/**
 * Search analytics (Phase 4, spec §15) — privacy-conscious by construction:
 * only the sanitized query, locale, result count and timestamp are stored.
 * No user identifiers, no IP, no session, no profile data.
 *
 * Convention: only the FIRST page of a query records an event (pagination
 * does not inflate query counts). Zero-result searches are recorded too
 * (spec §13/§15).
 */
export async function recordSearch(locale: string, rawQuery: string, resultCount: number): Promise<void> {
  const query = sanitizeRawQuery(rawQuery);
  if (!query) return;
  const normalized = normalizeForMatch(query);
  if (!normalized) return;
  await prisma.searchQueryEvent.create({
    data: { locale, query, normalized, resultCount: Math.max(0, Math.min(9999, Math.trunc(resultCount))) },
  });
}

export interface InsightRow {
  query: string;
  locale: string;
  searchCount: number;
  hasResults: boolean;
}

const INSIGHT_WINDOW_DAYS = 30;

/** Top searches in the window (any outcome), most-searched first. */
export async function topSearches(locale?: string, limit = 20): Promise<InsightRow[]> {
  const since = new Date(Date.now() - INSIGHT_WINDOW_DAYS * 86_400_000);
  const rows = await prisma.searchQueryEvent.groupBy({
    by: ["normalized", "locale"],
    where: { createdAt: { gte: since }, ...(locale ? { locale } : {}) },
    _count: { _all: true },
    _max: { resultCount: true },
    orderBy: { _count: { normalized: "desc" } },
    take: limit,
  });
  // representative display query per normalized key (most recent)
  const display = await recentDisplayQueries(rows.map((r) => r.normalized));
  return rows.map((r) => ({
    query: display.get(r.normalized) ?? r.normalized,
    locale: r.locale,
    searchCount: r._count._all,
    hasResults: (r._max.resultCount ?? 0) > 0,
  }));
}

/** Zero-result searches in the window — content-gap signal. */
export async function zeroResultSearches(locale?: string, limit = 20): Promise<InsightRow[]> {
  const since = new Date(Date.now() - INSIGHT_WINDOW_DAYS * 86_400_000);
  const rows = await prisma.searchQueryEvent.groupBy({
    by: ["normalized", "locale"],
    where: { createdAt: { gte: since }, ...(locale ? { locale } : {}) },
    _count: { _all: true },
    _max: { resultCount: true },
    orderBy: { _count: { normalized: "desc" } },
    take: limit * 4,
  });
  const display = await recentDisplayQueries(rows.map((r) => r.normalized));
  return rows
    .filter((r) => (r._max.resultCount ?? 0) === 0)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, limit)
    .map((r) => ({
      query: display.get(r.normalized) ?? r.normalized,
      locale: r.locale,
      searchCount: r._count._all,
      hasResults: false,
    }));
}

async function recentDisplayQueries(normalizedKeys: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (normalizedKeys.length === 0) return map;
  const rows = await prisma.searchQueryEvent.findMany({
    where: { normalized: { in: normalizedKeys } },
    select: { normalized: true, query: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  for (const r of rows) {
    if (!map.has(r.normalized)) map.set(r.normalized, r.query);
  }
  return map;
}
