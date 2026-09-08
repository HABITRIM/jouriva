import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { hubs } from "@/content";
import { listPublishedArticles } from "@/lib/cms/public-queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TopicChip, ArticleCard } from "@/components/cards";
import { PublicArticleCard } from "@/components/cms/PublicArticleCard";
import { Faq } from "@/components/Faq";
import { AdSlot } from "@/components/AdSlot";
import { VerificationWarning } from "@/components/Verification";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import type { HubContent } from "@/content/types";

/**
 * Shared hub screen used by all section landing pages
 * (morocco, world, travel-for-moroccans, sports-travel, study-abroad,
 * travel-updates, guides, deals, tools, quiz, about, contact).
 */
export function getHubByKey(key: string): HubContent | undefined {
  return hubs.find((h) => h.key === key);
}

/** Metadata factory — each hub page binds its key at module scope. */
export function hubGenerateMetadata(hubKey: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: Locale }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    const hub = getHubByKey(hubKey);
    if (!hub) return {};
    return buildMetadata({
      locale,
      path: hub.path,
      title: hub.seoTitle[locale],
      description: hub.metaDescription[locale],
    });
  };
}

export const HUB_CATEGORY_PREFIX: Record<string, string | undefined> = {
  morocco: "morocco",
  "travel-for-moroccans": "travel-for-moroccans",
  "sports-travel": "sports-travel",
  guides: "guides",
  world: undefined,
  "study-abroad": undefined,
  "travel-updates": undefined,
  deals: undefined,
  tools: undefined,
  quiz: undefined,
  about: undefined,
  contact: undefined,
};

export async function HubScreen({ hubKey, locale }: { hubKey: string; locale: Locale }) {
  const hub = getHubByKey(hubKey);
  if (!hub) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("common");
  const prefix = HUB_CATEGORY_PREFIX[hubKey];
  const dbArticles = prefix
    ? await listPublishedArticles(locale, prefix === "guides" ? { limit: 6 } : { limit: 3, categoryPrefix: prefix })
    : [];
  const faq = hub.faq?.[locale];

  return (
    <div className="container-jouriva py-8">
      <Breadcrumbs items={[{ name: hub.kicker[locale] }]} />

      <header className="max-w-3xl">
        <p className="kicker">{hub.kicker[locale]}</p>
        <h1 className="font-display mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl">
          {hub.title[locale]}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{hub.intro[locale]}</p>
      </header>

      {hub.showWarning && (
        <div className="mt-6 max-w-3xl">
          <VerificationWarning />
        </div>
      )}

      <div className="mt-8 max-w-3xl">
        <AdSlot placement="header" />
      </div>

      {/* Topics */}
      <section aria-labelledby="hub-topics" className="mt-10">
        <h2 id="hub-topics" className="font-display text-xl font-bold text-navy">
          {t("topics")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {hub.topics.map((topic, i) => (
            <TopicChip key={i} topic={topic} locale={locale} />
          ))}
        </ul>
      </section>

      {/* Featured articles — DB-backed, PUBLISHED only */}
      {dbArticles.length > 0 && (
        <section aria-labelledby="hub-featured" className="mt-10">
          <h2 id="hub-featured" className="font-display text-xl font-bold text-navy">
            {hub.kicker[locale]}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dbArticles.map((a, i) => (
              <PublicArticleCard
                key={a.translationId}
                locale={locale}
                priority={i === 0}
                article={{
                  slug: a.slug,
                  title: a.title,
                  excerpt: a.excerpt,
                  updatedAt: a.updatedAt,
                  hero: a.heroImage ? { url: a.heroImage.url, alt: a.heroImage.alt } : null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {faq && faq.length > 0 && (
        <>
          <Faq items={faq} />
          <JsonLd data={faqSchema(faq)} />
        </>
      )}

      <div className="mt-10 max-w-3xl">
        <AdSlot placement="inContent" />
      </div>

      <JsonLd
        data={breadcrumbSchema([
          { name: hub.kicker[locale], url: absoluteUrl(locale, hub.path) },
        ])}
      />
    </div>
  );
}
