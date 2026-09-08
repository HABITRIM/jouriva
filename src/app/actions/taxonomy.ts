"use server";

import { requireRole } from "@/lib/auth";
import { topicInputSchema, categoryInputSchema, saveTopic, saveCategory, deleteOrArchiveTopic, deleteOrArchiveCategory } from "@/lib/cms/taxonomy";
import { actionErrorMessage, ValidationError } from "@/lib/cms/errors";
import type { FormState } from "./auth";

export async function saveTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const labels = ["en", "es", "ar"]
      .map((locale) => ({
        locale,
        name: String(formData.get(`topicName_${locale}`) ?? "").trim(),
        slug: String(formData.get(`topicSlug_${locale}`) ?? "").trim(),
      }))
      .filter((l) => l.name && l.slug);
    const parsed = topicInputSchema.safeParse({
      id: (formData.get("id") as string) || undefined,
      key: String(formData.get("key") ?? ""),
      isActive: formData.get("isActive") !== null,
      labels,
    });
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const { id } = await saveTopic(parsed.data);
    return { ok: true, message: `Topic saved (${id}).` };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    return { error: actionErrorMessage(error) };
  }
}

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const labels = ["en", "es", "ar"]
      .map((locale) => ({
        locale,
        name: String(formData.get(`catName_${locale}`) ?? "").trim(),
        slug: String(formData.get(`catSlug_${locale}`) ?? "").trim(),
      }))
      .filter((l) => l.name && l.slug);
    const parsed = categoryInputSchema.safeParse({
      key: String(formData.get("catKey") ?? ""),
      parentId: (formData.get("catParentId") as string) || null,
      labels,
    });
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
    const { id } = await saveCategory(parsed.data);
    return { ok: true, message: `Category created (${id}).` };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    return { error: actionErrorMessage(error) };
  }
}

export async function archiveTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const result = await deleteOrArchiveTopic(String(formData.get("id") ?? ""));
    return { ok: true, message: result === "deleted" ? "Topic deleted (was unreferenced)." : "Topic archived (still referenced)." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function archiveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("EDITOR");
    const result = await deleteOrArchiveCategory(String(formData.get("id") ?? ""));
    return { ok: true, message: result === "deleted" ? "Category deleted (was unreferenced)." : "Category archived (still referenced)." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
