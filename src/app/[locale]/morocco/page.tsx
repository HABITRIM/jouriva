import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { HubScreen, hubGenerateMetadata } from "../hub-screen";
import { getPublishedDestinationByAnchor, destinationEntityExists } from "@/lib/cms/public-destinations";
import { relatedArticlesForDestination } from "@/lib/cms/related";
import { DestinationScreen } from "@/components/destination/DestinationScreen";
import { buildMetadata, type LocalePathOverrides } from "@/lib/seo";
import { SITE } from "@/lib/config";

/**
 * Morocco country hub (Phase 3): DB-driven when a published Destination
 * exists for the anchor, otherwise the Phase 1 hub screen (frozen fallback).
 */

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const dest = await getPublishedDestinationByAnchor(locale, "morocco").catch(() => null);
  if (!dest) {
    // DB-managed country (any locale) → strict: unpublished locale 404s, it
    // must not fall back to the frozen Phase 1 hub (spec §15 protection).
    if (await destinationEntityExists("morocco").catch(() => false)) notFound();
    return hubGenerateMetadata("morocco")({ params });
  }

  const published = dest.group.filter((g) => g.status === "PUBLISHED");
  const indexableGroup = published; // hreflang: published versions only
  const overrides: LocalePathOverrides = Object.fromEntries(published.map((g) => [g.locale, g.path]));
  const meta = buildMetadata({
    locale,
    path: dest.path,
    pathOverrides: overrides,
    title: dest.seoTitle ?? dest.name,
    description: dest.metaDescription ?? dest.intro ?? dest.name,
    image: dest.hero ? { url: dest.hero.url, width: dest.hero.width ?? 1200, height: dest.hero.height ?? 630, alt: dest.hero.alt || dest.name } : undefined,
    // Thin-content protection (spec §15): published but low-value → noindex
    noIndex: !dest.quality.indexable,
  });
  const languages = Object.fromEntries(indexableGroup.map((g) => [g.locale, `${SITE.url}/${g.locale}${g.path}`]));
  return {
    ...meta,
    alternates: {
      canonical: `${SITE.url}/${locale}${dest.path}`,
      languages: { ...languages, "x-default": `${SITE.url}/en${dest.path}` },
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dest = await getPublishedDestinationByAnchor(locale, "morocco").catch(() => null);
  if (!dest) {
    if (await destinationEntityExists("morocco").catch(() => false)) notFound();
    return <HubScreen hubKey="morocco" locale={locale} />;
  }
  const related = await relatedArticlesForDestination(dest.destinationId, locale, 6);
  return <DestinationScreen destination={dest} relatedArticles={related} locale={locale} />;
}
