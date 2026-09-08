import "server-only";
import { prisma } from "@/lib/prisma";
import { SLUG_RE } from "@/lib/cms/blocks";
import { ValidationError } from "@/lib/cms/errors";
import { revalidateTag } from "next/cache";
import { z } from "zod";

/**
 * Taxonomy services (Phase 3, spec §8/§18).
 * Sections + Categories live in the existing Category tree (roots = sections);
 * Tags are the existing Tag model; Topics are new. All editorially controlled,
 * duplicate-proof, and reference-safe (archive instead of delete when used).
 */

export const topicInputSchema = z.object({
  id: z.string().optional(),
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Key: lowercase letters, numbers, hyphens"),
  isActive: z.boolean().default(true),
  labels: z
    .array(z.object({ locale: z.enum(["en", "es", "ar"]), name: z.string().min(2).max(80), slug: z.string().regex(SLUG_RE) }))
    .min(1, "At least one locale label is required"),
});

export async function listTopics() {
  return prisma.topic.findMany({
    orderBy: [{ position: "asc" }, { key: "asc" }],
    include: {
      translations: true,
      _count: { select: { articles: true, destinations: true } },
    },
  });
}

export async function saveTopic(
  input: z.infer<typeof topicInputSchema>
): Promise<{ id: string }> {
  const existing = input.id ? await prisma.topic.findUnique({ where: { id: input.id } }) : null;
  const keyClash = await prisma.topic.findFirst({ where: { key: input.key, ...(existing ? { id: { not: existing.id } } : {}) } });
  if (keyClash) throw new ValidationError("A topic with this key already exists");

  const topic = await prisma.topic.upsert({
    where: { id: existing?.id ?? "none" },
    update: { isActive: input.isActive },
    create: { key: input.key, isActive: input.isActive },
  });
  for (const label of input.labels) {
    const slugClash = await prisma.topicTranslation.findFirst({
      where: { locale: label.locale, slug: label.slug, topicId: { not: topic.id } },
    });
    if (slugClash) throw new ValidationError(`Slug "${label.slug}" is already used (${label.locale})`);
    await prisma.topicTranslation.upsert({
      where: { topicId_locale: { topicId: topic.id, locale: label.locale } },
      update: { name: label.name, slug: label.slug },
      create: { topicId: topic.id, locale: label.locale, name: label.name, slug: label.slug },
    });
  }
  revalidateTag("topics");
  return { id: topic.id };
}

/** Reference-safe archive: deactivates; hard delete only when unreferenced. */
export async function deleteOrArchiveTopic(id: string): Promise<"deleted" | "archived"> {
  const [articleCount, destCount] = await Promise.all([
    prisma.articleTopic.count({ where: { topicId: id } }),
    prisma.destinationTopic.count({ where: { topicId: id } }),
  ]);
  if (articleCount + destCount === 0) {
    await prisma.topic.delete({ where: { id } });
    revalidateTag("topics");
    return "deleted";
  }
  await prisma.topic.update({ where: { id }, data: { isActive: false } });
  revalidateTag("topics");
  return "archived";
}

/** Categories (existing model): create with labels + optional section parent. */
export const categoryInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:\.[a-z0-9-]+)*$/, "Key: lowercase, dots for hierarchy (e.g. morocco.family)"),
  parentId: z.string().optional().nullable(),
  labels: z
    .array(z.object({ locale: z.enum(["en", "es", "ar"]), name: z.string().min(2).max(80), slug: z.string().regex(SLUG_RE) }))
    .min(1),
});

export async function saveCategory(input: z.infer<typeof categoryInputSchema>): Promise<{ id: string }> {
  const existing = await prisma.category.findUnique({ where: { key: input.key } });
  if (existing) throw new ValidationError("A category with this key already exists");
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new ValidationError("Parent section not found");
  }
  const category = await prisma.category.create({
    data: { key: input.key, parentId: input.parentId || null, translations: { create: input.labels.map((l) => ({ locale: l.locale, name: l.name, slug: l.slug })) } },
  });
  revalidateTag("topics");
  return { id: category.id };
}

/** Reference-safe archive for categories. */
export async function deleteOrArchiveCategory(id: string): Promise<"deleted" | "archived"> {
  const [articles, children] = await Promise.all([
    prisma.article.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);
  if (articles + children === 0) {
    await prisma.category.delete({ where: { id } });
    revalidateTag("topics");
    return "deleted";
  }
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  revalidateTag("topics");
  return "archived";
}

/** Link topics to a destination (editorial, from the destination editor). */
export async function setDestinationTopics(destinationId: string, topicIds: string[]): Promise<void> {
  await prisma.destinationTopic.deleteMany({ where: { destinationId } });
  for (const topicId of topicIds.filter(Boolean)) {
    await prisma.destinationTopic.create({ data: { destinationId, topicId } }).catch(() => undefined); // ignore dupes
  }
  revalidateTag("topics");
  revalidateTag("destinations");
}

/** Link topics to an article (from the article editor). */
export async function setArticleTopics(articleId: string, topicIds: string[]): Promise<void> {
  await prisma.articleTopic.deleteMany({ where: { articleId } });
  for (const [i, topicId] of topicIds.filter(Boolean).entries()) {
    await prisma.articleTopic.create({ data: { articleId, topicId, position: i } }).catch(() => undefined);
  }
  revalidateTag("topics");
  revalidateTag("articles");
}
