import { dashboardCounts, listArticles, recentlyUpdated } from "@/lib/cms/admin-queries";
import { StatusBadge, VerificationBadgeSmall } from "@/components/admin/badges";

export const dynamic = "force-dynamic";

/** Editorial dashboard (spec §20): pipeline counts, needs-verification queue,
 * recently updated. All server-rendered. */
export default async function AdminDashboard() {
  const [counts, recent, needsVerification] = await Promise.all([
    dashboardCounts(),
    recentlyUpdated(8),
    listArticles({ needsVerification: true }),
  ]);

  const pipeline: { key: string; label: string; count: number }[] = [
    { key: "DRAFT", label: "Drafts", count: counts.DRAFT },
    { key: "IN_REVIEW", label: "In review", count: counts.IN_REVIEW },
    { key: "FACT_CHECK", label: "Fact check", count: counts.FACT_CHECK },
    { key: "SEO_REVIEW", label: "SEO review", count: counts.SEO_REVIEW },
    { key: "APPROVED", label: "Approved", count: counts.APPROVED },
    { key: "SCHEDULED", label: "Scheduled", count: counts.SCHEDULED },
    { key: "PUBLISHED", label: "Published", count: counts.PUBLISHED },
    { key: "ARCHIVED", label: "Archived", count: counts.ARCHIVED },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Editorial dashboard</h1>
          <p className="text-sm text-ink-soft">Content pipeline overview — every publish is an explicit human action.</p>
        </div>
        <a
          href="/admin/en/articles/new"
          className="rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white transition hover:bg-terracotta-dark"
        >
          + New article
        </a>
      </div>

      <section aria-labelledby="pipeline-h" className="mt-6">
        <h2 id="pipeline-h" className="kicker">Pipeline</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pipeline.map((s) => (
            <a
              key={s.key}
              href={`/admin/en/articles?status=${s.key}`}
              className="rounded-xl border border-navy-100 bg-white p-4 transition hover:border-terracotta"
            >
              <p className="text-2xl font-black text-navy">{s.count}</p>
              <p className="text-sm font-semibold text-ink-soft">{s.label}</p>
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="verify-h" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 id="verify-h" className="kicker">Needs verification ({counts.needsVerification})</h2>
          <a href="/admin/en/articles?needsVerification=1" className="text-sm font-bold text-terracotta-ink hover:underline">
            View all →
          </a>
        </div>
        {needsVerification.length === 0 ? (
          <p className="mt-3 rounded-xl border border-navy-100 bg-white p-4 text-sm text-ink-soft">
            Nothing waiting for re-verification.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
            {needsVerification.slice(0, 6).map((t) => (
              <li key={t.translationId} className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <a href={`/admin/en/articles/${t.articleId}/${t.locale}`} className="font-semibold text-navy hover:underline">
                    {t.title}
                  </a>
                  <p className="text-xs text-ink-soft">
                    {t.locale.toUpperCase()} · {t.verificationStatus ?? "UNSET"}
                    {t.lastVerifiedAt ? ` · last verified ${t.lastVerifiedAt.toISOString().slice(0, 10)}` : " · never verified"}
                  </p>
                </div>
                <VerificationBadgeSmall status={t.verificationStatus} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-h" className="mt-8">
        <h2 id="recent-h" className="kicker">Recently updated</h2>
        <ul className="mt-3 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {recent.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3.5">
              <div>
                <a href={`/admin/en/articles/${t.articleId}/${t.locale}`} className="font-semibold text-navy hover:underline">
                  {t.title}
                </a>
                <p className="text-xs text-ink-soft">
                  {t.locale.toUpperCase()} · {t.article.author.name} · {t.updatedAt.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <StatusBadge status={t.workflowStatus} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
