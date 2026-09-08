import "server-only";
import { prisma } from "@/lib/prisma";
import { SLUG_RE, validateBlocks, readingMinutes, type Block } from "@/lib/cms/blocks";
import { assertTransition, type WorkflowAction } from "@/lib/cms/workflow";
import type { SessionUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/auth";
import { ValidationError } from "@/lib/cms/errors";
import { Prisma } from "@prisma/client";

const asJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;
import { revalidateArticlePublicPaths } from "@/lib/cms/revalidate";
import { ensureRedirectForSlugChange } from "@/lib/cms/redirects";
import { z } from "zod";

/**
 * Article services (Phase 2). All mutations are called from server actions
 * AFTER authorization; this layer enforces data validity, workflow rules,
 * revision snapshots, slug-redirect creation and public revalidation.
 */

export const translationInputSchema = z.object({
  articleId: z.string().optional(), // empty on create (createArticleWithTranslation); required for saveTranslation
  locale: z.enum(["en", "es", "ar"]),
  title: z.string().min(3).max(200),
  slug: z.string().max(200).regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and hyphens"),
  h1: z.string().max(200).optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  blocks: z.array(z.unknown()).min(1, "An article needs content"),
  seoTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
  canonicalOverride: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Canonical must be a path or absolute URL"),
  noindex: z.boolean().optional().nullable(),
  faq: z.array(z.object({ question: z.string().min(3).max(300), answer: z.string().min(3).max(2000) })).max(20),
  links: z.array(z.object({ anchorText: z.string().min(2).max(200), targetTranslationId: z.string().min(1) })).max(30),
  verification: z.object({
    status: z.enum(["VERIFIED", "NEEDS_REVIEW", "OUTDATED", "ARCHIVED"]).nullable(),
    lastVerifiedAt: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    warningEnabled: z.boolean().optional().nullable(),
  }),
  categoryId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  heroImageId: z.string().optional().nullable(),
});

export const baseInputSchema = z.object({
  articleId: z.string().optional(), // empty on create
  categoryId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  heroImageId: z.string().optional().nullable(),
});

export type TranslationInput = z.infer<typeof translationInputSchema>;

/** Creates a base article + first translation in one flow. */
export async function createArticleWithTranslation(
  user: SessionUser,
  input: TranslationInput & { categoryId?: string | null; authorId?: string | null; heroImageId?: string | null }
): Promise<{ articleId: string; translationId: string }> {
  if (!input.authorId) throw new ValidationError("An author is required");
  await assertSlugFree(input.locale, input.slug);

  const blocks = checkBlocks(input.blocks);
  const article = await prisma.article.create({
    data: {
      categoryId: input.categoryId || null,
      authorId: input.authorId,
      heroImageId: input.heroImageId || null,
      updatedById: user.authorProfileId ?? null,
      translations: {
        create: {
          locale: input.locale,
          title: input.title,
          slug: input.slug,
          h1: input.h1 ?? null,
          excerpt: input.excerpt ?? null,
          blocks,
          seoTitle: input.seoTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          canonicalOverride: input.canonicalOverride ?? null,
          noindex: input.noindex ?? false,
          readingMinutes: readingMinutes(blocks),
          verificationStatus: input.verification.status,
          lastVerifiedAt: parseDate(input.verification.lastVerifiedAt),
          verificationNotes: input.verification.notes ?? null,
          warningEnabled: input.verification.warningEnabled ?? false,
        },
      },
    },
    include: { translations: true },
  });
  const t = article.translations[0];
  await saveFaq(t.id, input.locale, input.faq);
  await saveLinks(t.id, user, input.links);
  await prisma.articleRevision.create({
    data: { translationId: t.id, status: "DRAFT", snapshot: asJson(await snapshotOf(t.id)), note: "Created", createdById: user.id },
  });
  return { articleId: article.id, translationId: t.id };
}

/** Saves translation content/SEO/verification. Snapshots a revision first,
 * records editor, and — for published/scheduled content — keeps a 301
 * redirect alive when the slug changes. */
export async function saveTranslation(user: SessionUser, input: TranslationInput): Promise<{ slugChanged: boolean; redirectCreated: boolean }> {
  if (!input.articleId) throw new ValidationError("Missing article reference");
  const existing = await prisma.articleTranslation.findUnique({
    where: { articleId_locale: { articleId: input.articleId, locale: input.locale } },
    include: { article: true },
  });
  if (!existing) throw new ValidationError("Translation does not exist — create it first");

  // Ownership rule: AUTHORS may only edit their own articles (spec §21)
  if (user.role === "AUTHOR" && existing.article.authorId !== user.authorProfileId) {
    throw new AuthorizationError("Authors may only edit their own articles");
  }

  await assertSlugFree(input.locale, input.slug, existing.id);
  const blocks = checkBlocks(input.blocks);

  // Revision snapshot BEFORE the change (recoverable history)
  await prisma.articleRevision.create({
    data: { translationId: existing.id, status: existing.workflowStatus, snapshot: asJson(await snapshotOf(existing.id)), note: "Autosave before edit", createdById: user.id },
  });

  const slugChanged = existing.slug !== input.slug;
  const wasLive = existing.workflowStatus === "PUBLISHED" || existing.workflowStatus === "SCHEDULED";

  await prisma.articleTranslation.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      slug: input.slug,
      h1: input.h1 ?? null,
      excerpt: input.excerpt ?? null,
      blocks,
      readingMinutes: readingMinutes(blocks),
      seoTitle: input.seoTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      canonicalOverride: input.canonicalOverride ?? null,
      noindex: input.noindex ?? false,
      verificationStatus: input.verification.status,
      lastVerifiedAt: parseDate(input.verification.lastVerifiedAt),
      verificationNotes: input.verification.notes ?? null,
      warningEnabled: input.verification.warningEnabled ?? false,
      updatedAt: new Date(),
    },
  });
  await prisma.article.update({
    where: { id: existing.articleId },
    data: {
      heroImageId: input.heroImageId ?? existing.article.heroImageId,
      categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
      authorId: input.authorId ?? undefined,
    },
  });
  await saveFaq(existing.id, input.locale, input.faq);
  await saveLinks(existing.id, user, input.links);

  let redirectCreated = false;
  if (slugChanged && wasLive) {
    const r = await ensureRedirectForSlugChange(user, input.locale, `/guides/${existing.slug}/`, `/guides/${input.slug}/`);
    redirectCreated = r;
  }

  if (wasLive) {
    revalidateArticlePublicPaths(input.locale, input.slug, { oldSlug: slugChanged ? existing.slug : null });
  }
  return { slugChanged, redirectCreated };
}

/** Adds an empty DRAFT translation to an existing article (spec §5:
 * translations are created independently; nothing is machine-copied). */
export async function createTranslation(user: SessionUser, articleId: string, locale: string, title: string, slug: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId }, include: { translations: true } });
  if (!article) throw new ValidationError("Article not found");
  if (article.translations.some((t) => t.locale === locale)) throw new ValidationError(`${locale} version already exists`);
  await assertSlugFree(locale, slug);
  const t = await prisma.articleTranslation.create({
    data: {
      articleId,
      locale,
      title,
      slug,
      blocks: [{ type: "paragraph", text: "" }] as unknown as Block[],
      readingMinutes: 1,
    },
  });
  await prisma.articleRevision.create({
    data: { translationId: t.id, status: "DRAFT", snapshot: asJson(await snapshotOf(t.id)), note: `Created ${locale.toUpperCase()} version`, createdById: user.id },
  });
  return t;
}

/** Explicit, human-gated workflow transition (spec §6/§8). */
export async function applyTransition(
  user: SessionUser,
  translationId: string,
  action: WorkflowAction,
  opts?: { notes?: string; scheduledAt?: Date | null }
): Promise<{ from: string; to: string }> {
  const t = await prisma.articleTranslation.findUnique({ where: { id: translationId }, include: { article: true } });
  if (!t) throw new ValidationError("Translation not found");
  const isOwner = user.authorProfileId ? t.article.authorId === user.authorProfileId : false;

  const to = assertTransition(action, t.workflowStatus, user, { isOwner, scheduledAt: opts?.scheduledAt ?? undefined });

  // Snapshot before publishing-grade changes
  if (action === "publish" || action === "schedule" || action === "archive") {
    await prisma.articleRevision.create({
      data: { translationId: t.id, status: t.workflowStatus, snapshot: asJson(await snapshotOf(t.id)), note: `Before ${action}`, createdById: user.id },
    });
  }

  const now = new Date();
  await prisma.articleTransition.create({
    data: { translationId: t.id, fromStatus: t.workflowStatus, toStatus: to, userId: user.id, notes: opts?.notes ?? null },
  });

  await prisma.articleTranslation.update({
    where: { id: t.id },
    data: {
      workflowStatus: to,
      ...(action === "publish" ? { publishedAt: t.publishedAt ?? now, scheduledAt: null, archivedAt: null } : {}),
      ...(action === "schedule" ? { scheduledAt: opts?.scheduledAt ?? null } : {}),
      ...(action === "unschedule" ? { scheduledAt: null } : {}),
      ...(action === "unpublish" ? { publishedAt: null, scheduledAt: null } : {}),
      ...(action === "archive" ? { archivedAt: now } : {}),
      ...(action === "revive" ? { archivedAt: null } : {}),
      ...(action === "reject" && opts?.notes ? { reviewNotes: opts.notes } : {}),
      ...(action === "pass_fact_check" && opts?.notes ? { factCheckNotes: opts.notes } : {}),
    },
  });

  if (t.workflowStatus === "PUBLISHED" || to === "PUBLISHED") {
    revalidateArticlePublicPaths(t.locale, t.slug, { oldSlug: action === "unpublish" || action === "archive" ? t.slug : null });
  }
  return { from: t.workflowStatus, to };
}

/** Scheduled → PUBLISHED promotion (cron, spec §11). Returns promoted slugs. */
export async function promoteDueScheduled(): Promise<{ locale: string; slug: string; translationId: string }[]> {
  const due = await prisma.articleTranslation.findMany({
    where: { workflowStatus: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });
  for (const t of due) {
    await prisma.articleTransition.create({
      data: { translationId: t.id, fromStatus: "SCHEDULED", toStatus: "PUBLISHED", userId: null, notes: "Scheduled publication (cron)" },
    });
    await prisma.articleTranslation.update({
      where: { id: t.id },
      data: { workflowStatus: "PUBLISHED", publishedAt: t.scheduledAt ?? new Date(), scheduledAt: null },
    });
    revalidateArticlePublicPaths(t.locale, t.slug);
  }
  return due.map((t) => ({ locale: t.locale, slug: t.slug, translationId: t.id }));
}

export async function restoreRevision(user: SessionUser, revisionId: string): Promise<void> {
  const rev = await prisma.articleRevision.findUnique({ where: { id: revisionId }, include: { translation: { include: { article: true } } } });
  if (!rev) throw new ValidationError("Revision not found");
  if (user.role === "AUTHOR" && rev.translation.article.authorId !== user.authorProfileId) {
    throw new AuthorizationError("Authors may only restore their own articles");
  }
  await prisma.articleRevision.create({
    data: { translationId: rev.translationId, status: rev.translation.workflowStatus, snapshot: asJson(await snapshotOf(rev.translationId)), note: `Autosave before restoring revision from ${rev.createdAt.toISOString()}`, createdById: user.id },
  });
  const s = rev.snapshot as Record<string, unknown>;
  await prisma.articleTranslation.update({
    where: { id: rev.translationId },
    data: {
      title: String(s.title ?? rev.translation.title),
      slug: String(s.slug ?? rev.translation.slug),
      h1: (s.h1 as string | null) ?? null,
      excerpt: (s.excerpt as string | null) ?? null,
      blocks: s.blocks ?? [],
      seoTitle: (s.seoTitle as string | null) ?? null,
      metaDescription: (s.metaDescription as string | null) ?? null,
      canonicalOverride: (s.canonicalOverride as string | null) ?? null,
      noindex: Boolean(s.noindex),
      updatedAt: new Date(),
    },
  });
  await prisma.articleRevision.create({
    data: { translationId: rev.translationId, status: rev.translation.workflowStatus, snapshot: asJson(rev.snapshot), note: `Restored revision from ${rev.createdAt.toISOString()}`, createdById: user.id },
  });
  revalidateArticlePublicPaths(rev.translation.locale, rev.translation.slug);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function checkBlocks(raw: unknown[]): Block[] {
  const result = validateBlocks(raw);
  if (!result.ok) throw new ValidationError(`Invalid content blocks: ${result.error}`);
  return result.blocks;
}

async function assertSlugFree(locale: string, slug: string, excludeId?: string): Promise<void> {
  if (!SLUG_RE.test(slug)) throw new ValidationError("Slug may only contain lowercase letters, numbers and hyphens");
  const clash = await prisma.articleTranslation.findUnique({ where: { locale_slug: { locale, slug } } });
  if (clash && clash.id !== excludeId) throw new ValidationError(`Slug "${slug}" is already used in ${locale.toUpperCase()}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function saveFaq(translationId: string, locale: string, items: { question: string; answer: string }[]): Promise<void> {
  const t = await prisma.articleTranslation.findUnique({ where: { id: translationId }, include: { faqGroup: true } });
  if (!t) return;
  if (items.length === 0) {
    if (t.faqGroupId) {
      await prisma.faqGroup.delete({ where: { id: t.faqGroupId } });
      await prisma.articleTranslation.update({ where: { id: translationId }, data: { faqGroupId: null } });
    }
    return;
  }
  const groupId =
    t.faqGroupId ??
    (
      await prisma.faqGroup.create({
        data: { ownerType: "ArticleTranslation", ownerId: translationId, items: { create: [] } },
      })
    ).id;
  if (!t.faqGroupId) {
    await prisma.articleTranslation.update({ where: { id: translationId }, data: { faqGroupId: groupId } });
  }
  await prisma.faqItem.deleteMany({ where: { groupId } });
  for (const [i, item] of items.entries()) {
    await prisma.faqItem.create({
      data: {
        groupId,
        position: i,
        translations: { create: { locale, question: item.question, answer: item.answer } },
      },
    });
  }
}

async function saveLinks(translationId: string, user: SessionUser, links: { anchorText: string; targetTranslationId: string }[]): Promise<void> {
  await prisma.contentLink.deleteMany({ where: { ownerType: "ArticleTranslation", ownerId: translationId } });
  if (links.length === 0) return;
  const targets = await prisma.articleTranslation.findMany({
    where: { id: { in: links.map((l) => l.targetTranslationId) }, workflowStatus: { in: ["PUBLISHED", "SCHEDULED", "APPROVED"] } },
    select: { id: true, locale: true, slug: true },
  });
  const byId = new Map(targets.map((t) => [t.id, t]));
  const data = links
    .filter((l) => byId.has(l.targetTranslationId) && l.targetTranslationId !== translationId)
    .map((l, i) => {
      const target = byId.get(l.targetTranslationId)!;
      return {
        ownerType: "ArticleTranslation",
        ownerId: translationId,
        anchorText: l.anchorText,
        targetArticleTranslationId: target.id,
        position: i,
      };
    });
  if (data.length) await prisma.contentLink.createMany({ data });
  void user;
}

async function snapshotOf(translationId: string): Promise<Record<string, unknown>> {
  const t = await prisma.articleTranslation.findUnique({
    where: { id: translationId },
    include: { faqGroup: { include: { items: { orderBy: { position: "asc" }, include: { translations: true } } } } },
  });
  if (!t) return {};
  return {
    title: t.title,
    slug: t.slug,
    h1: t.h1,
    excerpt: t.excerpt,
    blocks: t.blocks,
    seoTitle: t.seoTitle,
    metaDescription: t.metaDescription,
    canonicalOverride: t.canonicalOverride,
    noindex: t.noindex,
    faq:
      t.faqGroup?.items.flatMap((item) =>
        item.translations.filter((tr) => tr.locale === t.locale).map((tr) => ({ question: tr.question, answer: tr.answer }))
      ) ?? [],
  };
}
