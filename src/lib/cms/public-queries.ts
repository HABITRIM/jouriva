import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseBlocks, type Block } from "@/lib/cms/blocks";
import type { WorkflowStatus, VerificationStatus } from "@prisma/client";

/**
 * Public, database-backed content reads (Phase 2, spec §22).
 * All results are cached (tags: ["articles"]) so the public site never hits
 * PostgreSQL per request. STRICT visibility predicate everywhere:
 *   workflowStatus = PUBLISHED  AND  publishedAt <= now
 * noindex content is viewable by URL but excluded from sitemap/RSS/listings.
 */

const CACHE_TAGS: { tags: string[]; revalidate: number } = { tags: ["articles"], revalidate: 300 };

/** Hard visibility filter for every public query. A FUNCTION: `publishedAt`
 * must be compared against a FRESH clock per query — a module-level const
 * would freeze `new Date()` at server start and hide everything published
 * afterwards (verified by E2E). */
const PUBLISHED_FILTER = () => ({
  workflowStatus: "PUBLISHED" as WorkflowStatus,
  OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
});

export type PublicArticle = {
  translationId: string;
  articleId: string;
  locale: string;
  slug: string;
  title: string;
  h1: string | null;
  excerpt: string | null;
  blocks: Block[];
  seoTitle: string | null;
  metaDescription: string | null;
  readingMinutes: number | null;
  /** ISO strings (unstable_cache JSON-serializes values; Dates would decay to strings on cache hits) */
  publishedAt: string | null;
  updatedAt: string;
  verificationStatus: VerificationStatus | null;
  lastVerifiedAt: string | null;
  warningEnabled: boolean;
  noindex: boolean;
  categoryKey: string | null;
  categoryName: string | null;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    role: string | null;
    biography: string | null;
    expertise: string[];
  } | null;
  heroImage: {
    url: string;
    width: number | null;
    height: number | null;
    alt: string | null;
    credit: string | null;
    aiGenerated: boolean;
  } | null;
  faq: { question: string; answer: string }[];
  relatedLinks: { anchorText: string; url: string }[];
  translationGroup: { locale: string; slug: string; status: WorkflowStatus }[];
  blockAssets: Record<
    string,
    { url: string; width: number | null; height: number | null; alt: string; credit: string | null; aiGenerated: boolean }
  >;
};

const articleInclude = {
  article: {
    include: {
      category: { include: { translations: true } },
      author: { include: { photo: true, translations: true } },
      heroImage: { include: { translations: true } },
      translations: { select: { locale: true, slug: true, workflowStatus: true } },
    },
  },
  ogImage: { include: { translations: true } },
  faqGroup: { include: { items: { orderBy: { position: "asc" as const }, include: { translations: true } } } },
  outgoingLinks: {
    where: { targetArticleTranslationId: { not: null } },
    include: { target: { select: { locale: true, slug: true, workflowStatus: true } } },
    orderBy: { position: "asc" as const },
  },
} as const;

type RawTranslation = NonNullable<
  Awaited<ReturnType<typeof prisma.articleTranslation.findFirst<{ include: typeof articleInclude }>>>
>;

async function mapPublic(t: RawTranslation): Promise<PublicArticle> {
  const authorTr =
    t.article.author.translations.find((x) => x.locale === t.locale) ??
    t.article.author.translations.find((x) => x.locale === "en");
  const catTr = t.article.category?.translations.find((x) => x.locale === t.locale);
  const faq =
    t.faqGroup?.items
      .map((item) => {
        const tr = item.translations.find((x) => x.locale === t.locale);
        return tr ? { question: tr.question, answer: tr.answer } : null;
      })
      .filter((x): x is { question: string; answer: string } => x !== null) ?? [];

  // Resolve image-block asset references (URLs, dimensions, localized alt)
  const imageAssetIds = (Array.isArray(t.blocks) ? (t.blocks as { type?: string; assetId?: string }[]) : [])
    .filter((b) => b.type === "image" && b.assetId)
    .map((b) => b.assetId!) as string[];
  const blockAssets: PublicArticle["blockAssets"] = {};
  if (imageAssetIds.length > 0) {
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: imageAssetIds } },
      include: { translations: true },
    });
    for (const a of assets) {
      blockAssets[a.id] = {
        url: a.url,
        width: a.width,
        height: a.height,
        alt: a.translations.find((x) => x.locale === t.locale)?.alt ?? a.translations.find((x) => x.locale === "en")?.alt ?? "",
        credit: a.credit,
        aiGenerated: a.aiGenerated,
      };
    }
  }

  return {
    translationId: t.id,
    articleId: t.articleId,
    locale: t.locale,
    slug: t.slug,
    title: t.title,
    h1: t.h1,
    excerpt: t.excerpt,
    blocks: parseBlocks(t.blocks),
    seoTitle: t.seoTitle,
    metaDescription: t.metaDescription,
    readingMinutes: t.readingMinutes,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    updatedAt: t.updatedAt.toISOString(),
    verificationStatus: t.verificationStatus,
    lastVerifiedAt: t.lastVerifiedAt?.toISOString() ?? null,
    warningEnabled: t.warningEnabled,
    noindex: t.noindex,
    categoryKey: t.article.category?.key ?? null,
    categoryName: catTr?.name ?? null,
    author: t.article.author
      ? {
          id: t.article.author.id,
          name: t.article.author.name,
          slug: t.article.author.slug,
          avatarUrl: t.article.author.photo?.url ?? null,
          role: authorTr?.role ?? null,
          biography: authorTr?.biography ?? null,
          expertise: authorTr?.expertise ?? [],
        }
      : null,
    heroImage: t.article.heroImage
      ? {
          url: t.article.heroImage.url,
          width: t.article.heroImage.width,
          height: t.article.heroImage.height,
          alt:
            t.article.heroImage.translations.find((x) => x.locale === t.locale)?.alt ??
            t.article.heroImage.translations.find((x) => x.locale === "en")?.alt ??
            "",
          credit: t.article.heroImage.credit,
          aiGenerated: t.article.heroImage.aiGenerated,
        }
      : null,
    faq,
    relatedLinks: t.outgoingLinks
      .filter((l) => l.target && l.target.workflowStatus === "PUBLISHED")
      .map((l) => ({ anchorText: l.anchorText, url: `/${l.target!.locale}/guides/${l.target!.slug}/` })),
    translationGroup: t.article.translations.map((x) => ({
      locale: x.locale,
      slug: x.slug,
      status: x.workflowStatus,
    })),
    blockAssets,
  };
}

/** One translation regardless of status — PREVIEW ONLY (spec §10).
 * Callers must enforce authorization; never used by public pages. */
export async function getTranslationForPreview(translationId: string): Promise<PublicArticle | null> {
  const t = await prisma.articleTranslation.findUnique({
    where: { id: translationId },
    include: articleInclude,
  });
  return t ? await mapPublic(t) : null;
}

/** Build-time enumeration of published, indexable translations. */
export async function publishedSlugs(): Promise<{ locale: string; slug: string }[]> {
  const rows = await prisma.articleTranslation.findMany({
    where: { ...PUBLISHED_FILTER(), noindex: false },
    select: { locale: true, slug: true },
  });
  return rows;
}

/** One published translation by locale+slug (article page). */
export const getPublishedArticle = (locale: string, slug: string) =>
  unstable_cache(
    async (): Promise<PublicArticle | null> => {
      const t = await prisma.articleTranslation.findFirst({
        where: { locale, slug, ...PUBLISHED_FILTER() },
        include: articleInclude,
      });
      return t ? await mapPublic(t) : null;
    },
    ["public-article", locale, slug],
    CACHE_TAGS
  )();

/** Latest published translations for listings (home / hubs). */
export const listPublishedArticles = (locale: string, opts?: { limit?: number; categoryKey?: string; categoryPrefix?: string }) =>
  unstable_cache(
    async (): Promise<PublicArticle[]> => {
      const rows = await prisma.articleTranslation.findMany({
        where: {
          locale,
          ...PUBLISHED_FILTER(),
          ...(opts?.categoryKey ? { article: { category: { key: opts.categoryKey } } } : {}),
          ...(opts?.categoryPrefix ? { article: { category: { key: { startsWith: opts.categoryPrefix } } } } : {}),
        },
        include: articleInclude,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: opts?.limit ?? 12,
      });
      return Promise.all(rows.map(mapPublic));
    },
    ["public-list", locale, opts?.limit?.toString() ?? "12", opts?.categoryKey ?? "all", opts?.categoryPrefix ?? "-"],
    CACHE_TAGS
  )();

/** All published, indexable translations (sitemap), grouped per article for hreflang. */
export const publishedForSitemap = () =>
  unstable_cache(
    async () => {
      const rows = await prisma.articleTranslation.findMany({
        where: { ...PUBLISHED_FILTER(), noindex: false },
        select: { articleId: true, locale: true, slug: true, updatedAt: true },
      });
      const byArticle = new Map<string, { articleId: string; translations: { locale: string; slug: string; updatedAt: Date }[] }>();
      for (const r of rows) {
        let g = byArticle.get(r.articleId);
        if (!g) {
          g = { articleId: r.articleId, translations: [] };
          byArticle.set(r.articleId, g);
        }
        g.translations.push({ locale: r.locale, slug: r.slug, updatedAt: r.updatedAt });
      }
      return [...byArticle.values()];
    },
    ["sitemap-articles"],
    CACHE_TAGS
  )();

/** Published translations for one locale (RSS), newest first. */
export const publishedForRss = (locale: string, limit = 30) =>
  unstable_cache(
    async () => {
      const rows = await prisma.articleTranslation.findMany({
        where: { locale, ...PUBLISHED_FILTER(), noindex: false },
        select: {
          slug: true, title: true, excerpt: true, publishedAt: true, updatedAt: true,
          article: { select: { author: { select: { name: true } } } },
        },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: limit,
      });
      return rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        authorName: r.article.author?.name ?? null,
      }));
    },
    ["rss-articles", locale, String(limit)],
    CACHE_TAGS
  )();

/** Published translations by author slug (public author page). */
export const publishedByAuthor = (locale: string, authorSlug: string) =>
  unstable_cache(
    async () => {
      const author = await prisma.author.findFirst({
        where: { slug: authorSlug, isActive: true },
        include: { photo: true, translations: true },
      });
      if (!author) return null;
      const articles = await prisma.articleTranslation.findMany({
        where: { locale, ...PUBLISHED_FILTER(), article: { authorId: author.id } },
        select: { slug: true, title: true, excerpt: true, publishedAt: true, updatedAt: true },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      });
      return { author, articles };
    },
    ["author-page", locale, authorSlug],
    CACHE_TAGS
  )();
