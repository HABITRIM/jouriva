import "server-only";
import { prisma } from "@/lib/prisma";
import { SLUG_RE } from "@/lib/cms/blocks";
import { validateBlocks, type Block } from "@/lib/cms/blocks";
import type { SessionUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/auth";
import { ValidationError } from "@/lib/cms/errors";
import { ensureRedirectForSlugChange } from "@/lib/cms/redirects";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { WorkflowStatus, VerificationStatus, DestinationType } from "@prisma/client";

/**
 * Destination services (Phase 3). Reuses the Phase 2 architecture:
 * same block schema, same FAQ groups, same verification model, same
 * redirect + revalidation infrastructure, same role model.
 *
 * Publishing is per-locale and human-gated (EDITOR+); nothing publishes
 * automatically. Thin-content protection: `destinationQuality` decides
 * whether a published translation may become an indexable landing page.
 */

export const DESTINATION_TYPES: DestinationType[] = ["COUNTRY", "CITY", "REGION", "ATTRACTION", "VENUE"];

export const destinationInputSchema = z.object({
  destinationId: z.string().optional(), // empty on create
  locale: z.enum(["en", "es", "ar"]),
  name: z.string().min(2).max(120),
  slug: z.string().max(120).regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and hyphens"),
  tagline: z.string().max(200).optional().nullable(),
  intro: z.string().max(1000).optional().nullable(), // editorial standfirst
  blocks: z.array(z.unknown()).default([]), // structured editorial core (same schema as articles)
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
  verification: z.object({
    status: z.enum(["VERIFIED", "NEEDS_REVIEW", "OUTDATED", "ARCHIVED"]).nullable(),
    lastVerifiedAt: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    warningEnabled: z.boolean().optional().nullable(),
  }),
  heroAssetId: z.string().optional().nullable(),
  galleryAssetIds: z.array(z.string()).max(30).default([]),
  relatedDestinationIds: z.array(z.string()).max(20).default([]), // curated destination→destination links
});

export type DestinationInput = z.infer<typeof destinationInputSchema>;

// ── Quality gate (spec §15 — thin-content protection) ────────────────────────

export type DestinationQuality = { indexable: boolean; reasons: string[]; textLength: number };

function checkBlocksSilent(value: unknown): Block[] {
  const result = validateBlocks(value);
  return result.ok ? result.blocks : [];
}

function checkBlocks(value: unknown): Block[] {
  const result = validateBlocks(value);
  if (!result.ok) throw new ValidationError(`Content blocks: ${result.error}`);
  return result.blocks;
}

function blocksText(blocks: Block[]): string {
  let out = "";
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "heading" || b.type === "quote") out += ` ${b.text}`;
    if (b.type === "list") out += ` ${b.items.join(" ")}`;
  }
  return out;
}

/** Deterministic, documented threshold. A destination translation becomes an
 * indexable SEO landing page only when it carries real editorial value. */
export function destinationQuality(
  tr: {
    workflowStatus: WorkflowStatus;
    noindex: boolean;
    name: string;
    description: string | null; // intro
    blocks: unknown;
    metaDescription: string | null;
  },
  anchorOk: boolean
): DestinationQuality {
  const reasons: string[] = [];
  if (tr.workflowStatus !== "PUBLISHED") reasons.push("Not published");
  if (tr.noindex) reasons.push("Marked noindex");
  const intro = (tr.description ?? "").trim();
  if (intro.length < 60) reasons.push(`Introduction too short (${intro.length} < 60 chars)`);
  const blocks = Array.isArray(tr.blocks) ? checkBlocksSilent(tr.blocks) : [];
  const textLen = intro.length + blocksText(blocks).trim().length;
  if (textLen < 400) reasons.push(`Editorial content too thin (${textLen} < 400 chars)`);
  if (!(tr.metaDescription ?? "").trim()) reasons.push("Missing meta description");
  if (!anchorOk) reasons.push("No country/city anchor");
  return { indexable: reasons.length === 0, reasons, textLength: textLen };
}

// ── Public path helpers (used by redirects, sitemap, breadcrumbs, hreflang) ──

/** Resolves the locale-specific public path of a destination from its anchor. */
export function destinationPath(
  type: DestinationType,
  slug: string,
  countrySlug: string | null | undefined
): string {
  if (type === "COUNTRY" || !countrySlug) return `/${slug}/`;
  return `/${countrySlug}/${slug}/`;
}

export async function anchorContext(destinationId: string) {
  const d = await prisma.destination.findUnique({
    where: { id: destinationId },
    include: {
      country: { include: { translations: true } },
      city: { include: { country: { include: { translations: true } } } },
    },
  });
  if (!d) return null;
  const country = d.type === "COUNTRY" ? d.country : (d.city?.country ?? d.country);
  return { destination: d, country };
}

// ── Mutations ────────────────────────────────────────────────────────────────

async function assertSlugFree(locale: string, slug: string, ignoreTranslationId?: string) {
  const clash = await prisma.destinationTranslation.findFirst({
    where: { locale, slug, ...(ignoreTranslationId ? { id: { not: ignoreTranslationId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ValidationError("This slug is already used by another destination in this locale");
}

async function saveFaq(translationId: string, locale: string, items: { question: string; answer: string }[]): Promise<void> {
  const t = await prisma.destinationTranslation.findUnique({ where: { id: translationId }, select: { faqGroupId: true } });
  if (items.length === 0) {
    if (t?.faqGroupId) {
      await prisma.faqGroup.delete({ where: { id: t.faqGroupId } });
      await prisma.destinationTranslation.update({ where: { id: translationId }, data: { faqGroupId: null } });
    }
    return;
  }
  const groupId =
    t?.faqGroupId ??
    (await prisma.faqGroup.create({ data: { ownerType: "DestinationTranslation", ownerId: translationId, items: { create: [] } } })).id;
  if (t && !t.faqGroupId) {
    await prisma.destinationTranslation.update({ where: { id: translationId }, data: { faqGroupId: groupId } });
  }
  await prisma.faqItem.deleteMany({ where: { groupId } });
  for (const [i, item] of items.entries()) {
    await prisma.faqItem.create({
      data: { groupId, position: i, translations: { create: { locale, question: item.question, answer: item.answer } } },
    });
  }
}

function revalidateDestination(locale: string, path: string, parentPath: string | null) {
  revalidateTag("destinations");
  revalidateTag("articles"); // destination↔article relationship affects related content
  revalidatePath(`/${locale}${path}`);
  if (parentPath) revalidatePath(`/${locale}${parentPath}`);
  revalidatePath("/sitemap.xml");
}

/** Creates a destination + its first translation (DRAFT). EDITOR/ADMIN only —
 * AUTHORS gain no destination permissions (spec §17). */
export async function createDestination(
  user: SessionUser,
  input: { type: DestinationType; countryId?: string | null; cityId?: string | null; locale: string } & DestinationInput
): Promise<{ destinationId: string; translationId: string }> {
  let countryId = input.countryId || null;
  if (input.type === "COUNTRY") {
    if (!countryId) throw new ValidationError("A country record is required for country destinations");
  } else if (input.type === "CITY") {
    if (!input.cityId) throw new ValidationError("A city record is required for city destinations");
    const city = await prisma.city.findUnique({ where: { id: input.cityId }, select: { countryId: true } });
    countryId = city?.countryId ?? countryId;
  } else if (!countryId && !input.cityId) {
    throw new ValidationError("Anchor the destination to a country (and optionally a city)");
  }
  await assertSlugFree(input.locale, input.slug);

  const blocks = checkBlocks(input.blocks);
  const destination = await prisma.destination.create({
    data: {
      type: input.type,
      countryId,
      cityId: input.cityId || null,
      heroAssetId: input.heroAssetId || null,
      translations: {
        create: {
          locale: input.locale,
          name: input.name,
          slug: input.slug,
          tagline: input.tagline ?? null,
          description: input.intro ?? null,
          blocks: blocks.length ? (JSON.parse(JSON.stringify(blocks)) as never) : (JSON.parse("[]") as never),
          seoTitle: input.seoTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          noindex: input.noindex ?? false,
          verificationStatus: input.verification.status ?? null,
          lastVerifiedAt: input.verification.lastVerifiedAt ? new Date(input.verification.lastVerifiedAt) : null,
          verificationNotes: input.verification.notes ?? null,
          warningEnabled: input.verification.warningEnabled ?? false,
        },
      },
    },
  });
  const translation = await prisma.destinationTranslation.findFirstOrThrow({
    where: { destinationId: destination.id, locale: input.locale },
  });
  await saveFaq(translation.id, input.locale, input.faq);
  return { destinationId: destination.id, translationId: translation.id };
}

/** Saves one locale's editorial core/SEO/verification. Keeps 301s alive on
 * published slug changes (same infrastructure as articles). */
export async function saveDestinationTranslation(
  user: SessionUser,
  input: DestinationInput
): Promise<{ slugChanged: boolean; redirectCreated: boolean }> {
  if (!input.destinationId) throw new ValidationError("Missing destination reference");
  const existing = await prisma.destinationTranslation.findUnique({
    where: { destinationId_locale: { destinationId: input.destinationId, locale: input.locale } },
    include: { destination: { include: { city: { include: { country: { include: { translations: true } } } } } } },
  });
  if (!existing) throw new ValidationError("Translation does not exist — create it first");

  await assertSlugFree(input.locale, input.slug, existing.id);
  const blocks = checkBlocks(input.blocks);

  const oldPath = await publicPathOf(existing.destination, existing.slug, input.locale);
  const slugChanged = existing.slug !== input.slug;
  const wasLive = existing.workflowStatus === "PUBLISHED";

  await prisma.destinationTranslation.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      slug: input.slug,
      tagline: input.tagline ?? null,
      description: input.intro ?? null,
      blocks: JSON.parse(JSON.stringify(blocks)) as never,
      seoTitle: input.seoTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      canonicalOverride: input.canonicalOverride ?? null,
      noindex: input.noindex ?? false,
      verificationStatus: input.verification.status,
      lastVerifiedAt: input.verification.lastVerifiedAt ? new Date(input.verification.lastVerifiedAt) : null,
      verificationNotes: input.verification.notes ?? null,
      warningEnabled: input.verification.warningEnabled ?? false,
    },
  });
  if (input.heroAssetId !== undefined) {
    await prisma.destination.update({ where: { id: existing.destinationId }, data: { heroAssetId: input.heroAssetId || null } });
  }
  if (input.galleryAssetIds) {
    await prisma.destinationMedia.deleteMany({ where: { destinationId: existing.destinationId } });
    for (const [i, assetId] of input.galleryAssetIds.filter(Boolean).entries()) {
      await prisma.destinationMedia.create({ data: { destinationId: existing.destinationId, assetId, position: i } });
    }
  }
  await saveFaq(existing.id, input.locale, input.faq);

  // Curated destination→destination links (ContentLink, ownerType DestinationTranslation)
  await prisma.contentLink.deleteMany({ where: { ownerDestinationTranslationId: existing.id } });
  if (input.relatedDestinationIds.length) {
    const targets = await prisma.destinationTranslation.findMany({
      where: { destinationId: { in: input.relatedDestinationIds }, locale: input.locale },
      select: { id: true, destinationId: true },
    });
    for (const [i, t] of targets.entries()) {
      if (t.destinationId === existing.destinationId) continue; // never self-link
      await prisma.contentLink.create({
        data: { ownerDestinationTranslationId: existing.id, targetDestination: { connect: { id: t.destinationId } }, anchorText: input.name, position: i },
      });
    }
  }

  let redirectCreated = false;
  const newPath = await publicPathOf(existing.destination, input.slug, input.locale);
  if (slugChanged && wasLive) {
    redirectCreated = await ensureRedirectForSlugChange(user, input.locale, oldPath, newPath);
  }
  revalidateDestination(input.locale, newPath, oldPath !== newPath ? oldPath : null);
  return { slugChanged, redirectCreated };
}

async function publicPathOf(dest: { type: DestinationType; cityId: string | null; countryId: string | null }, slug: string, locale: string): Promise<string> {
  let countrySlug: string | null = null;
  if (dest.type !== "COUNTRY") {
    const viaCity = dest.cityId
      ? await prisma.city.findUnique({ where: { id: dest.cityId }, include: { country: { include: { translations: true } } } })
      : null;
    const viaCountry = !viaCity && dest.countryId
      ? await prisma.country.findUnique({ where: { id: dest.countryId }, include: { translations: true } })
      : null;
    const country = viaCity?.country ?? viaCountry ?? null;
    countrySlug =
      country?.translations.find((t) => t.locale === locale)?.slug ??
      country?.translations.find((t) => t.locale === "en")?.slug ??
      null;
  }
  return destinationPath(dest.type, slug, countrySlug);
}

// ── Lifecycle transitions (human-gated; EDITOR/ADMIN publish) ────────────────

export type DestinationAction = "publish" | "unpublish" | "archive" | "restore";

export async function applyDestinationTransition(user: SessionUser, translationId: string, action: DestinationAction): Promise<WorkflowStatus> {
  const canPublish = user.role === "EDITOR" || user.role === "ADMIN";
  if ((action === "publish" || action === "unpublish") && !canPublish) {
    throw new AuthorizationError("Only EDITOR or ADMIN can publish or unpublish destinations");
  }
  const t = await prisma.destinationTranslation.findUnique({
    where: { id: translationId },
    include: { destination: true },
  });
  if (!t) throw new ValidationError("Destination translation not found");

  const now = new Date();
  let to: WorkflowStatus;
  switch (action) {
    case "publish":
      if (t.workflowStatus === "PUBLISHED") throw new ValidationError("Already published");
      to = "PUBLISHED";
      break;
    case "unpublish":
      if (t.workflowStatus !== "PUBLISHED") throw new ValidationError("Only published destinations can be unpublished");
      to = "DRAFT";
      break;
    case "archive":
      if (t.workflowStatus === "ARCHIVED") throw new ValidationError("Already archived");
      to = "ARCHIVED";
      break;
    case "restore":
      if (t.workflowStatus !== "ARCHIVED") throw new ValidationError("Only archived destinations can be restored");
      to = "DRAFT";
      break;
  }

  await prisma.destinationTranslation.update({
    where: { id: t.id },
    data: {
      workflowStatus: to,
      publishedAt: action === "publish" ? (t.publishedAt ?? now) : action === "unpublish" ? null : t.publishedAt,
      archivedAt: action === "archive" ? now : action === "restore" ? null : t.archivedAt,
    },
  });
  if (action === "publish" || action === "unpublish" || action === "archive") {
    await prisma.destination.update({ where: { id: t.destinationId }, data: { isActive: action !== "archive" } }).catch(() => undefined);
  }
  const path = await publicPathOf(t.destination, t.slug, t.locale);
  revalidateDestination(t.locale, path, null);
  return to;
}

/** Adds another locale version (independent DRAFT) — mirrors articles. */
export async function createDestinationTranslation(
  user: SessionUser,
  destinationId: string,
  locale: string,
  name: string,
  slug: string
): Promise<string> {
  if (!["en", "es", "ar"].includes(locale)) throw new ValidationError("Invalid locale");
  await assertSlugFree(locale, slug);
  const exists = await prisma.destinationTranslation.findUnique({
    where: { destinationId_locale: { destinationId, locale } },
    select: { id: true },
  });
  if (exists) throw new ValidationError("This locale version already exists");
  const tr = await prisma.destinationTranslation.create({
    data: { destinationId, locale, name, slug },
  });
  return tr.id;
}

/** Explicit article ↔ destination relationship management (spec §7). */
export async function setArticleDestinations(
  user: SessionUser,
  articleId: string,
  primaryDestinationId: string | null,
  secondaryDestinationIds: string[]
): Promise<void> {
  const existing = await prisma.articleDestination.findMany({ where: { articleId } });
  const keep = new Set([...(primaryDestinationId ? [primaryDestinationId] : []), ...secondaryDestinationIds]);
  for (const link of existing) {
    if (!keep.has(link.destinationId)) await prisma.articleDestination.delete({ where: { id: link.id } });
  }
  if (primaryDestinationId) {
    await prisma.articleDestination.upsert({
      where: { articleId_destinationId: { articleId, destinationId: primaryDestinationId } },
      update: { role: "PRIMARY", position: 0 },
      create: { articleId, destinationId: primaryDestinationId, role: "PRIMARY", position: 0 },
    });
  }
  for (const [i, destinationId] of secondaryDestinationIds.filter((d) => d !== primaryDestinationId).entries()) {
    await prisma.articleDestination.upsert({
      where: { articleId_destinationId: { articleId, destinationId } },
      update: { role: "SECONDARY", position: i + 1 },
      create: { articleId, destinationId, role: "SECONDARY", position: i + 1 },
    });
  }
  void user;
}
