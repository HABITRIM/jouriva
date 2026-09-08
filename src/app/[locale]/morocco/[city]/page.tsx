import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { sampleCities, getCityBySlug } from "@/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { buildMetadata, absoluteUrl, type LocalePathOverrides } from "@/lib/seo";
import { LOCALES, type Locale } from "@/i18n/routing";
import { getPublishedDestinationByAnchor, destinationEntityExists } from "@/lib/cms/public-destinations";
import { relatedArticlesForDestination } from "@/lib/cms/related";
import { findActiveRedirect } from "@/lib/cms/redirects";
import { permanentRedirect } from "next/navigation";
import { DestinationScreen } from "@/components/destination/DestinationScreen";
import { SITE } from "@/lib/config";

interface Props {
  params: Promise<{ locale: Locale; city: string }>;
}

/** City pages under the STATIC /morocco/* route (Phase 1 URL preservation).
 * DB-driven when a published city Destination exists; otherwise the Phase 1
 * sample page remains (frozen fallback). */

export const revalidate = 300;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => sampleCities.map((city) => ({ locale, city: city.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city: slug } = await params;
  const dest = await getPublishedDestinationByAnchor(locale, "morocco", slug).catch(() => null);
  if (!dest) {
    const city = getCityBySlug(slug);
    if (!city) return {};
    const tr = city.translations[locale];
    return buildMetadata({
      locale,
      path: `/morocco/${city.slug}/`,
      title: tr.seoTitle,
      description: tr.metaDescription,
    });
  }
  const published = dest.group.filter((g) => g.status === "PUBLISHED");
  const overrides: LocalePathOverrides = Object.fromEntries(published.map((g) => [g.locale, g.path]));
  const meta = buildMetadata({
    locale,
    path: dest.path,
    pathOverrides: overrides,
    title: dest.seoTitle ?? dest.name,
    description: dest.metaDescription ?? dest.intro ?? dest.name,
    image: dest.hero ? { url: dest.hero.url, width: dest.hero.width ?? 1200, height: dest.hero.height ?? 630, alt: dest.hero.alt || dest.name } : undefined,
    noIndex: !dest.quality.indexable, // thin-content protection (spec §15)
  });
  const languages = Object.fromEntries(published.map((g) => [g.locale, `${SITE.url}/${g.locale}${g.path}`]));
  return {
    ...meta,
    alternates: {
      canonical: `${SITE.url}/${locale}${dest.path}`,
      languages: { ...languages, "x-default": `${SITE.url}/en${dest.path}` },
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { locale, city: slug } = await params;
  setRequestLocale(locale);

  // DB-driven destination page (Phase 3)
  const dest = await getPublishedDestinationByAnchor(locale, "morocco", slug).catch(() => null);
  if (dest) {
    const related = await relatedArticlesForDestination(dest.destinationId, locale, 6);
    return <DestinationScreen destination={dest} relatedArticles={related} locale={locale} />;
  }

  // A Destination entity exists (any locale) → DB is authoritative: a missing
  // or unpublished locale 404s here; the frozen Phase 1 sample page must NOT
  // leak through (thin-content protection, spec §15).
  if (await destinationEntityExists(slug).catch(() => false)) {
    // Instant 301 fallback for destination slug changes (spec §23, Phase 2 infra)
    const r = await findActiveRedirect(locale, `/morocco/${slug}/`).catch(() => null);
    if (r) {
      const dest2 = r.destinationPath.endsWith("/") ? r.destinationPath : `${r.destinationPath}/`;
      permanentRedirect(`/${locale}${dest2}`);
    }
    notFound(); // DB-managed city, locale not published → 404 (never the frozen sample)
  }

  // Frozen Phase 1 sample page fallback (only for cities with no Destination entity)
  const city = getCityBySlug(slug);
  if (!city) notFound();
  const tr = city.translations[locale];
  const t = await getTranslations("city");
  const common = await getTranslations("common");

  return (
    <div className="container-jouriva py-8">
      <Breadcrumbs
        items={[{ name: common("breadcrumbHome") === "Home" ? "Morocco" : locale === "ar" ? "المغرب" : "Marruecos", href: "/morocco/" }, { name: tr.name }]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="kicker">{tr.region}</p>
          <h1 className="font-display mt-2 text-3xl font-black text-navy sm:text-4xl">{tr.name}</h1>
          <p className="font-display mt-2 text-xl text-terracotta-ink">{tr.headline}</p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{tr.intro}</p>
          <p className="mt-4 text-xs text-ink-soft/80">{common("updated", { date: city.updatedAt })}</p>
        </div>
        <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy/10 lg:aspect-auto">
          <Image
            src={city.image}
            alt={city.imageAlt[locale]}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </figure>
      </div>

      <section aria-labelledby="highlights" className="mt-10 max-w-3xl">
        <h2 id="highlights" className="font-display text-2xl font-bold text-navy">
          {t("highlights")}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tr.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl border border-navy-100 bg-white p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="mt-0.5 text-terracotta">
                {/* small 8-point star bullet (decorative brand motif) */}
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <path d="M8 0l1.8 4.6L14.9 3 12 7l4.9 1-4.9 1 2.9 4-5.1-1.6L8 16l-1.8-4.6L1.1 13 4 9l-4.9-1L4 7 1.1 3l5.1 1.6L8 0z" transform="scale(0.87) translate(1.2 1.2)" />
                </svg>
              </span>
              {h}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 max-w-3xl">
        <Faq items={tr.faq} title={t("faqTitle")} />
      </div>

      <JsonLd
        data={breadcrumbSchema([
          {
            name: locale === "ar" ? "المغرب" : locale === "es" ? "Marruecos" : "Morocco",
            url: absoluteUrl(locale, "/morocco/"),
          },
          { name: tr.name, url: absoluteUrl(locale, `/morocco/${city.slug}/`) },
        ])}
      />
      <JsonLd data={faqSchema(tr.faq)} />
    </div>
  );
}
