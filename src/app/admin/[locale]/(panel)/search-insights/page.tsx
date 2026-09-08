import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { topSearches, zeroResultSearches } from "@/lib/search/analytics";

export const dynamic = "force-dynamic";

const card = "rounded-xl border border-navy-100 bg-white p-5";

/**
 * Admin Search Insights (Phase 4, spec §16): top searches + zero-result
 * searches. Reuses the existing requireRole authorization (EDITOR+), the
 * existing admin layout and the existing table conventions — no new
 * permission system. Aggregated from SearchQueryEvent (privacy-conscious:
 * queries + counts only, 30-day window).
 */
export default async function SearchInsightsPage() {
  await requireRole("EDITOR").catch(() => notFound());
  const [top, zero] = await Promise.all([topSearches(undefined, 20), zeroResultSearches(undefined, 20)]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black text-navy">Search insights</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What visitors search for (last 30 days) — aggregated by normalized query. Privacy-conscious:
        queries and counts only, never personal identifiers.
      </p>

      <section aria-labelledby="top-h" className={`${card} mt-6`}>
        <h2 id="top-h" className="kicker">Top searches</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Top searches</caption>
          <thead>
            <tr className="text-left text-xs uppercase text-ink-soft">
              <th scope="col" className="py-2">Query</th>
              <th scope="col">Locale</th>
              <th scope="col">Searches</th>
              <th scope="col">Result availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {top.map((r) => (
              <tr key={`${r.locale}-${r.query}`}>
                <td className="py-2 font-semibold text-navy" dir="auto">{r.query}</td>
                <td className="py-2 text-xs font-bold">{r.locale.toUpperCase()}</td>
                <td className="py-2">{r.searchCount}</td>
                <td className="py-2">
                  {r.hasResults ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">has results</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">no results</span>
                  )}
                </td>
              </tr>
            ))}
            {top.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-ink-soft">No searches recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="zero-h" className={`${card} mt-6`}>
        <h2 id="zero-h" className="kicker">No-result searches — content gaps</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">No-result searches</caption>
          <thead>
            <tr className="text-left text-xs uppercase text-ink-soft">
              <th scope="col" className="py-2">Query</th>
              <th scope="col">Locale</th>
              <th scope="col">Searches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {zero.map((r) => (
              <tr key={`${r.locale}-${r.query}`}>
                <td className="py-2 font-semibold text-navy" dir="auto">{r.query}</td>
                <td className="py-2 text-xs font-bold">{r.locale.toUpperCase()}</td>
                <td className="py-2">{r.searchCount}</td>
              </tr>
            ))}
            {zero.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-ink-soft">No zero-result searches — every query found something.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
