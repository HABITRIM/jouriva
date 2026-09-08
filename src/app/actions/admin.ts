"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAuthor, updateAuthor } from "@/lib/cms/authors";
import { createRedirect, setRedirectActive, deleteRedirect } from "@/lib/cms/redirects";
import { actionErrorMessage } from "@/lib/cms/errors";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { FormState } from "./auth";

// ── Authors ──────────────────────────────────────────────────────────────────

export async function saveAuthorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("EDITOR");
    const id = (formData.get("id") as string) || null;
    const bio = { en: formData.get("bio_en") as string, es: formData.get("bio_es") as string, ar: formData.get("bio_ar") as string };
    const roles = { en: formData.get("role_en") as string, es: formData.get("role_es") as string, ar: formData.get("role_ar") as string };
    const expertise = { en: formData.get("expertise_en") as string, es: formData.get("expertise_es") as string, ar: formData.get("expertise_ar") as string };
    const socials = (formData.get("socials") as string)
      ? (JSON.parse(formData.get("socials") as string) as { label: string; url: string }[])
      : undefined;

    if (id) {
      await updateAuthor(user, id, {
        name: (formData.get("name") as string) || undefined,
        slug: (formData.get("slug") as string) || undefined,
        email: (formData.get("email") as string) || null,
        photoAssetId: (formData.get("photoAssetId") as string) || null,
        isActive: formData.get("isActive") === "on",
        socials,
        bio, roles, expertise,
      });
      revalidatePath("/admin/en/authors");
      revalidatePath(`/admin/en/authors/${id}`);
      return { ok: true, message: "Author saved." };
    }
    const newId = await createAuthor(user, {
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      email: (formData.get("email") as string) || null,
      photoAssetId: (formData.get("photoAssetId") as string) || null,
      socials,
      bio, roles, expertise,
      createLogin: formData.get("createLogin") === "on"
        ? {
            email: String(formData.get("loginEmail") ?? ""),
            password: String(formData.get("loginPassword") ?? ""),
            role: (String(formData.get("loginRole") ?? "AUTHOR") as "AUTHOR" | "EDITOR" | "REVIEWER" | "ADMIN"),
          }
        : undefined,
    });
    revalidatePath("/admin/en/authors");
    return { ok: true, message: `Author created (${newId}).` };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

// ── Redirects ────────────────────────────────────────────────────────────────

export async function createRedirectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("ADMIN"); // redirects are an ADMIN capability (spec §21)
    await createRedirect(user, {
      locale: String(formData.get("locale") ?? "en"),
      sourcePath: String(formData.get("sourcePath") ?? ""),
      destinationPath: String(formData.get("destinationPath") ?? ""),
      statusCode: 301,
    });
    revalidatePath("/admin/en/redirects");
    return { ok: true, message: "301 redirect created." };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function toggleRedirectAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN");
  await setRedirectActive(user, String(formData.get("id") ?? ""), formData.get("active") === "true");
  revalidatePath("/admin/en/redirects");
}

export async function deleteRedirectAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN");
  await deleteRedirect(user, String(formData.get("id") ?? ""));
  revalidatePath("/admin/en/redirects");
}

// ── Users (ADMIN) ────────────────────────────────────────────────────────────

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireRole("ADMIN");
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const name = String(formData.get("name") ?? "");
    const role = String(formData.get("role") ?? "AUTHOR") as "ADMIN" | "EDITOR" | "AUTHOR" | "REVIEWER";
    const password = String(formData.get("password") ?? "");
    if (!email.includes("@")) return { error: "Valid email required." };
    if (password.length < 10) return { error: "Password must be at least 10 characters." };
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { error: "A user with this email already exists." };
    await prisma.user.create({ data: { email, name, role, passwordHash: hashPassword(password) } });
    revalidatePath("/admin/en/users");
    return { ok: true, message: `User ${email} created with role ${role}.` };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  const user = await prisma.user.findUnique({ where: { id } });
  if (user) {
    await prisma.user.update({ where: { id }, data: { isActive: active } });
    if (!active) await prisma.session.deleteMany({ where: { userId: id } }); // revoke sessions
  }
  revalidatePath("/admin/en/users");
}
