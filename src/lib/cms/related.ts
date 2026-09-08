import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Deterministic related-content engine (Phase 3, spec §12).
 *
 * Priority: same destination → same country → same category/topic →
 * limited recent. No randomness, no mass links, no keyword expansion.
 * Curated relationships (ArticleDestination position/role) always rank
 * first. Lists return CARD data only — never article bodies (spec §20).
 */

const CACHE = { tags: ["articles", "destinations"], revalidate: 300 } as { tags: string[]; revalidate: number };

export type RelatedArticleCard = {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  updatedAt: string;
  heroUrl: string | null;
  heroAlt: string;
};

const PUBLISHED_T = {
  workflowStatus: "PUBLISHED" as const,
  OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
};

const cardSelect = {
  articleId: true,
  slug: true,
  title: true,
  excerpt: true,
  updatedAt: true,
  article: { select: { heroImage: { select: { url: true, translations: { select: { locale: true, alt: true } } } } } },
} satisfies Prisma.ArticleTranslationSelect;

type CardRow = {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  updatedAt: Date;
  article: { heroImage: { url: string; translations: { locale: string; alt: string | null }[] } | null };
};

function toCard(r: CardRow, locale: string): RelatedArticleCard {
  const alt = r.article.heroImage?.translations.find((t) => t.locale === locale)?.alt
    ?? r.article.heroImage?.translations.find((t) => t.locale === "en")?.alt
    ?? "";
  return {
    articleId: r.articleId,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    updatedAt: r.updatedAt.toISOString(),
    heroUrl: r.article.heroImage?.url ?? null,
    heroAlt: alt,
  };
}

async function destinationCountryId(destinationId: string): Promise<string | null> {
  const d = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { countryId: true, city: { select: { countryId: true } } },
  });
  return d?.countryId ?? d?.city?.countryId ?? null;
}

/** Articles related to a destination (destination pages, hubs). */
export const relatedArticlesForDestination = (destinationId: string, locale: string, limit = 6) =>
  unstable_cache(
    async (): Promise<RelatedArticleCard[]> => {
      const out: RelatedArticleCard[] = [];
      const seen = new Set<string>();
      const take = (n: number) => Math.max(0, limit - out.length);
      if (take(1) === 0) return out;

      // Tier 1 — editorially linked articles (PRIMARY first, then position)
      const linked = await prisma.articleDestination.findMany({
        where: { destinationId },
        orderBy: [{ role: "asc" }, { position: "asc" }],
        select: { articleId: true },
      });
      if (linked.length) {
        const rows = await prisma.articleTranslation.findMany({
          where: { locale, ...PUBLISHED_T, articleId: { in: linked.map((l) => l.articleId) } },
          select: cardSelect,
          take: take(1),
        });
        for (const r of rows) {
          if (seen.has(r.articleId)) continue;
          seen.add(r.articleId);
          out.push(toCard(r, locale));
        }
      }

      // Tier 2 — same country (sibling destinations of any type)
      if (take(1) > 0) {
        const countryId = await destinationCountryId(destinationId);
        if (countryId) {
          const destIds = await prisma.destination.findMany({
            where: { OR: [{ countryId }, { city: { countryId } }] },
            select: { id: true },
          });
          const rows = await prisma.articleTranslation.findMany({
            where: {
              locale,
              ...PUBLISHED_T,
              article: { destinationLinks: { some: { destinationId: { in: destIds.map((d) => d.id) } } } },
            },
            select: cardSelect,
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            take: take(1) + 6,
          });
          for (const r of rows) {
            if (out.length >= limit) break;
            if (seen.has(r.articleId)) continue;
            seen.add(r.articleId);
            out.push(toCard(r, locale));
          }
        }
      }

      // Tier 3 — limited recent relevant content in this locale
      if (take(1) > 0) {
        const rows = await prisma.articleTranslation.findMany({
          where: { locale, ...PUBLISHED_T },
          select: cardSelect,
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          take: take(1),
        });
        for (const r of rows) {
          if (seen.has(r.articleId)) continue;
          seen.add(r.articleId);
          out.push(toCard(r, locale));
        }
      }
      return out;
    },
    ["related-dest", destinationId, locale, String(limit)],
    CACHE
  )();

/** Articles related to an article (article pages): same destination → country →
 * category → topics → recent. */
export const relatedArticlesForArticle = (articleId: string, locale: string, limit = 3) =>
  unstable_cache(
    async (): Promise<RelatedArticleCard[]> => {
      const out: RelatedArticleCard[] = [];
      const seen = new Set<string>([articleId]);
      const fill = async (rows: CardRow[]) => {
        for (const r of rows) {
          if (out.length >= limit) return;
          if (seen.has(r.articleId)) continue;
          seen.add(r.articleId);
          out.push(toCard(r, locale));
        }
      };
      const query = (where: Prisma.ArticleTranslationWhereInput, take: number) =>
        prisma.articleTranslation.findMany({
          where: { locale, ...PUBLISHED_T, ...where },
          select: cardSelect,
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          take,
        });

      const self = await prisma.article.findUnique({
        where: { id: articleId },
        select: {
          categoryId: true,
          destinationLinks: { select: { destinationId: true, role: true } },
          topics: { select: { topicId: true } },
        },
      });

      // Tier 1 — same destinations
      const destIds = self?.destinationLinks.map((l) => l.destinationId) ?? [];
      if (destIds.length && out.length < limit) {
        await fill(await query({ article: { destinationLinks: { some: { destinationId: { in: destIds } } } } }, limit + 4));
      }
      // Tier 2 — same country
      if (out.length < limit && destIds.length) {
        const countryIds = await Promise.all(destIds.map(destinationCountryId));
        const valid = countryIds.filter((c): c is string => !!c);
        if (valid.length) {
          const destIds2 = await prisma.destination.findMany({
            where: { OR: [{ countryId: { in: valid } }, { city: { countryId: { in: valid } } }] },
            select: { id: true },
          });
          await fill(await query({ article: { destinationLinks: { some: { destinationId: { in: destIds2.map((d) => d.id) } } } } }, limit + 4));
        }
      }
      // Tier 3 — same category
      if (out.length < limit && self?.categoryId) {
        await fill(await query({ article: { categoryId: self.categoryId } }, limit + 2));
      }
      // Tier 4 — same topics
      if (out.length < limit && self?.topics.length) {
        await fill(await query({ article: { topics: { some: { topicId: { in: self.topics.map((t) => t.topicId) } } } } }, limit + 2));
      }
      // Tier 5 — limited recent
      if (out.length < limit) {
        await fill(await query({}, limit + 2));
      }
      return out;
    },
    ["related-article", articleId, locale, String(limit)],
    CACHE
  )();

/** Destinations related to an article (article pages): primary first, then
 * secondary, published translations only. */
export const destinationsForArticle = (articleId: string, locale: string) =>
  unstable_cache(
    async (): Promise<{ destinationId: string; name: string; slug: string; path: string; role: string }[]> => {
      const links = await prisma.articleDestination.findMany({
        where: { articleId },
        orderBy: [{ role: "asc" }, { position: "asc" }],
        include: {
          destination: {
            include: {
              translations: { where: { locale, workflowStatus: "PUBLISHED" }, select: { slug: true, name: true } },
              country: { include: { translations: true } },
              city: { include: { country: { include: { translations: true } } } },
            },
          },
        },
      });
      const out: { destinationId: string; name: string; slug: string; path: string; role: string }[] = [];
      for (const l of links) {
        const tr = l.destination.translations[0];
        if (!tr) continue;
        if (l.destination.type === "COUNTRY") {
          out.push({ destinationId: l.destinationId, name: tr.name, slug: tr.slug, path: `/${tr.slug}/`, role: l.role });
        } else {
          const country = l.destination.city?.country ?? l.destination.country;
          const cs = country?.translations.find((x) => x.locale === locale)?.slug ?? country?.translations.find((x) => x.locale === "en")?.slug;
          out.push({ destinationId: l.destinationId, name: tr.name, slug: tr.slug, path: `/${cs ?? ""}/${tr.slug}/`.replace("//", "/"), role: l.role });
        }
      }
      return out;
    },
    ["article-destinations", articleId, locale],
    CACHE
  )();

/** Topic page data: published articles for one topic (topic lists, spec §11). */
export const articlesForTopic = (topicId: string, locale: string, limit = 24) =>
  unstable_cache(
    async (): Promise<RelatedArticleCard[]> => {
      const rows = await prisma.articleTranslation.findMany({
        where: { locale, ...PUBLISHED_T, article: { topics: { some: { topicId } } } },
        select: cardSelect,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: limit,
      });
      return rows.map((r) => toCard(r, locale));
    },
    ["topic-articles", topicId, locale, String(limit)],
    CACHE
  )();
