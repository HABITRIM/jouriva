import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseBlocks, type Block } from "@/lib/cms/blocks";
import { destinationQuality, destinationPath } from "@/lib/cms/destinations";
import type { WorkflowStatus, VerificationStatus, DestinationType } from "@prisma/client";

/**
 * Public, cached destination reads (Phase 3). Static-first like articles:
 * cached with tag "destinations" (revalidate 300), invalidated precisely by
 * destination mutations. Visibility: PUBLISHED + publishedAt rules do not
 * apply (destinations have no scheduled future): PUBLISHED only.
 */

const CACHE = { tags: ["destinations"], revalidate: 300 } as { tags: string[]; revalidate: number };

export type PublicDestination = {
  destinationId: string;
  translationId: string;
  locale: string;
  type: DestinationType;
  slug: string;
  name: string;
  tagline: string | null;
  intro: string | null;
  blocks: Block[];
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalOverride: string | null;
  noindex: boolean;
  path: string; // locale-specific public path, e.g. /morocco/marrakech/
  isFeatured: boolean;
  hero: { url: string; alt: string; credit: string | null; aiGenerated: boolean; width: number | null; height: number | null } | null;
  gallery: { url: string; alt: string; credit: string | null; aiGenerated: boolean }[];
  faq: { question: string; answer: string }[];
  verificationStatus: VerificationStatus | null;
  lastVerifiedAt: string | null;
  verificationNotes: string | null;
  warningEnabled: boolean;
  parent: { destinationId: string; name: string; slug: string; path: string } | null; // country page for cities
  children: { destinationId: string; name: string; slug: string; path: string; tagline: string | null; hero: string | null; isFeatured: boolean; sortOrder: number }[];
  relatedDestinations: { destinationId: string; name: string; slug: string; path: string }[]; // curated first, then siblings
  group: { locale: string; slug: string; path: string; status: WorkflowStatus }[]; // translation group for hreflang
  quality: { indexable: boolean; reasons: string[] };
};

const destinationInclude = {
  destination: {
    include: {
      country: { include: { translations: true } },
      city: { include: { country: { include: { translations: true } } } },
      heroAsset: { include: { translations: true } },
      gallery: { orderBy: { position: "asc" as const }, include: { asset: { include: { translations: true } } } },
      translations: { select: { locale: true, slug: true, workflowStatus: true, name: true } },
    },
  },
  faqGroup: { include: { items: { orderBy: { position: "asc" as const }, include: { translations: true } } } },
} as const;

type RawDestTranslation = NonNullable<
  Awaited<ReturnType<typeof prisma.destinationTranslation.findFirst<{ include: typeof destinationInclude }>>>
>;

function trOf(translations: { locale: string; slug?: string; name?: string; alt?: string | null }[] | undefined, locale: string, fallback = "en") {
  if (!translations) return undefined;
  return translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === fallback);
}

type PathDest = {
  type: DestinationType;
  countryId: string | null;
  cityId: string | null;
  country: { id: string; translations: { locale: string; slug: string; name: string }[] } | null;
  city: { country: { id: string; translations: { locale: string; slug: string; name: string }[] } | null } | null;
};

function computePath(dest: PathDest, slug: string, locale: string): { path: string; parent: PublicDestination["parent"] } {
  if (dest.type === "COUNTRY") return { path: destinationPath("COUNTRY", slug, null), parent: null };
  const country = dest.city?.country ?? dest.country;
  const countrySlug = country?.translations.find((x) => x.locale === locale)?.slug ?? country?.translations.find((x) => x.locale === "en")?.slug ?? null;
  const countryName = country?.translations.find((x) => x.locale === locale)?.name ?? country?.translations.find((x) => x.locale === "en")?.name ?? null;
  const path = destinationPath(dest.type, slug, countrySlug);
  return {
    path,
    parent: countrySlug ? { destinationId: `country:${country?.id}`, name: countryName ?? "", slug: countrySlug, path: `/${countrySlug}/` } : null,
  };
}

function mapDestination(t: RawDestTranslation): PublicDestination {
  const { path, parent } = computePath(t.destination, t.slug, t.locale);
  const heroTr = trOf(t.destination.heroAsset?.translations as { locale: string; alt: string | null }[] | undefined, t.locale);
  const country = t.destination.city?.country ?? t.destination.country;
  const anchorOk = t.destination.type === "COUNTRY" ? !!t.destination.countryId : !!(t.destination.cityId || t.destination.countryId);
  const trs = t.destination.translations as { locale: string; slug: string; workflowStatus: WorkflowStatus }[];

  return {
    destinationId: t.destinationId,
    translationId: t.id,
    locale: t.locale,
    type: t.destination.type,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    intro: t.description,
    blocks: parseBlocks(t.blocks ?? []),
    seoTitle: t.seoTitle,
    metaDescription: t.metaDescription,
    canonicalOverride: t.canonicalOverride,
    noindex: t.noindex,
    path,
    isFeatured: t.destination.isFeatured,
    hero: t.destination.heroAsset
      ? {
          url: t.destination.heroAsset.url,
          alt: heroTr?.alt ?? "",
          credit: t.destination.heroAsset.credit,
          aiGenerated: t.destination.heroAsset.aiGenerated,
          width: t.destination.heroAsset.width,
          height: t.destination.heroAsset.height,
        }
      : null,
    gallery: t.destination.gallery.map((g) => {
      const gTr = trOf(g.asset.translations as { locale: string; alt: string | null }[], t.locale);
      return { url: g.asset.url, alt: gTr?.alt ?? "", credit: g.asset.credit, aiGenerated: g.asset.aiGenerated };
    }),
    faq:
      t.faqGroup?.items
        .map((item) => {
          const ftr = item.translations.find((x) => x.locale === t.locale);
          return ftr ? { question: ftr.question, answer: ftr.answer } : null;
        })
        .filter((x): x is { question: string; answer: string } => x !== null) ?? [],
    verificationStatus: t.verificationStatus,
    lastVerifiedAt: t.lastVerifiedAt?.toISOString() ?? null,
    verificationNotes: t.verificationNotes,
    warningEnabled: t.warningEnabled,
    parent: parent && parent.name ? parent : null,
    children: [],
    relatedDestinations: [],
    group: trs.map((x) => ({
      locale: x.locale,
      slug: x.slug,
      path: computePath(t.destination, x.slug, x.locale).path,
      status: x.workflowStatus,
    })),
    quality: destinationQuality(
      { workflowStatus: t.workflowStatus, noindex: t.noindex, name: t.name, description: t.description, blocks: t.blocks, metaDescription: t.metaDescription },
      anchorOk
    ),
  };
}

async function decorate(t: RawDestTranslation, mapped: PublicDestination): Promise<PublicDestination> {
  // child destinations (cities of a country / children of any anchor)
  if (t.destination.type === "COUNTRY") {
    const childCities = await prisma.city.findMany({
      where: { countryId: t.destination.countryId ?? "" },
      include: {
        destinations: {
          include: { translations: true, heroAsset: { include: { translations: true } } },
          where: { isActive: true },
        },
      },
    });
    const kids = childCities
      .flatMap((c) => c.destinations)
      .map((d) => {
        const dtr = d.translations.find((x) => x.locale === t.locale && x.workflowStatus === "PUBLISHED");
        if (!dtr) return null;
        const heroTr = d.heroAsset?.translations.find((x) => x.locale === t.locale) ?? d.heroAsset?.translations.find((x) => x.locale === "en");
        return {
          destinationId: d.id,
          name: dtr.name,
          slug: dtr.slug,
          path: `/${t.slug}/${dtr.slug}/`,
          tagline: dtr.tagline,
          hero: d.heroAsset?.url ?? null,
          heroAlt: heroTr?.alt ?? "",
          isFeatured: d.isFeatured,
          sortOrder: d.sortOrder,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    mapped.children = kids.map(({ heroAlt, ...k }) => {
      void heroAlt;
      return k;
    });
  }

  // curated related destinations (ContentLink), then same-country siblings
  const curated = await prisma.contentLink.findMany({
    where: { ownerDestinationTranslationId: t.id, targetDestinationId: { not: null } },
    orderBy: { position: "asc" },
    include: {
      targetDestination: {
        include: {
          translations: { where: { locale: t.locale, workflowStatus: "PUBLISHED" }, select: { slug: true, name: true } },
          country: { include: { translations: true } },
          city: { include: { country: { include: { translations: true } } } },
        },
      },
    },
  });
  const seen = new Set<string>([t.destinationId]);
  const related: PublicDestination["relatedDestinations"] = [];
  for (const link of curated) {
    const td = link.targetDestination as unknown as PathDest | null;
    const trs = link.targetDestination?.translations[0];
    if (!link.targetDestination || !td || !trs || seen.has(link.targetDestination.id)) continue;
    seen.add(link.targetDestination.id);
    related.push({ destinationId: link.targetDestination.id, name: trs.name, slug: trs.slug, path: computePath(td, trs.slug, t.locale).path });
  }
  if (t.destination.type === "CITY") {
    const countryId = t.destination.city?.countryId ?? t.destination.countryId;
    if (countryId) {
      const siblings = await prisma.destination.findMany({
        where: { type: "CITY", isActive: true, id: { not: t.destinationId }, OR: [{ countryId }, { city: { countryId } }] },
        include: {
          translations: { where: { locale: t.locale, workflowStatus: "PUBLISHED" }, select: { slug: true, name: true } },
          country: { include: { translations: true } },
          city: { include: { country: { include: { translations: true } } } },
        },
        take: 8,
      });
      for (const s of siblings) {
        const str = s.translations[0];
        if (!str || seen.has(s.id)) continue;
        seen.add(s.id);
        related.push({ destinationId: s.id, name: str.name, slug: str.slug, path: computePath(s as unknown as PathDest, str.slug, t.locale).path });
      }
    }
  }
  mapped.relatedDestinations = related.slice(0, 6);
  return mapped;
}

async function mapAndDecorate(t: RawDestTranslation): Promise<PublicDestination> {
  return decorate(t, mapDestination(t));
}

/** Published destination by locale + URL slug (works for dynamic routes). */
export const getPublishedDestination = (locale: string, slug: string) =>
  unstable_cache(
    async (): Promise<PublicDestination | null> => {
      const t = await prisma.destinationTranslation.findFirst({
        where: { locale, slug, workflowStatus: "PUBLISHED" },
        include: destinationInclude,
      });
      return t ? mapAndDecorate(t) : null;
    },
    ["public-destination", locale, slug],
    CACHE
  )();

/** Resolve a destination for the STATIC hub routes (/{locale}/morocco/…):
 * the URL segment is the canonical anchor slug, the content comes from the
 * locale's own translation. Countries: via Country slug; cities: via City slug. */
export const getPublishedDestinationByAnchor = (locale: string, anchorSlug: string, citySlug?: string) =>
  unstable_cache(
    async (): Promise<PublicDestination | null> => {
      if (!citySlug) {
        // 1) current per-locale destination slug (supports live slug changes:
        //    after a rename the URL segment is the translation slug)
        const byTranslation = await prisma.destinationTranslation.findFirst({
          where: { locale, slug: anchorSlug, workflowStatus: "PUBLISHED", destination: { type: "COUNTRY", isActive: true } },
          include: destinationInclude,
        });
        if (byTranslation) return mapAndDecorate(byTranslation);
        // 2) structured country anchor (stable across destination renames)
        const countryTr = await prisma.countryTranslation.findFirst({
          where: { slug: anchorSlug },
          select: { countryId: true },
        });
        if (!countryTr) return null;
        const t = await prisma.destinationTranslation.findFirst({
          where: { locale, workflowStatus: "PUBLISHED", destination: { type: "COUNTRY", countryId: countryTr.countryId } },
          include: destinationInclude,
        });
        return t ? mapAndDecorate(t) : null;
      }
      // 1) structured city anchor (City record slug — locale or en)
      const cityTr = await prisma.cityTranslation.findFirst({
        where: { OR: [{ locale, slug: citySlug }, { locale: "en", slug: citySlug }] },
        select: { cityId: true },
      });
      if (cityTr) {
        const t = await prisma.destinationTranslation.findFirst({
          where: { locale, workflowStatus: "PUBLISHED", destination: { type: "CITY", cityId: cityTr.cityId } },
          include: destinationInclude,
        });
        if (t) return mapAndDecorate(t);
      }
      // 2) renamed city: resolve by the destination translation slug, but keep
      //    the routing relationship-derived (the first segment must still be a
      //    published country anchor in this locale).
      const countryTr2 = await prisma.countryTranslation.findFirst({
        where: { slug: anchorSlug },
        select: { countryId: true },
      });
      if (!countryTr2) return null;
      const t2 = await prisma.destinationTranslation.findFirst({
        where: {
          locale,
          slug: citySlug,
          workflowStatus: "PUBLISHED",
          destination: { type: "CITY", isActive: true, countryId: countryTr2.countryId },
        },
        include: destinationInclude,
      });
      return t2 ? mapAndDecorate(t2) : null;
    },
    ["public-destination-anchor", locale, anchorSlug, citySlug ?? "-"],
    CACHE
  )();

/** Sitemap entries: published + quality-gated + indexable only (spec §15/§21). */
export const publishedDestinationsForSitemap = () =>
  unstable_cache(
    async () => {
      const rows = await prisma.destinationTranslation.findMany({
        where: { workflowStatus: "PUBLISHED", noindex: false },
        select: {
          destinationId: true, locale: true, slug: true, name: true, description: true, blocks: true, metaDescription: true, noindex: true, updatedAt: true,
          destination: {
            select: {
              type: true, countryId: true, cityId: true,
              country: { select: { translations: { select: { locale: true, slug: true } } } },
              city: { select: { country: { select: { translations: { select: { locale: true, slug: true } } } } } },
              translations: { select: { locale: true, slug: true, workflowStatus: true, noindex: true, name: true, description: true, blocks: true, metaDescription: true } },
            },
          },
        },
      });
      const gate = (r: { noindex: boolean; name: string; description: string | null; blocks: unknown; metaDescription: string | null }) =>
        destinationQuality(
          { workflowStatus: "PUBLISHED" as WorkflowStatus, noindex: r.noindex, name: r.name, description: r.description, blocks: r.blocks, metaDescription: r.metaDescription },
          true
        );
      type Row = (typeof rows)[number];
      const pathFor = (r: Row, locale: string, slug: string): string => {
        if (r.destination.type === "COUNTRY") return `/${slug}/`;
        const country = r.destination.city?.country ?? r.destination.country;
        const cs = country?.translations.find((x) => x.locale === locale)?.slug ?? country?.translations.find((x) => x.locale === "en")?.slug;
        return destinationPath(r.destination.type, slug, cs ?? null);
      };
      const byDestination = new Map<string, Row[]>();
      for (const r of rows) {
        if (!gate(r).indexable) continue;
        const list = byDestination.get(r.destinationId) ?? [];
        list.push(r);
        byDestination.set(r.destinationId, list);
      }
      return [...byDestination.values()].map((group) => ({
        updatedAt: group.reduce<Date>((m, g) => (g.updatedAt > m ? g.updatedAt : m), group[0].updatedAt),
        translations: group.map((g) => ({ locale: g.locale, path: pathFor(g, g.locale, g.slug) })),
      }));
    },
    ["destinations-sitemap"],
    CACHE
  )();

/** Published destination by id (used by relationship-derived city routing). */
export const getPublishedDestinationById = (locale: string, destinationId: string) =>
  unstable_cache(
    async (): Promise<PublicDestination | null> => {
      const t = await prisma.destinationTranslation.findFirst({
        where: { locale, destinationId, workflowStatus: "PUBLISHED" },
        include: destinationInclude,
      });
      return t ? mapAndDecorate(t) : null;
    },
    ["public-destination-id", locale, destinationId],
    CACHE
  )();

/** True when ANY Destination entity is anchored to the given city/country slug
 * (any locale, any status). Used by the static /morocco/* routes to switch to
 * strict DB-first mode: the frozen Phase 1 fallback must not leak through when
 * a locale simply isn't published. */
export async function destinationEntityExists(slug: string): Promise<boolean> {
  const row = await prisma.destination.findFirst({
    where: {
      OR: [
        { city: { translations: { some: { slug } } } },
        { country: { translations: { some: { slug } } } },
        { translations: { some: { slug } } }, // current per-locale destination slugs (incl. renamed)
      ],
    },
    select: { id: true },
  });
  return !!row;
}

/** Preview-only fetch (any status) — authorization enforced by the caller. */
export async function getDestinationTranslationForPreview(translationId: string): Promise<PublicDestination | null> {
  const t = await prisma.destinationTranslation.findUnique({ where: { id: translationId }, include: destinationInclude });
  return t ? mapAndDecorate(t) : null;
}
