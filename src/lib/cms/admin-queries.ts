import "server-only";
import { prisma } from "@/lib/prisma";
import { parseBlocks } from "@/lib/cms/blocks";
import type { WorkflowStatus, VerificationStatus, Role } from "@prisma/client";

/**
 * Admin (CMS) queries — uncached, always session-scoped by the actions layer.
 */

export type ArticleListItem = {
  articleId: string;
  translationId: string;
  locale: string;
  title: string;
  slug: string;
  status: WorkflowStatus;
  verificationStatus: VerificationStatus | null;
  lastVerifiedAt: Date | null;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  authorName: string;
  categoryName: string | null;
};

export type ArticleFilters = {
  locale?: string;
  status?: WorkflowStatus;
  authorId?: string;
  categoryId?: string;
  verification?: VerificationStatus;
  search?: string;
  needsVerification?: boolean;
};

export async function listArticles(filters: ArticleFilters = {}): Promise<ArticleListItem[]> {
  const rows = await prisma.articleTranslation.findMany({
    where: {
      ...(filters.locale ? { locale: filters.locale } : {}),
      ...(filters.status ? { workflowStatus: filters.status } : {}),
      ...(filters.verification ? { verificationStatus: filters.verification } : {}),
      ...(filters.authorId ? { article: { authorId: filters.authorId } } : {}),
      ...(filters.categoryId ? { article: { categoryId: filters.categoryId } } : {}),
      ...(filters.search
        ? { OR: [{ title: { contains: filters.search, mode: "insensitive" } }, { slug: { contains: filters.search, mode: "insensitive" } }] }
        : {}),
      ...(filters.needsVerification
        ? {
            OR: [
              { verificationStatus: "NEEDS_REVIEW" },
              { verificationStatus: "OUTDATED" },
              { verificationStatus: null, warningEnabled: true },
            ],
          }
        : {}),
    },
    include: {
      article: { include: { author: true, category: { include: { translations: { where: { locale: "en" } } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return rows.map((t) => ({
    articleId: t.articleId,
    translationId: t.id,
    locale: t.locale,
    title: t.title,
    slug: t.slug,
    status: t.workflowStatus,
    verificationStatus: t.verificationStatus,
    lastVerifiedAt: t.lastVerifiedAt,
    updatedAt: t.updatedAt,
    publishedAt: t.publishedAt,
    scheduledAt: t.scheduledAt,
    authorName: t.article.author.name,
    categoryName:
      t.article.category?.translations.find((c) => c.locale === t.locale)?.name ??
      t.article.category?.translations[0]?.name ??
      null,
  }));
}

export async function dashboardCounts() {
  const grouped = await prisma.articleTranslation.groupBy({
    by: ["workflowStatus"],
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.workflowStatus, g._count._all])) as Record<string, number>;
  const needsVerification = await prisma.articleTranslation.count({
    where: { OR: [{ verificationStatus: "NEEDS_REVIEW" }, { verificationStatus: "OUTDATED" }] },
  });
  return {
    DRAFT: counts.DRAFT ?? 0,
    IN_REVIEW: counts.IN_REVIEW ?? 0,
    FACT_CHECK: counts.FACT_CHECK ?? 0,
    SEO_REVIEW: counts.SEO_REVIEW ?? 0,
    APPROVED: counts.APPROVED ?? 0,
    SCHEDULED: counts.SCHEDULED ?? 0,
    PUBLISHED: counts.PUBLISHED ?? 0,
    ARCHIVED: counts.ARCHIVED ?? 0,
    needsVerification,
  };
}

export async function recentlyUpdated(limit = 8) {
  return prisma.articleTranslation.findMany({
    include: { article: { include: { author: true } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getArticleForEdit(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      author: true,
      category: { include: { translations: true } },
      heroImage: { include: { translations: true } },
      tags: { include: { tag: true } },
      destinationLinks: { orderBy: [{ role: "asc" }, { position: "asc" }] },
      topics: { select: { topicId: true } },
      translations: {
        include: {
          faqGroup: { include: { items: { orderBy: { position: "asc" }, include: { translations: true } } } },
          outgoingLinks: { include: { target: { select: { id: true, locale: true, slug: true, title: true, workflowStatus: true } } }, orderBy: { position: "asc" } },
        },
        orderBy: { locale: "asc" },
      },
    },
  });
  return article;
}

export type TranslationEdit = NonNullable<Awaited<ReturnType<typeof getArticleForEdit>>>["translations"][number];

export async function getCategories() {
  return prisma.category.findMany({
    include: { translations: true, parent: true },
    orderBy: { position: "asc" },
  });
}

export async function listAuthorsAdmin() {
  return prisma.author.findMany({
    include: {
      photo: true,
      translations: true,
      _count: { select: { articles: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getAuthorForEdit(id: string) {
  return prisma.author.findUnique({
    where: { id },
    include: { photo: true, translations: true, user: { select: { email: true, role: true } } },
  });
}

export type MediaFilters = { search?: string; archived?: boolean };

export async function listMedia(filters: MediaFilters = {}) {
  return prisma.mediaAsset.findMany({
    where: {
      ...(filters.archived === false || filters.archived === undefined ? { archived: false } : {}),
      ...(filters.search
        ? { OR: [{ filename: { contains: filters.search, mode: "insensitive" } }, { credit: { contains: filters.search, mode: "insensitive" } }] }
        : {}),
    },
    include: { translations: true, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getMediaForEdit(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id }, include: { translations: true, uploadedBy: { select: { name: true } } } });
}

export async function listRedirects() {
  return prisma.redirect.findMany({ include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, authorProfile: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listRevisions(translationId: string) {
  return prisma.articleRevision.findMany({
    where: { translationId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listTransitions(translationId: string) {
  return prisma.articleTransition.findMany({
    where: { translationId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Translation-group status overview (spec §5): EN/ES/AR statuses side by side. */
export async function translationGroupStatuses(articleId: string) {
  const rows = await prisma.articleTranslation.findMany({
    where: { articleId },
    select: { id: true, locale: true, slug: true, title: true, workflowStatus: true, updatedAt: true },
    orderBy: { locale: "asc" },
  });
  return rows;
}

export async function searchLinkTargets(query: string, locale: string) {
  return prisma.articleTranslation.findMany({
    where: {
      locale,
      workflowStatus: { in: ["PUBLISHED", "APPROVED", "SCHEDULED"] },
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, title: true, slug: true, locale: true, workflowStatus: true },
    take: 10,
    orderBy: { updatedAt: "desc" },
  });
}

export function roleLabel(role: Role): string {
  return role;
}

// ── Phase 3: destinations & taxonomy ─────────────────────────────────────────

export async function listDestinationsAdmin(opts?: { search?: string; type?: string }) {
  const rows = await prisma.destination.findMany({
    where: {
      ...(opts?.type ? { type: opts.type as "COUNTRY" } : {}),
      ...(opts?.search ? { translations: { some: { name: { contains: opts.search, mode: "insensitive" as const } } } } : {}),
    },
    include: {
      translations: { select: { locale: true, name: true, slug: true, workflowStatus: true, noindex: true } },
      country: { select: { iso2: true, translations: { select: { locale: true, name: true } } } },
      city: { select: { translations: { select: { locale: true, name: true } } } },
      _count: { select: { articleLinks: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
  return rows;
}

export async function getDestinationForEdit(id: string) {
  const destination = await prisma.destination.findUnique({
    where: { id },
    include: {
      country: { include: { translations: true } },
      city: { include: { translations: true, country: { include: { translations: true } } } },
      heroAsset: { include: { translations: true } },
      gallery: { orderBy: { position: "asc" }, include: { asset: { include: { translations: true } } } },
      translations: { include: { faqGroup: { include: { items: { orderBy: { position: "asc" }, include: { translations: true } } } } } },
      articleLinks: { orderBy: [{ role: "asc" }, { position: "asc" }], include: { article: { include: { translations: { select: { locale: true, title: true, slug: true, workflowStatus: true } } } } } },
      topics: { select: { topicId: true } },
    },
  });
  if (!destination) return null;
  // Curated related-destination links are owned per-translation (plain scalar owner).
  const curated = await prisma.contentLink.findMany({
    where: { ownerDestinationTranslationId: { in: destination.translations.map((t) => t.id) }, targetDestinationId: { not: null } },
    orderBy: { position: "asc" },
    select: { ownerDestinationTranslationId: true, targetDestinationId: true },
  });
  return { ...destination, curatedByTranslationId: curated };
}

export type DestinationEdit = NonNullable<Awaited<ReturnType<typeof getDestinationForEdit>>>;

/** Anchor pickers: country records + city records. */
export async function listCountryRecords() {
  return prisma.country.findMany({
    include: { translations: true },
    orderBy: { iso2: "asc" },
  });
}

export async function listCityRecords() {
  return prisma.city.findMany({
    include: { translations: true, country: { include: { translations: true } } },
    orderBy: { id: "asc" },
    take: 200,
  });
}

/** Destination pickers for the article editor + destination editor. */
export async function listDestinationOptions(locale: string) {
  const rows = await prisma.destinationTranslation.findMany({
    where: { workflowStatus: { in: ["PUBLISHED", "DRAFT"] }, ...(locale ? { OR: [{ locale }, { locale: "en" }] } : {}) },
    select: { destinationId: true, locale: true, name: true, slug: true, workflowStatus: true, destination: { select: { type: true } } },
    orderBy: { name: "asc" },
    take: 300,
  });
  const byDest = new Map<string, { id: string; name: string; type: string; status: string }>();
  for (const r of rows) {
    const prev = byDest.get(r.destinationId);
    if (!prev || (r.locale === locale && prev.name !== r.name)) {
      byDest.set(r.destinationId, { id: r.destinationId, name: r.name, type: r.destination.type, status: r.workflowStatus });
    }
  }
  return [...byDest.values()];
}

export async function listTopicsAdmin() {
  return prisma.topic.findMany({
    orderBy: [{ position: "asc" }, { key: "asc" }],
    include: { translations: true, _count: { select: { articles: true, destinations: true } } },
  });
}

export async function listCategoryTreeAdmin() {
  const rows = await prisma.category.findMany({
    include: { translations: true, _count: { select: { articles: true, children: true } } },
    orderBy: [{ position: "asc" }, { key: "asc" }],
  });
  return rows;
}
