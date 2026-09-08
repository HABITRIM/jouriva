"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { registerUpload, updateMediaMetadata, deleteMedia } from "@/lib/cms/media";
import { actionErrorMessage } from "@/lib/cms/errors";
import type { FormState } from "./auth";

export async function uploadMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("EDITOR");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await registerUpload(user, { name: file.name, type: file.type, size: file.size, buffer }, {
      alt: (formData.get("alt") as string) || undefined,
      credit: (formData.get("credit") as string) || undefined,
      sourceUrl: (formData.get("sourceUrl") as string) || undefined,
      license: (formData.get("license") as string) || undefined,
      aiGenerated: formData.get("aiGenerated") === "on",
    });
    revalidatePath("/admin/en/media");
    return { ok: true, message: `Uploaded: ${result.url}` };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function updateMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("EDITOR");
    const id = String(formData.get("id") ?? "");
    const alt: Record<string, string | undefined> = {};
    const captions: Record<string, string | undefined> = {};
    for (const locale of ["en", "es", "ar"]) {
      alt[locale] = formData.get(`alt_${locale}`) as string | undefined;
      captions[locale] = (formData.get(`caption_${locale}`) as string) || undefined;
      if (captions[locale] === "") captions[locale] = undefined;
      if (alt[locale] === "") alt[locale] = undefined;
    }
    await updateMediaMetadata(user, id, {
      filename: (formData.get("filename") as string) || undefined,
      credit: (formData.get("credit") as string) || null,
      sourceUrl: (formData.get("sourceUrl") as string) || null,
      license: (formData.get("license") as string) || null,
      aiGenerated: formData.get("aiGenerated") === "on",
      archived: formData.get("archived") === "on",
      alt,
      captions,
    });
    revalidatePath("/admin/en/media");
    revalidatePath(`/admin/en/media/${id}`);
    return { ok: true, message: "Media metadata saved." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function deleteMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const id = String(formData.get("id") ?? "");
    const result = await deleteMedia(user, id);
    revalidatePath("/admin/en/media");
    return result.deleted
      ? { ok: true, message: "Media permanently deleted." }
      : { error: result.reason ?? "Could not delete." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
