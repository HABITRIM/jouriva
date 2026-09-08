import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listDestinationsAdmin } from "@/lib/cms/admin-queries";
import { StatusBadge } from "@/components/admin/badges";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";

/** Destinations admin (Phase 3, spec §17): list + filters. */
export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  await requireRole("EDITOR").catch(() => notFound()); // server-side authz (spec §17)
  const sp = await searchParams;
  const destinations = await listDestinationsAdmin({ search: sp.q, type: sp.type });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy">Destinations</h1>
        <a href="/admin/en/destinations/new/" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-700">
          New destination
        </a>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Countries, cities and other travel destinations — structured entity + editorial core + related content.
        Each locale publishes independently; thin content is protected from indexing.
      </p>

      <form method="get" className="mt-4 flex flex-wrap gap-2" role="search" aria-label="Filter destinations">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name…" className={`${input} max-w-xs`} aria-label="Search destinations" />
        <select name="type" defaultValue={sp.type ?? ""} className={`${input} max-w-40`} aria-label="Type">
          <option value="">All types</option>
          <option value="COUNTRY">Country</option>
          <option value="CITY">City</option>
          <option value="REGION">Region</option>
          <option value="ATTRACTION">Attraction</option>
          <option value="VENUE">Venue</option>
        </select>
        <button type="submit" className="rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm font-bold">Filter</button>
      </form>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">Destinations</caption>
        <thead>
          <tr className="text-left text-xs uppercase text-ink-soft">
            <th scope="col" className="py-2">Destination</th>
            <th scope="col">Type</th>
            <th scope="col">Versions</th>
            <th scope="col">Articles</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {destinations.map((d) => (
            <tr key={d.id}>
              <td className="py-2">
                <a href={`/admin/en/destinations/${d.id}/en/`} className="font-semibold text-navy hover:underline">
                  {d.translations.find((t) => t.locale === "en")?.name ?? d.translations[0]?.name ?? d.id}
                </a>
                {d.isFeatured && <span className="ms-2 rounded-full bg-terracotta-soft px-2 py-0.5 text-[0.65rem] font-bold text-terracotta-ink">FEATURED</span>}
              </td>
              <td className="py-2 text-xs font-bold">{d.type}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1">
                  {d.translations.map((t) => (
                    <a key={t.locale} href={`/admin/en/destinations/${d.id}/${t.locale}/`} title={`${t.locale} · ${t.workflowStatus}`}>
                      <StatusBadge status={t.workflowStatus} />
                      <span className="ms-1 text-xs font-bold">{t.locale.toUpperCase()}</span>
                    </a>
                  ))}
                  {d.translations.length === 0 && <span className="text-xs text-ink-soft">none</span>}
                </div>
              </td>
              <td className="py-2 text-xs">{d._count.articleLinks}</td>
              <td className="py-2">
                {d.translations[0] && (
                  <a className="text-xs font-bold text-terracotta-ink hover:underline" href={`/admin/en/destinations/${d.id}/${d.translations[0].locale}/`}>
                    Edit →
                  </a>
                )}
              </td>
            </tr>
          ))}
          {destinations.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-ink-soft">
                No destinations yet — create the first one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
