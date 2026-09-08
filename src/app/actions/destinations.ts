"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/auth";
import {
  destinationInputSchema,
  createDestination,
  saveDestinationTranslation,
  applyDestinationTransition,
  createDestinationTranslation,
  setArticleDestinations,
  type DestinationAction,
} from "@/lib/cms/destinations";
import { setDestinationTopics } from "@/lib/cms/taxonomy";
import { actionErrorMessage, ValidationError } from "@/lib/cms/errors";
import type { DestinationType } from "@prisma/client";
import type { FormState } from "./auth";

function readDestinationForm(formData: FormData) {
  return {
    destinationId: String(formData.get("destinationId") ?? ""),
    locale: String(formData.get("locale") ?? "en"),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    tagline: (formData.get("tagline") as string) || null,
    intro: (formData.get("intro") as string) || null,
    blocks: JSON.parse(String(formData.get("blocks") ?? "[]")) as unknown[],
    seoTitle: (formData.get("seoTitle") as string) || null,
    metaDescription: (formData.get("metaDescription") as string) || null,
    canonicalOverride: (formData.get("canonicalOverride") as string) || null,
    noindex: formData.get("noindex") === "on",
    faq: JSON.parse(String(formData.get("faq") ?? "[]")) as { question: string; answer: string }[],
    verification: {
      status: (formData.get("verificationStatus") as string) || null,
      lastVerifiedAt: (formData.get("lastVerifiedAt") as string) || null,
      notes: (formData.get("verificationNotes") as string) || null,
      warningEnabled: formData.get("warningEnabled") === "on",
    },
    heroAssetId: (formData.get("heroAssetId") as string) || null,
    galleryAssetIds: String(formData.get("galleryAssetIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    relatedDestinationIds: String(formData.get("relatedDestinationIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** Create destination + first translation. EDITOR/ADMIN only (spec §17). */
export async function createDestinationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const type = String(formData.get("type") ?? "CITY") as DestinationType;
    const countryId = (formData.get("countryId") as string) || null;
    const cityId = (formData.get("cityId") as string) || null;
    const input = readDestinationForm(formData);
    const parsed = destinationInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const { destinationId } = await createDestination(await requireUser(), { ...parsed.data, type, countryId, cityId });
    redirect(`/admin/en/destinations/${destinationId}/${parsed.data.locale}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: actionErrorMessage(error) };
  }
}

/** Save one locale's destination content. */
export async function saveDestinationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const user = await requireUser();
    const input = readDestinationForm(formData);
    const parsed = destinationInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const result = await saveDestinationTranslation(user, parsed.data);
    const topicIds = String(formData.get("topicIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (input.destinationId) await setDestinationTopics(input.destinationId, topicIds);
    revalidatePath(`/admin/en/destinations/${input.destinationId}/${input.locale}`);
    return {
      ok: true,
      message: result.slugChanged
        ? result.redirectCreated
          ? "Saved. Slug changed — a 301 redirect was created automatically."
          : "Saved. Slug changed (no redirect created — was not live)."
        : "Saved.",
    };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

/** Publish / unpublish / archive / restore — explicit human actions. */
export async function destinationTransitionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const user = await requireUser();
    const translationId = String(formData.get("translationId") ?? "");
    const action = String(formData.get("action") ?? "") as DestinationAction;
    const to = await applyDestinationTransition(user, translationId, action);
    revalidatePath("/admin/en/destinations/");
    return { ok: true, message: `Done: ${action} → ${to}` };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    return { error: actionErrorMessage(error) };
  }
}

/** Add another locale version (independent DRAFT). */
export async function createDestinationTranslationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const destinationId = String(formData.get("destinationId") ?? "");
    const locale = String(formData.get("locale") ?? "");
    const name = String(formData.get("name") ?? "");
    const slug = String(formData.get("slug") ?? "");
    if (name.length < 2) return { error: "Name is required" };
    await createDestinationTranslation(await requireUser(), destinationId, locale, name, slug);
    redirect(`/admin/en/destinations/${destinationId}/${locale}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: actionErrorMessage(error) };
  }
}

/** Article ↔ destination relationships (from the article editor). */
export async function setArticleDestinationsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const user = await requireUser();
    const articleId = String(formData.get("articleId") ?? "");
    const primary = (formData.get("primaryDestinationId") as string) || null;
    const secondary = String(formData.get("secondaryDestinationIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    await setArticleDestinations(user, articleId, primary, secondary);
    revalidatePath("/admin/en/articles/");
    return { ok: true, message: "Destination relationships saved." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
