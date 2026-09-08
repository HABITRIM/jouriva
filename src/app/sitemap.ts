import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/routing";
import { SITE } from "@/lib/config";
import { hubs } from "@/content/hubs";
import { sampleCities } from "@/content/cities";
import { publishedForSitemap } from "@/lib/cms/public-queries";
import { publishedDestinationsForSitemap, destinationEntityExists } from "@/lib/cms/public-destinations";

/**
 * XML sitemap — hreflang alternates attached to every URL via
 * `alternates.languages`; x-default points to the default locale.
 * Articles (Phase 2) and destinations (Phase 3, quality-gated) come from the
 * CMS: PUBLISHED + indexable only (spec §21/§22).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const alternatesFor = (pathFor: (l: string) => string) => ({
    languages: Object.fromEntries([
      ...LOCALES.map((l) => [l, `${SITE.url}/${l}${pathFor(l)}`]),
      ["x-default", `${SITE.url}/${DEFAULT_LOCALE}${pathFor(DEFAULT_LOCALE)}`],
    ]),
  });

  const add = (
    pathFor: (l: string) => string,
    opts?: { lastModified?: string; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" }
  ) => {
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE.url}/${locale}${pathFor(locale)}`,
        lastModified: opts?.lastModified ? new Date(opts.lastModified) : new Date(),
        changeFrequency: opts?.changeFrequency ?? "weekly",
        priority: opts?.priority ?? 0.7,
        alternates: alternatesFor(pathFor),
      });
    }
  };

  // Home
  add(() => "/", { priority: 1.0, changeFrequency: "daily" });

  // Destinations first (Phase 3): DB is authoritative — collect every URL
  // they cover so frozen Phase 1 static entries can be deduped away.
  let destGroups: Awaited<ReturnType<typeof publishedDestinationsForSitemap>> = [];
  const destCovered = new Set<string>();
  try {
    destGroups = await publishedDestinationsForSitemap();
  } catch {
    destGroups = [];
  }
  for (const group of destGroups) {
    for (const t of group.translations) {
      destCovered.add(`${SITE.url}/${t.locale}${t.path}`);
      entries.push({
        url: `${SITE.url}/${t.locale}${t.path}`,
        lastModified: group.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries([
            ...group.translations.map((p) => [p.locale, `${SITE.url}/${p.locale}${p.path}`]),
            ["x-default", `${SITE.url}/${DEFAULT_LOCALE}${group.translations.find((p) => p.locale === DEFAULT_LOCALE)?.path ?? t.path}`],
          ]),
        },
      });
    }
  }

  // Hubs — skip those that are now DB-driven destinations (any locale):
  // the static sample page is replaced by the DB hub (strict DB-first mode).
  for (const hub of hubs) {
    const slug = hub.path.replaceAll("/", "");
    if (await destinationEntityExists(slug).catch(() => false)) continue;
    add(() => hub.path, { priority: 0.9, changeFrequency: "daily" });
  }

  // Cities — same rule as hubs.
  for (const city of sampleCities) {
    if (await destinationEntityExists(city.slug).catch(() => false)) continue;
    if (destCovered.has(`${SITE.url}/en/morocco/${city.slug}/`)) continue;
    add(() => `/morocco/${city.slug}/`, {
      lastModified: city.updatedAt,
      priority: 0.8,
    });
  }

  // CMS articles — per-locale slugs, hreflang only over PUBLISHED versions
  let groups: Awaited<ReturnType<typeof publishedForSitemap>> = [];
  try {
    groups = await publishedForSitemap();
  } catch {
    groups = []; // DB unreachable at build time → static URLs still emitted
  }
  for (const group of groups) {
    for (const t of group.translations) {
      entries.push({
        url: `${SITE.url}/${t.locale}/guides/${t.slug}/`,
        lastModified: t.updatedAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries([
            ...group.translations.map((p) => [p.locale, `${SITE.url}/${p.locale}/guides/${p.slug}/`]),
            ["x-default", `${SITE.url}/${DEFAULT_LOCALE}/guides/${group.translations.find((p) => p.locale === DEFAULT_LOCALE)?.slug ?? t.slug}/`],
          ]),
        },
      });
    }
  }

  return entries;
}
