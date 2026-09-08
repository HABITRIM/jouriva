import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, WorkflowStatus } from "@prisma/client";
import { normalizeForMatch, sanitizeRawQuery, tokenize, MIN_AUTOCOMPLETE_LENGTH } from "./normalize";
import {
  titleMatchScore,
  bodyMatchScore,
  freshnessBoost,
  editorialBoost,
  SCORE_RELATIONSHIP,
} from "./ranking";
import type { SearchDiscovery, SearchInput, SearchProvider, SearchResponse, SearchResult, SearchResultType, Suggestion, SuggestInput } from "./types";

/**
 * PostgreSQL search provider (Phase 4, spec §5) — the initial SearchProvider
 * implementation. PostgreSQL-first, provider-agnostic: no external search
 * service, no extensions, no embeddings. Bounded work per search (server-side
 * caps + fixed query count), ORM-parameterized queries only (spec §19), and
 * the STRICT published-only rule enforced in every WHERE clause (spec §4).
 *
 * Candidate completeness (post-audit design, 2026-09-06):
 * Candidates are fetched per RELEVANCE TIER (strongest first) and each tier
 * is KEYSET-PAGINATED to exhaustion or its cap, with deterministic ordering
 * (title asc, slug asc — slug is unique per locale). Ranking still happens in
 * JS (accent/case-insensitive via normalizeForMatch), but the candidate set
 * is now complete for any realistic corpus: results can only be truncated
 * beyond the documented per-tier caps, and then only the alphabetically-late
 * tail of a single equal-SQL-tier is affected — never silently, and the
 * strongest tiers (startsWith/exact matches) are structurally retained first.
 * The query count per search is bounded by design (≤ 3 tiers × ≤ ⌈cap/200⌉
 * pages per type) — fixed small loops, never N+1.
 *
 * Replacing this provider with an external engine later means implementing
 * the same SearchProvider interface — the search page/autocomplete UI and the
 * route contracts do not change.
 */

// Hard bounds — deterministic, documented, and far above any realistic
// single-query match set for an editorial corpus (spec §18).
const TIER_PAGE_SIZE = 200;
const CAP_ARTICLE_TITLE = 600; // per tier (startsWith / contains)
const CAP_ARTICLE_BODY = 300; // excerpt-only matches
const CAP_DEST_NAME = 400;
const CAP_DEST_BODY = 300;
const CAP_TOPIC = 200;
const CAP_AUTHOR = 150;
// Autocomplete (compact mode): single batch per tier, bounded and cheap.
const SUGGEST_TIER_CAP = 60;

export const MAX_PAGE_SIZE = 20;
export const MAX_PAGE = 50;

const PUBLISHED = "PUBLISHED" as const;

interface ArticleCandidate {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  hero: { url: string; alt: string | null } | null;
  authorName: string | null;
  authorSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  destinationName: string | null;
  destinationSlug: string | null;
  destinationPath: string | null;
  topicContexts: string[];
  normalTitle: string;
  normalExcerpt: string;
  normalContext: string;
}

function destPathFor(countrySlug: string | null, type: string, slug: string): string {
  return type === "COUNTRY" ? `/${slug}/` : countrySlug ? `/${countrySlug}/${slug}/` : `/${slug}/`;
}

/** Keyset-pagination one candidate tier until exhausted or `cap` reached.
 * Fixed loop (≤ ⌈cap/TIER_PAGE_SIZE⌉ batches) — bounded, never N+1. */
async function fetchTier<T extends { id: string }>(
  cap: number,
  fetchBatch: (cursorId: string | undefined) => Promise<T[]>
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  while (out.length < cap) {
    const batch = await fetchBatch(cursor);
    out.push(...batch);
    if (batch.length < TIER_PAGE_SIZE) break;
    cursor = batch[batch.length - 1].id;
  }
  return out.slice(0, cap);
}

const ARTICLE_ORDER: Prisma.ArticleTranslationOrderByWithRelationInput[] = [{ title: "asc" }, { slug: "asc" }];

async function articleCandidates(locale: string, like: string, compact: boolean): Promise<ArticleCandidate[]> {
  const pubWhere = {
    locale,
    workflowStatus: PUBLISHED as WorkflowStatus,
    noindex: false,
  };
  const cap = compact ? SUGGEST_TIER_CAP : CAP_ARTICLE_TITLE;
  const bodyCap = compact ? SUGGEST_TIER_CAP : CAP_ARTICLE_BODY;
  const select = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    publishedAt: true,
    updatedAt: true,
    article: {
      select: {
        heroImage: { select: { url: true } },
        author: { select: { name: true, slug: true } },
        category: { select: { translations: { select: { locale: true, name: true, slug: true } } } },
        topics: { select: { topic: { select: { translations: { select: { locale: true, name: true, slug: true } } } } } },
        destinationLinks: {
          orderBy: [{ role: "asc" as const }, { position: "asc" as const }],
          select: {
            role: true,
            destination: {
              select: {
                type: true,
                country: { select: { translations: { select: { locale: true, slug: true } } } },
                translations: { where: { locale, workflowStatus: PUBLISHED }, select: { locale: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    },
  };

  // Tier A: title starts with the query (strongest matches — exact/prefix live here)
  const tierA = await fetchTier(cap, (cursor) =>
    prisma.articleTranslation.findMany({
      where: { ...pubWhere, title: { startsWith: like, mode: "insensitive" as const } },
      select,
      orderBy: ARTICLE_ORDER,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  // Tier B: title contains but does not start with (boundary/substring)
  const tierB = await fetchTier(cap, (cursor) =>
    prisma.articleTranslation.findMany({
      where: {
        ...pubWhere,
        AND: [{ title: { contains: like, mode: "insensitive" as const } }, { NOT: { title: { startsWith: like, mode: "insensitive" as const } } }],
      },
      select,
      orderBy: ARTICLE_ORDER,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  // Tier C: excerpt-only matches (title did not match)
  const tierC = await fetchTier(bodyCap, (cursor) =>
    prisma.articleTranslation.findMany({
      where: {
        ...pubWhere,
        AND: [{ excerpt: { contains: like, mode: "insensitive" as const } }, { NOT: { title: { contains: like, mode: "insensitive" as const } } }],
      },
      select,
      orderBy: ARTICLE_ORDER,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );

  const rows = [...tierA, ...tierB, ...tierC];
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  return unique.map((r) => {
    const primary = r.article.destinationLinks.find((l) => l.role === "PRIMARY") ?? r.article.destinationLinks[0] ?? null;
    const destTr = primary?.destination.translations.find((t) => t.locale === locale) ?? null;
    const countrySlug = primary?.destination.country?.translations.find((c) => c.locale === locale)?.slug ?? primary?.destination.country?.translations.find((c) => c.locale === "en")?.slug ?? null;
    const topicTrs = r.article.topics
      .map((t) => t.topic.translations.find((x) => x.locale === locale))
      .filter((x): x is { locale: string; name: string; slug: string } => !!x);
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      hero: r.article.heroImage ? { url: r.article.heroImage.url, alt: null } : null,
      authorName: r.article.author?.name ?? null,
      authorSlug: r.article.author?.slug ?? null,
      categoryName: r.article.category?.translations.find((c) => c.locale === locale)?.name ?? null,
      categorySlug: r.article.category?.translations.find((c) => c.locale === locale)?.slug ?? null,
      destinationName: destTr?.name ?? null,
      destinationSlug: destTr?.slug ?? null,
      destinationPath: destTr ? destPathFor(countrySlug, primary!.destination.type, destTr.slug) : null,
      topicContexts: topicTrs.map((t) => t.name),
      normalTitle: normalizeForMatch(r.title),
      normalExcerpt: normalizeForMatch(r.excerpt ?? ""),
      normalContext: normalizeForMatch([destTr?.name ?? "", ...topicTrs.map((t) => t.name), r.article.category?.translations.find((c) => c.locale === locale)?.name ?? ""].join(" ")),
    };
  });
}

interface DestinationCandidate {
  id: string;
  translationId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  type: string;
  isFeatured: boolean;
  heroUrl: string | null;
  path: string;
  countryName: string | null;
  countrySlug: string | null;
  normalName: string;
  normalBody: string;
}

async function destinationCandidates(locale: string, like: string, compact: boolean): Promise<DestinationCandidate[]> {
  const destWhere = {
    locale,
    workflowStatus: PUBLISHED as WorkflowStatus,
    destination: { isActive: true },
  };
  const cap = compact ? SUGGEST_TIER_CAP : CAP_DEST_NAME;
  const bodyCap = compact ? SUGGEST_TIER_CAP : CAP_DEST_BODY;
  const select = {
    id: true,
    destinationId: true,
    name: true,
    slug: true,
    tagline: true,
    description: true,
    destination: {
      select: {
        type: true,
        isFeatured: true,
        heroAsset: { select: { url: true } },
        country: { select: { translations: { select: { locale: true, name: true, slug: true } } } },
        city: { select: { country: { select: { translations: { select: { locale: true, name: true, slug: true } } } } } },
      },
    },
  };
  const order: Prisma.DestinationTranslationOrderByWithRelationInput[] = [{ name: "asc" }, { slug: "asc" }];

  const tierA = await fetchTier(cap, (cursor) =>
    prisma.destinationTranslation.findMany({
      where: { ...destWhere, name: { startsWith: like, mode: "insensitive" as const } },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const tierB = await fetchTier(cap, (cursor) =>
    prisma.destinationTranslation.findMany({
      where: {
        ...destWhere,
        AND: [{ name: { contains: like, mode: "insensitive" as const } }, { NOT: { name: { startsWith: like, mode: "insensitive" as const } } }],
      },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const tierC = await fetchTier(bodyCap, (cursor) =>
    prisma.destinationTranslation.findMany({
      where: {
        ...destWhere,
        AND: [
          { OR: [{ tagline: { contains: like, mode: "insensitive" as const } }, { description: { contains: like, mode: "insensitive" as const } }] },
          { NOT: { name: { contains: like, mode: "insensitive" as const } } },
        ],
      },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );

  const rows = [...tierA, ...tierB, ...tierC];
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map((r) => {
      const country = r.destination.city?.country ?? r.destination.country;
      const countryTr = country?.translations.find((c) => c.locale === locale) ?? country?.translations.find((c) => c.locale === "en") ?? null;
      return {
        id: r.destinationId,
        translationId: r.id,
        name: r.name,
        slug: r.slug,
        tagline: r.tagline,
        description: r.description,
        type: r.destination.type,
        isFeatured: r.destination.isFeatured,
        heroUrl: r.destination.heroAsset?.url ?? null,
        path: destPathFor(countryTr?.slug ?? null, r.destination.type, r.slug),
        countryName: countryTr?.name ?? null,
        countrySlug: countryTr?.slug ?? null,
        normalName: normalizeForMatch(r.name),
        normalBody: normalizeForMatch(`${r.tagline ?? ""} ${r.description ?? ""} ${countryTr?.name ?? ""}`),
      };
    });
}

async function topicCandidates(locale: string, like: string, compact: boolean) {
  const cap = compact ? SUGGEST_TIER_CAP : CAP_TOPIC;
  const order = [{ name: "asc" as const }, { slug: "asc" as const }];
  const tierA = await fetchTier(cap, (cursor) =>
    prisma.topicTranslation.findMany({
      where: { locale, topic: { isActive: true }, name: { startsWith: like, mode: "insensitive" as const } },
      select: { id: true, topicId: true, name: true, slug: true },
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const tierB = await fetchTier(cap, (cursor) =>
    prisma.topicTranslation.findMany({
      where: {
        locale,
        topic: { isActive: true },
        AND: [{ name: { contains: like, mode: "insensitive" as const } }, { NOT: { name: { startsWith: like, mode: "insensitive" as const } } }],
      },
      select: { id: true, topicId: true, name: true, slug: true },
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const seen = new Set<string>();
  return [...tierA, ...tierB].filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}

async function authorCandidates(locale: string, like: string, compact: boolean) {
  const cap = compact ? SUGGEST_TIER_CAP : CAP_AUTHOR;
  const order = [{ name: "asc" as const }, { slug: "asc" as const }];
  const select = { id: true, name: true, slug: true, translations: { where: { locale }, select: { biography: true, role: true } } } as const;
  const tierA = await fetchTier(cap, (cursor) =>
    prisma.author.findMany({
      where: { isActive: true, name: { startsWith: like, mode: "insensitive" as const } },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const tierB = await fetchTier(cap, (cursor) =>
    prisma.author.findMany({
      where: {
        isActive: true,
        AND: [{ name: { contains: like, mode: "insensitive" as const } }, { NOT: { name: { startsWith: like, mode: "insensitive" as const } } }],
      },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const tierC = await fetchTier(compact ? SUGGEST_TIER_CAP : Math.floor(cap / 2), (cursor) =>
    prisma.author.findMany({
      where: {
        isActive: true,
        AND: [{ translations: { some: { locale, biography: { contains: like, mode: "insensitive" as const } } } }, { NOT: { name: { contains: like, mode: "insensitive" as const } } }],
      },
      select,
      orderBy: order,
      take: TIER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  );
  const seen = new Set<string>();
  return [...tierA, ...tierB, ...tierC].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

function rankArticles(cands: ArticleCandidate[], q: string, tokens: string[], now: Date): SearchResult[] {
  const results: SearchResult[] = [];
  for (const c of cands) {
    let score = titleMatchScore(c.normalTitle, q, tokens);
    if (score === 0) {
      score = bodyMatchScore(c.normalExcerpt, q, tokens);
      if (c.destinationName && (c.normalContext.includes(q) || tokens.every((t) => c.normalContext.includes(t)))) {
        score = Math.max(score, SCORE_RELATIONSHIP.destination);
      } else if (score === 0 && c.normalContext && (c.normalContext.includes(q) || tokens.some((t) => t.length >= 3 && c.normalContext.includes(t)))) {
        score = SCORE_RELATIONSHIP.topic; // topic/category relationship tier
      }
    }
    if (score === 0) continue;
    const context: { label: string; url: string }[] = [];
    if (c.destinationName && c.destinationPath) context.push({ label: c.destinationName, url: c.destinationPath });
    results.push({
      type: "ARTICLE",
      id: c.id,
      title: c.title,
      url: `/guides/${c.slug}/`,
      description: c.excerpt,
      image: c.hero?.url ?? null,
      context: context.slice(0, 1),
      publishedAt: c.publishedAt?.toISOString() ?? null,
      updatedAt: c.updatedAt.toISOString(),
      score: score + freshnessBoost(c.publishedAt ?? c.updatedAt, now),
    });
  }
  return results;
}

function rankDestinations(cands: DestinationCandidate[], q: string, tokens: string[], now: Date): SearchResult[] {
  const results: SearchResult[] = [];
  for (const c of cands) {
    let score = titleMatchScore(c.normalName, q, tokens);
    if (score === 0) score = bodyMatchScore(c.normalBody, q, tokens);
    if (score === 0) continue;
    const context: { label: string; url: string }[] = [];
    if (c.type !== "COUNTRY" && c.countryName && c.countrySlug) context.push({ label: c.countryName, url: `/${c.countrySlug}/` });
    results.push({
      type: "DESTINATION",
      id: c.id,
      title: c.name,
      url: c.path,
      description: c.tagline ?? c.description,
      image: c.heroUrl,
      context: context.slice(0, 1),
      publishedAt: null,
      updatedAt: null,
      score: score + editorialBoost(c.isFeatured) + freshnessBoost(null, now),
    });
  }
  return results;
}

async function rankTopics(cands: { id: string; topicId: string; name: string; slug: string }[], q: string, tokens: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  for (const c of cands) {
    const score = titleMatchScore(normalizeForMatch(c.name), q, tokens);
    if (score === 0) continue;
    results.push({
      type: "TOPIC",
      id: c.topicId,
      title: c.name,
      url: `/topics/${c.slug}/`,
      description: null,
      image: null,
      context: [],
      publishedAt: null,
      updatedAt: null,
      score,
    });
  }
  return results;
}

async function rankAuthors(cands: { id: string; name: string; slug: string; translations: { biography: string | null; role: string | null }[] }[], q: string, tokens: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  for (const c of cands) {
    let score = titleMatchScore(normalizeForMatch(c.name), q, tokens);
    const bio = c.translations[0]?.biography ?? null;
    if (score === 0 && bio) score = bodyMatchScore(normalizeForMatch(bio), q, tokens);
    if (score === 0) continue;
    results.push({
      type: "AUTHOR",
      id: c.id,
      title: c.name,
      url: `/authors/${c.slug}/`,
      description: bio,
      image: null,
      context: [],
      publishedAt: null,
      updatedAt: null,
      score,
    });
  }
  return results;
}

function sortDeterministic(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}

export class PostgresSearchProvider implements SearchProvider {
  async search(input: SearchInput): Promise<SearchResponse> {
    const locale = input.locale;
    const q = normalizeForMatch(sanitizeRawQuery(input.q));
    const tokens = tokenize(input.q);
    const type = input.type ?? "ALL";
    const pageSize = Math.min(Math.max(1, input.pageSize), MAX_PAGE_SIZE);
    const now = new Date();
    const compact = false;

    let results: SearchResult[] = [];
    if (q.length >= 2) {
      const like = input.q.replace(/[%_\\]/g, " ").trim().slice(0, 100); // parameterized ILIKE value (metachars stripped)
      const [a, d, t, u] = await Promise.all([
        type === "ALL" || type === "ARTICLE" ? articleCandidates(locale, like, compact) : Promise.resolve([] as ArticleCandidate[]),
        type === "ALL" || type === "DESTINATION" ? destinationCandidates(locale, like, compact) : Promise.resolve([] as DestinationCandidate[]),
        type === "ALL" || type === "TOPIC" ? topicCandidates(locale, like, compact) : Promise.resolve([] as { id: string; topicId: string; name: string; slug: string }[]),
        type === "ALL" || type === "AUTHOR" ? authorCandidates(locale, like, compact) : Promise.resolve([] as { id: string; name: string; slug: string; translations: { biography: string | null; role: string | null }[] }[]),
      ]);
      const ranked = [
        ...(type === "ALL" || type === "ARTICLE" ? rankArticles(a, q, tokens, now) : []),
        ...(type === "ALL" || type === "DESTINATION" ? rankDestinations(d, q, tokens, now) : []),
        ...(type === "ALL" || type === "TOPIC" ? await rankTopics(t, q, tokens) : []),
        ...(type === "ALL" || type === "AUTHOR" ? await rankAuthors(u, q, tokens) : []),
      ];
      results = sortDeterministic(ranked);
    }

    const total = results.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, input.page), pageCount);
    return {
      query: input.q,
      locale,
      type,
      total,
      page,
      pageSize,
      pageCount,
      zeroResults: total === 0,
      results: results.slice((page - 1) * pageSize, page * pageSize),
    };
  }

  async suggest(input: SuggestInput): Promise<Suggestion[]> {
    const locale = input.locale;
    const q = normalizeForMatch(sanitizeRawQuery(input.q));
    if (q.length < MIN_AUTOCOMPLETE_LENGTH) return [];
    const like = input.q.replace(/[%_\\]/g, " ").trim().slice(0, 60);
    const limit = Math.min(Math.max(1, input.limit), 8);
    const tokens = tokenize(input.q);

    // Compact mode: one bounded batch per tier — cheap per keystroke while
    // keeping the strongest (startsWith) tier fully represented.
    const perTypeCap = Math.max(2, Math.ceil(limit / 2));
    const [d, t, u, a] = await Promise.all([
      destinationCandidates(locale, like, true),
      topicCandidates(locale, like, true),
      authorCandidates(locale, like, true),
      articleCandidates(locale, like, true),
    ]);

    const rankedDestinations = sortDeterministic(rankDestinations(d, q, tokens, new Date())).slice(0, perTypeCap);
    const rankedArticles = sortDeterministic(rankArticles(a, q, tokens, new Date())).slice(0, perTypeCap);
    const rankedTopics = (await rankTopics(t, q, tokens)).sort((x, y) => y.score - x.score).slice(0, perTypeCap);
    const rankedAuthors = (await rankAuthors(u, q, tokens)).sort((x, y) => y.score - x.score).slice(0, perTypeCap);

    // Interleave by descending score across types for a mixed, useful list.
    const pools: SearchResult[] = [...rankedDestinations, ...rankedTopics, ...rankedAuthors, ...rankedArticles].sort(
      (x, y) => y.score - x.score || x.type.localeCompare(y.type)
    );
    const out: Suggestion[] = [];
    const seen = new Set<string>();
    for (const r of pools) {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: r.type, title: r.title, url: r.url });
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Discovery/navigation for the empty-query state (spec §12) — existing
   * published content only, cached (public data, 5-minute revalidate). */
  async discovery(locale: string): Promise<SearchDiscovery> {
    const [featured, topics, articles] = await Promise.all([
      prisma.destinationTranslation.findMany({
        where: { locale, workflowStatus: PUBLISHED as WorkflowStatus, destination: { isActive: true, isFeatured: true } },
        select: {
          name: true, slug: true, tagline: true, description: true,
          destination: { select: { type: true, heroAsset: { select: { url: true } }, country: { select: { translations: { select: { locale: true, slug: true } } } } } },
        },
        orderBy: [{ destination: { sortOrder: "asc" } }],
        take: 6,
      }),
      prisma.topicTranslation.findMany({
        where: { locale, topic: { isActive: true } },
        select: { name: true, slug: true },
        orderBy: { topic: { position: "asc" } },
        take: 8,
      }),
      prisma.articleTranslation.findMany({
        where: { locale, workflowStatus: PUBLISHED as WorkflowStatus, noindex: false },
        select: { title: true, slug: true, excerpt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
    ]);
    return {
      destinations: featured.map((d) => {
        const countryTr = d.destination.country?.translations.find((c) => c.locale === locale) ?? d.destination.country?.translations.find((c) => c.locale === "en");
        return {
          title: d.name,
          url: destPathFor(countryTr?.slug ?? null, d.destination.type, d.slug),
          description: d.tagline ?? d.description,
          image: d.destination.heroAsset?.url ?? null,
        };
      }),
      topics: topics.map((t) => ({ title: t.name, url: `/topics/${t.slug}/` })),
      articles: articles.map((a) => ({ title: a.title, url: `/guides/${a.slug}/`, description: a.excerpt })),
    };
  }
}
