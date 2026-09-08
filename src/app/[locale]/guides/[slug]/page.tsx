import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/routing";
import { getPublishedArticle, publishedSlugs } from "@/lib/cms/public-queries";
import { findActiveRedirect } from "@/lib/cms/redirects";
import { permanentRedirect } from "next/navigation";
import { buildMetadata, absoluteUrl, type LocalePathOverrides } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { VerificationBadge, VerificationWarning } from "@/components/Verification";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { BlocksRenderer } from "@/components/cms/BlocksRenderer";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 300; // ISR — publish/unpublish revalidates via tag+path

/** Published articles from PostgreSQL (sample layer retired for articles). */
export async function generateStaticParams() {
  try {
    return await publishedSlugs();
  } catch {
    return []; // build without DB still works; pages render on demand
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(locale, slug);
  if (!article || article.noindex) {
    return buildMetadata({ locale: locale as "en", path: `/guides/${slug}/`, title: "Not found", description: "", noIndex: true });
  }
  const overrides: LocalePathOverrides = Object.fromEntries(
    article.translationGroup
      .filter((g) => g.status === "PUBLISHED")
      .map((g) => [g.locale, `/guides/${g.slug}/`])
  );
  return buildMetadata({
    locale: locale as "en",
    path: `/guides/${slug}/`,
    pathOverrides: overrides,
    title: article.seoTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt ?? "",
    ogType: "article",
    image: article.heroImage
      ? { url: article.heroImage.url, width: article.heroImage.width ?? 1200, height: article.heroImage.height ?? 630, alt: article.heroImage.alt || article.title }
      : undefined,
    publishedTime: article.publishedAt ?? undefined,
    modifiedTime: article.updatedAt,
    authors: article.author ? [article.author.name] : undefined,
    noIndex: article.noindex,
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await getPublishedArticle(locale, slug);
  if (!article) {
    // Instant 301 fallback (spec §19): middleware handles redirects with a
    // short TTL cache; this uncached lookup makes slug-change redirects
    // effective immediately even when the old URL was requested recently.
    const r = await findActiveRedirect(locale, `/guides/${slug}/`);
    if (r) {
      const dest = r.destinationPath.endsWith("/") ? r.destinationPath : `${r.destinationPath}/`;
      // 308 = permanent (SEO-equivalent of 301; Next pages cannot emit a bare
      // 301). The middleware path emits exact 301s with its TTL cache.
      permanentRedirect(`/${locale}${dest}`);
    }
    notFound(); // unpublished/missing → 404, never a leak (spec §22)
  }

  const t = await getTranslations("common");
  const publishedLocales = article.translationGroup.filter((g) => g.status === "PUBLISHED");
  const overrides: LocalePathOverrides = Object.fromEntries(
    publishedLocales.map((g) => [g.locale, `/guides/${g.slug}/`])
  );

  const canonicalPath = `/guides/${slug}/`;
  const ogImage = article.heroImage
    ? { url: article.heroImage.url, width: article.heroImage.width ?? 1200, height: article.heroImage.height ?? 630, alt: article.heroImage.alt || article.title }
    : undefined;

  return (
    <div className="container-jouriva py-8">
      <article>
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs
            items={[
              { name: locale === "ar" ? "الأدلة" : locale === "es" ? "Guías" : "Guides", href: "/guides/" },
              { name: article.title },
            ]}
          />

          <p className="kicker">{locale === "ar" ? "دليل سفر" : locale === "es" ? "Guía de viaje" : "Travel guide"}</p>
          <h1 className="font-display mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl">
            {article.h1 ?? article.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-soft">
            {article.author && (
              <a href={`/${locale}/authors/${article.author.slug}/`} className="font-semibold text-navy hover:underline">
                {t("byAuthor", { author: article.author.name })}
              </a>
            )}
            {article.publishedAt && <span>{t("published", { date: article.publishedAt.slice(0, 10) })}</span>}
            {article.readingMinutes != null && (
              <span>{locale === "ar" ? `${article.readingMinutes} دقائق قراءة` : locale === "es" ? `${article.readingMinutes} min de lectura` : `${article.readingMinutes} min read`}</span>
            )}
            {article.verificationStatus && article.lastVerifiedAt && (
              <VerificationBadge info={{ status: article.verificationStatus === "VERIFIED" ? "verified" : article.verificationStatus === "NEEDS_REVIEW" ? "needsReview" : article.verificationStatus === "OUTDATED" ? "outdated" : "archived", lastVerified: article.lastVerifiedAt.slice(0, 10) }} />
            )}
          </div>

          {article.warningEnabled && (
            <div className="mt-4">
              <VerificationWarning />
            </div>
          )}
        </div>

        {article.heroImage && (
          <figure className="relative mx-auto mt-6 aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy/10">
            <Image
              src={article.heroImage.url}
              alt={article.heroImage.alt || article.title}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
            {(article.heroImage.credit || article.heroImage.aiGenerated) && (
              <figcaption className="absolute bottom-2 end-2 rounded-full bg-navy/70 px-3 py-1 text-xs text-white">
                {article.heroImage.credit}
                {article.heroImage.aiGenerated ? " · AI-generated image" : ""}
              </figcaption>
            )}
          </figure>
        )}

        {article.excerpt && (
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft" dir="auto">
            {article.excerpt}
          </p>
        )}

        <div className="mx-auto mt-4 max-w-3xl">
          <BlocksRenderer blocks={article.blocks} assets={article.blockAssets} />
        </div>

        {article.relatedLinks.length > 0 && (
          <section aria-labelledby="related-h" className="mx-auto mt-10 max-w-3xl">
            <h2 id="related-h" className="font-display text-2xl font-bold text-navy">
              {locale === "ar" ? "مواضيع ذات صلة" : locale === "es" ? "Relacionados" : "Related guides"}
            </h2>
            <ul className="mt-3 space-y-2">
              {article.relatedLinks.map((l) => (
                <li key={l.url}>
                  <a href={l.url} className="font-semibold text-terracotta-ink underline-offset-2 hover:underline">{l.anchorText}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {article.faq.length > 0 && (
          <div className="mx-auto max-w-3xl">
            <Faq items={article.faq} />
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          <AdSlot placement="inContent" />
        </div>
      </article>

      {/* Structured data — published content only (spec §22) */}
      {ogImage && (
        <JsonLd
          data={articleSchema({
            locale: locale as "en",
            headline: article.title,
            description: article.metaDescription ?? article.excerpt ?? undefined,
            url: absoluteUrl(locale as "en", canonicalPath, overrides),
            image: ogImage.url,
            authorName: article.author?.name ?? "JOURIVA Editorial",
            datePublished: article.publishedAt ?? article.updatedAt,
            dateModified: article.updatedAt,
          })}
        />
      )}
      {article.faq.length > 0 && <JsonLd data={faqSchema(article.faq)} />}
      <JsonLd
        data={breadcrumbSchema([
          { name: locale === "ar" ? "الأدلة" : locale === "es" ? "Guías" : "Guides", url: absoluteUrl(locale as "en", "/guides/") },
          { name: article.title, url: absoluteUrl(locale as "en", canonicalPath, overrides) },
        ])}
      />
      {/* hreflang rendered by buildMetadata alternates — published versions only */}
      void publishedLocales;
      void DEFAULT_LOCALE;
      void LOCALES;
    </div>
  );
}
