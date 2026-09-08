import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LOCALES } from "@/i18n/routing";
import { getSearchProvider, sanitizeRawQuery, recordSearch, MAX_PAGE_SIZE } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResultCard } from "@/components/search/SearchResultCard";

/**
 * Search page (Phase 4, spec §3): /{locale}/search?q=…
 * - published-only, current-locale-only (enforced server-side by the provider)
 * - bounded pagination (20/page, page validated + clamped server-side)
 * - robots noindex,follow; never in sitemap/RSS (spec §17)
 * - empty query → discovery state, no search executed (spec §12)
 * - every first-page search is recorded (analytics, spec §15)
 */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}

function parseType(raw: string | undefined): "ALL" | "ARTICLE" | "DESTINATION" | "TOPIC" | "AUTHOR" {
  return raw === "articles" || raw === "ARTICLE"
    ? "ARTICLE"
    : raw === "destinations" || raw === "DESTINATION"
      ? "DESTINATION"
      : raw === "topics" || raw === "TOPIC"
        ? "TOPIC"
        : raw === "authors" || raw === "AUTHOR"
          ? "AUTHOR"
          : "ALL";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return buildMetadata({
    locale,
    path: "/search/",
    title: t("title"),
    description: t("metaDescription"),
    noIndex: true, // spec §17: noindex, follow — never an indexable page
  });
}

const TYPE_SLUGS = { ALL: "", ARTICLE: "articles", DESTINATION: "destinations", TOPIC: "topics", AUTHOR: "authors" } as const;

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!LOCALES.includes(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("search");

  const rawQ = sanitizeRawQuery(sp.q ?? "");
  const type = parseType(sp.type);
  const pageRaw = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 50) : 1;

  const provider = getSearchProvider();

  // Empty query → discovery state; no search executed, no analytics event (§12)
  if (!rawQ) {
    const discovery = await provider.discovery(locale);
    return (
      <div className="container-jouriva py-10">
        <header className="mx-auto max-w-3xl text-center">
          <p className="kicker">{t("kicker")}</p>
          <h1 className="font-display mt-2 text-3xl font-black text-navy sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-ink-soft">{t("intro")}</p>
        </header>
        <div className="mx-auto mt-8 max-w-2xl">
          <SearchBox
            locale={locale}
            initialQuery=""
            labels={{ placeholder: t("placeholder"), button: t("button"), suggestionsLabel: t("suggestions") }}
          />
        </div>
        <DiscoveryPanels
          locale={locale}
          discovery={discovery}
          labels={{
            destinations: t("exploreDestinations"),
            topics: t("exploreTopics"),
            articles: t("latestGuides"),
          }}
        />
      </div>
    );
  }

  const response = await provider.search({ locale, q: rawQ, type, page, pageSize: MAX_PAGE_SIZE });

  // Analytics (§15): only page 1 records an event; zero-result searches included.
  if (page === 1) {
    await recordSearch(locale, rawQ, response.total).catch(() => undefined); // analytics must never break search
  }

  const typeParams = (v: string) => (v ? `&type=${v}` : "");
  const pageUrl = (p: number) => `/${locale}/search/?q=${encodeURIComponent(rawQ)}${typeParams(TYPE_SLUGS[type])}&page=${p}`;
  const tabs: { key: "ALL" | "ARTICLE" | "DESTINATION" | "TOPIC" | "AUTHOR"; label: string }[] = [
    { key: "ALL", label: t("filterAll") },
    { key: "ARTICLE", label: t("filterArticles") },
    { key: "DESTINATION", label: t("filterDestinations") },
    { key: "TOPIC", label: t("filterTopics") },
    { key: "AUTHOR", label: t("filterAuthors") },
  ];

  return (
    <div className="container-jouriva py-10">
      <header className="mx-auto max-w-3xl text-center">
        <p className="kicker">{t("kicker")}</p>
        <h1 className="font-display mt-2 text-3xl font-black text-navy sm:text-4xl">{t("title")}</h1>
      </header>
      <div className="mx-auto mt-6 max-w-2xl">
        <SearchBox locale={locale} initialQuery={rawQ} labels={{ placeholder: t("placeholder"), button: t("button"), suggestionsLabel: t("suggestions") }} />
      </div>

      <nav aria-label={t("filtersLabel")} className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/${locale}/search/?q=${encodeURIComponent(rawQ)}${typeParams(TYPE_SLUGS[tab.key])}`}
            aria-current={type === tab.key ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${type === tab.key ? "bg-navy text-white" : "border border-navy-100 bg-white text-ink-soft hover:text-navy"}`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <p className="mx-auto mt-6 max-w-3xl text-sm text-ink-soft" role="status">
        {t("resultsFor", { query: rawQ })} — {t("resultsCount", { count: response.total })}
      </p>

      {response.results.length === 0 ? (
        <NoResults locale={locale} rawQ={rawQ} discovery={await provider.discovery(locale)} labels={{
          noResults: t("noResultsTitle"),
          noResultsHint: t("noResultsHint"),
          destinations: t("exploreDestinations"),
          topics: t("exploreTopics"),
          articles: t("latestGuides"),
        }} />
      ) : (
        <>
          <div className="mx-auto mt-6 grid max-w-3xl gap-4">
            {response.results.map((r) => (
              <SearchResultCard
                key={`${r.type}-${r.id}`}
                result={{ ...r, url: `/${locale}${r.url}`, context: r.context.map((c) => ({ ...c, url: `/${locale}${c.url}` })) }}
                labels={{ ARTICLE: t("typeArticle"), DESTINATION: t("typeDestination"), TOPIC: t("typeTopic"), AUTHOR: t("typeAuthor") }}
              />
            ))}
          </div>

          {response.pageCount > 1 && (
            <nav aria-label={t("paginationLabel")} className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-2">
              {response.page > 1 && (
                <a href={pageUrl(response.page - 1)} className="rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm font-bold" rel="prev">
                  {t("previous")}
                </a>
              )}
              <span className="px-2 text-sm font-bold text-navy">
                {t("pageOf", { page: response.page, total: response.pageCount })}
              </span>
              {response.page < response.pageCount && (
                <a href={pageUrl(response.page + 1)} className="rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm font-bold" rel="next">
                  {t("next")}
                </a>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function DiscoveryPanels({
  locale,
  discovery,
  labels,
}: {
  locale: string;
  discovery: { destinations: { title: string; url: string; description: string | null; image: string | null }[]; topics: { title: string; url: string }[]; articles: { title: string; url: string; description: string | null }[] };
  labels: { destinations: string; topics: string; articles: string };
}) {
  return (
    <div className="mx-auto mt-10 max-w-5xl">
      {discovery.destinations.length > 0 && (
        <section aria-labelledby="disc-dest">
          <h2 id="disc-dest" className="kicker">{labels.destinations}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discovery.destinations.map((d) => (
              <a key={d.url} href={`/${locale}${d.url}`} className="group overflow-hidden rounded-2xl border border-navy-100 bg-white">
                {d.image && <img src={d.image} alt="" className="h-36 w-full object-cover" loading="lazy" />}
                <div className="p-4">
                  <p className="font-display font-black text-navy group-hover:underline">{d.title}</p>
                  {d.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{d.description}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {discovery.topics.length > 0 && (
          <section aria-labelledby="disc-topics">
            <h2 id="disc-topics" className="kicker">{labels.topics}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {discovery.topics.map((tp) => (
                <a key={tp.url} href={`/${locale}${tp.url}`} className="rounded-full border border-navy-100 bg-white px-3.5 py-1.5 text-sm font-semibold text-navy hover:border-navy-200">
                  {tp.title}
                </a>
              ))}
            </div>
          </section>
        )}
        {discovery.articles.length > 0 && (
          <section aria-labelledby="disc-arts">
            <h2 id="disc-arts" className="kicker">{labels.articles}</h2>
            <ul className="mt-3 space-y-2">
              {discovery.articles.map((a) => (
                <li key={a.url}>
                  <a href={`/${locale}${a.url}`} className="font-semibold text-navy hover:underline">
                    {a.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function NoResults({
  locale,
  rawQ,
  discovery,
  labels,
}: {
  locale: string;
  rawQ: string;
  discovery: { destinations: { title: string; url: string; description: string | null; image: string | null }[]; topics: { title: string; url: string }[]; articles: { title: string; url: string; description: string | null }[] };
  labels: { noResults: string; noResultsHint: string; destinations: string; topics: string; articles: string };
}) {
  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="rounded-2xl border border-dashed border-navy-100 p-8 text-center">
        <h2 className="font-display text-xl font-black text-navy">{labels.noResults}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {labels.noResultsHint} <span className="font-semibold text-navy">“{rawQ}”</span>
        </p>
      </div>
      <DiscoveryPanels locale={locale} discovery={discovery} labels={{ destinations: labels.destinations, topics: labels.topics, articles: labels.articles }} />
    </div>
  );
}
