import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { permanentRedirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getPublishedDestination, getPublishedDestinationById, type PublicDestination } from "@/lib/cms/public-destinations";
import { relatedArticlesForDestination } from "@/lib/cms/related";
import { findActiveRedirect } from "@/lib/cms/redirects";
import { DestinationScreen } from "@/components/destination/DestinationScreen";
import { buildMetadata, type LocalePathOverrides } from "@/lib/seo";
import { SITE } from "@/lib/config";

/**
 * Dynamic city-level destination route (Phase 3): /{locale}/{country}/{city}/
 * for DB-driven destinations without a static parent route (e.g.
 * /en/spain/barcelona/, /fr/france/paris/). The static /morocco/* route
 * keeps serving Morocco cities (frozen Phase 1 URLs).
 */

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: Locale; dest: string; city: string }>;
}

async function loadCityDestination(locale: string, countrySlug: string, citySlug: string): Promise<PublicDestination | null> {
  // The country slug segment must resolve to a published country destination
  // in this locale (relationship-derived routing, no slug-text inference).
  const country = await getPublishedDestination(locale, countrySlug);
  if (!country || country.type !== "COUNTRY") return null;
  const anchor = await prisma.destination.findUnique({
    where: { id: country.destinationId },
    select: { countryId: true },
  });
  if (!anchor?.countryId) return null;
  // Exact city destination anchored to that country, published in this locale
  const row = await prisma.destinationTranslation.findFirst({
    where: { locale, slug: citySlug, workflowStatus: "PUBLISHED", destination: { countryId: anchor.countryId } },
    select: { destinationId: true },
  });
  if (!row) return null;
  return getPublishedDestinationById(locale, row.destinationId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, dest, city } = await params;
  const d = await loadCityDestination(locale, dest, city).catch(() => null);
  if (!d) return {};
  const published = d.group.filter((g) => g.status === "PUBLISHED");
  const overrides: LocalePathOverrides = Object.fromEntries(published.map((g) => [g.locale, g.path]));
  const meta = buildMetadata({
    locale,
    path: d.path,
    pathOverrides: overrides,
    title: d.seoTitle ?? d.name,
    description: d.metaDescription ?? d.intro ?? d.name,
    image: d.hero ? { url: d.hero.url, width: d.hero.width ?? 1200, height: d.hero.height ?? 630, alt: d.hero.alt || d.name } : undefined,
    noIndex: !d.quality.indexable, // thin-content protection (spec §15)
  });
  const languages = Object.fromEntries(published.map((g) => [g.locale, `${SITE.url}/${g.locale}${g.path}`]));
  return {
    ...meta,
    alternates: {
      canonical: `${SITE.url}/${locale}${d.path}`,
      languages: { ...languages, "x-default": `${SITE.url}/en${d.path}` },
    },
  };
}

export default async function CityDestinationPage({ params }: Props) {
  const { locale, dest, city } = await params;
  setRequestLocale(locale);

  const d = await loadCityDestination(locale, dest, city);
  if (!d) {
    const r = await findActiveRedirect(locale, `/${dest}/${city}/`).catch(() => null);
    if (r) {
      const to = r.destinationPath.endsWith("/") ? r.destinationPath : `${r.destinationPath}/`;
      permanentRedirect(`/${locale}${to}`);
    }
    notFound();
  }
  const related = await relatedArticlesForDestination(d.destinationId, locale, 6);
  return <DestinationScreen destination={d} relatedArticles={related} locale={locale} />;
}
