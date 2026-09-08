import { listArticles, listAuthorsAdmin, dashboardCounts } from "@/lib/cms/admin-queries";
import { StatusBadge, VerificationBadgeSmall } from "@/components/admin/badges";
import type { WorkflowStatus, VerificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Article list (spec §20): filters for locale/status/author/verification,
 * search, needs-verification queue view. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = {
    locale: sp.locale as "en" | "es" | "ar" | undefined,
    status: sp.status as WorkflowStatus | undefined,
    verification: sp.verification as VerificationStatus | undefined,
    authorId: sp.authorId || undefined,
    search: sp.q || undefined,
    needsVerification: sp.needsVerification === "1",
  };
  const [rows, authors] = await Promise.all([listArticles(filters), listAuthorsAdmin()]);

  const input = "rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy">Articles</h1>
        <a href="/admin/en/articles/new" className="rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white hover:bg-terracotta-dark">+ New article</a>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-navy-100 bg-white p-4" role="search" aria-label="Filter articles">
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Search
          <input name="q" defaultValue={sp.q ?? ""} className={`mt-1 block ${input}`} placeholder="Title or slug…" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Locale
          <select name="locale" defaultValue={sp.locale ?? ""} className={`mt-1 block ${input}`}>
            <option value="">All</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="ar">AR</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Status
          <select name="status" defaultValue={sp.status ?? ""} className={`mt-1 block ${input}`}>
            <option value="">All</option>
            {["DRAFT", "IN_REVIEW", "FACT_CHECK", "SEO_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Verification
          <select name="verification" defaultValue={sp.verification ?? ""} className={`mt-1 block ${input}`}>
            <option value="">All</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
            <option value="OUTDATED">OUTDATED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Author
          <select name="authorId" defaultValue={sp.authorId ?? ""} className={`mt-1 block ${input}`}>
            <option value="">All</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-charcoal">
          <input type="checkbox" name="needsVerification" value="1" defaultChecked={filters.needsVerification} className="h-4 w-4" />
          Needs verification
        </label>
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-700">Filter</button>
        <a href="/admin/en/articles" className="pb-2 text-sm font-semibold text-ink-soft hover:underline">Reset</a>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Articles with workflow status and verification</caption>
          <thead>
            <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-ink-soft">
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Locale</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Verification</th>
              <th scope="col" className="px-4 py-3">Author</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rows.map((t) => (
              <tr key={t.translationId} className="hover:bg-sand/40">
                <td className="px-4 py-3">
                  <a href={`/admin/en/articles/${t.articleId}/${t.locale}`} className="font-semibold text-navy hover:underline">{t.title}</a>
                  <span className="block text-xs text-ink-soft">/{t.locale}/{t.slug}</span>
                </td>
                <td className="px-4 py-3 font-bold">{t.locale.toUpperCase()}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><VerificationBadgeSmall status={t.verificationStatus} /></td>
                <td className="px-4 py-3">{t.authorName}</td>
                <td className="px-4 py-3 text-xs text-ink-soft">{t.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No articles match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
