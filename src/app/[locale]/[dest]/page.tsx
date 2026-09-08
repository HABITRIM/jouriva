import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getPublishedDestination } from "@/lib/cms/public-destinations";
import { relatedArticlesForDestination } from "@/lib/cms/related";
import { findActiveRedirect } from "@/lib/cms/redirects";
import { permanentRedirect } from "next/navigation";
import { DestinationScreen } from "@/components/destination/DestinationScreen";
import { buildMetadata, type LocalePathOverrides } from "@/lib/seo";
import { SITE } from "@/lib/config";

/**
 * Dynamic country-level destination route (Phase 3): serves DB-driven
 * destinations that have no static hub (e.g. /en/spain/, /fr/france/).
 * Static Phase 1 segments (morocco, world, guides…) always take precedence,
 * so frozen routes are untouched. Unknown slugs → localized 404.
 */

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: Locale; dest: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, dest: slug } = await params;
  const dest = await getPublishedDestination(locale, slug).catch(() => null);
  if (!dest) return {};
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

export default async function DestinationPage({ params }: Props) {
  const { locale, dest: slug } = await params;
  setRequestLocale(locale);

  const dest = await getPublishedDestination(locale, slug);
  if (!dest) {
    // Instant 301 fallback for published slug changes (spec §23)
    const r = await findActiveRedirect(locale, `/${slug}/`).catch(() => null);
    if (r) {
      const to = r.destinationPath.endsWith("/") ? r.destinationPath : `${r.destinationPath}/`;
      permanentRedirect(`/${locale}${to}`);
    }
    notFound();
  }
  // Nested-type destinations (city/region/…) reached at the country level
  // 301 to their relationship-derived canonical path — no duplicate URLs.
  if (dest.type !== "COUNTRY") {
    permanentRedirect(`/${locale}${dest.path}`);
  }
  const related = await relatedArticlesForDestination(dest.destinationId, locale, 6);
  return <DestinationScreen destination={dest} relatedArticles={related} locale={locale} />;
}
