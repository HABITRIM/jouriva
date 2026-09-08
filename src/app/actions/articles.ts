"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/auth";
import { createArticleWithTranslation, saveTranslation, createTranslation, applyTransition, restoreRevision, translationInputSchema } from "@/lib/cms/articles";
import { setArticleDestinations } from "@/lib/cms/destinations";
import { setArticleTopics } from "@/lib/cms/taxonomy";
import { actionErrorMessage, ValidationError } from "@/lib/cms/errors";
import type { WorkflowAction } from "@/lib/cms/workflow";
import type { FormState } from "./auth";

function translationInputFrom(formData: FormData) {
  return {
    articleId: String(formData.get("articleId") ?? ""),
    locale: String(formData.get("locale") ?? "en"),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    h1: (formData.get("h1") as string) || null,
    excerpt: (formData.get("excerpt") as string) || null,
    blocks: JSON.parse(String(formData.get("blocks") ?? "[]")) as unknown[],
    seoTitle: (formData.get("seoTitle") as string) || null,
    metaDescription: (formData.get("metaDescription") as string) || null,
    canonicalOverride: (formData.get("canonicalOverride") as string) || null,
    noindex: formData.get("noindex") === "on",
    faq: JSON.parse(String(formData.get("faq") ?? "[]")) as { question: string; answer: string }[],
    links: JSON.parse(String(formData.get("links") ?? "[]")) as { anchorText: string; targetTranslationId: string }[],
    verification: {
      status: (formData.get("verificationStatus") as string) || null,
      lastVerifiedAt: (formData.get("lastVerifiedAt") as string) || null,
      notes: (formData.get("verificationNotes") as string) || null,
      warningEnabled: formData.get("warningEnabled") === "on",
    },
    categoryId: (formData.get("categoryId") as string) || null,
    authorId: (formData.get("authorId") as string) || null,
    heroImageId: (formData.get("heroImageId") as string) || null,
  };
}

/** Create article + first translation. Editors/authors. */
export async function createArticleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("AUTHOR", "EDITOR");
    const input = { ...translationInputFrom(formData), verification: { ...(translationInputFrom(formData).verification) } };
    const parsed = translationInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const { articleId } = await createArticleWithTranslation(user, parsed.data);
    redirect(`/admin/en/articles/${articleId}/${parsed.data.locale}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error; // NEXT_REDIRECT
    return { error: actionErrorMessage(error) };
  }
}

/** Save translation content/SEO/verification. */
export async function saveTranslationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const input = translationInputFrom(formData);
    const parsed = translationInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const result = await saveTranslation(user, parsed.data);

    // Phase 3: editorial article ↔ destination + topic links (same save action;
    // no new permissions — this only edits the article being saved).
    const primaryDestinationId = String(formData.get("primaryDestinationId") ?? "").trim();
    const secondaryRaw = String(formData.get("secondaryDestinationIds") ?? "").trim();
    const topicIdsRaw = String(formData.get("topicIds") ?? "").trim();
    if (formData.has("primaryDestinationId") || formData.has("secondaryDestinationIds") || formData.has("topicIds")) {
      await setArticleDestinations(
        user,
        input.articleId,
        primaryDestinationId || null,
        secondaryRaw ? secondaryRaw.split(",").map((s) => s.trim()).filter(Boolean) : []
      );
      await setArticleTopics(input.articleId, topicIdsRaw ? topicIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : []);
    }

    revalidatePath(`/admin/en/articles/${input.articleId}/${input.locale}`);
    return {
      ok: true,
      message:
        result.slugChanged && result.redirectCreated
          ? "Saved. Slug changed — a 301 redirect from the old URL was created automatically."
          : result.slugChanged
            ? "Saved. Slug changed (no redirect created — content was not live)."
            : "Saved.",
    };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

/** Add another locale version (independent DRAFT). */
export async function createTranslationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const articleId = String(formData.get("articleId") ?? "");
    const locale = String(formData.get("locale") ?? "");
    const title = String(formData.get("title") ?? "");
    const slug = String(formData.get("slug") ?? "");
    if (!["en", "es", "ar"].includes(locale)) return { error: "Invalid locale" };
    if (title.length < 3) return { error: "Title is required" };
    await createTranslation(user, articleId, locale, title, slug);
    redirect(`/admin/en/articles/${articleId}/${locale}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: actionErrorMessage(error) };
  }
}

/** Workflow transition (guarded by the state machine + roles). */
export async function transitionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const translationId = String(formData.get("translationId") ?? "");
    const action = String(formData.get("action") ?? "") as WorkflowAction;
    const notes = (formData.get("notes") as string) || undefined;
    const scheduledAtRaw = (formData.get("scheduledAt") as string) || "";
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

    await applyTransition(user, translationId, action, { notes, scheduledAt });

    // Return to the editor for the same locale
    const locale = String(formData.get("locale") ?? "en");
    const articleId = String(formData.get("articleId") ?? "");
    revalidatePath(`/admin/en/articles/${articleId}/${locale}`);
    return { ok: true, message: `Done: ${action.replaceAll("_", " ")}` };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    return { error: actionErrorMessage(error) };
  }
}

export async function restoreRevisionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const revisionId = String(formData.get("revisionId") ?? "");
    const translationId = String(formData.get("translationId") ?? "");
    const articleId = String(formData.get("articleId") ?? "");
    const locale = String(formData.get("locale") ?? "en");
    await restoreRevision(user, revisionId);
    revalidatePath(`/admin/en/articles/${articleId}/${locale}`);
    void translationId;
    return { ok: true, message: "Revision restored into the editor content (a new snapshot was kept)." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
