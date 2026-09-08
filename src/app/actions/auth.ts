"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { actionErrorMessage } from "@/lib/cms/errors";

export type FormState = { ok?: boolean; error?: string; message?: string };

/** Credentials login (real session cookie). CSRF-safe: Next server actions
 * validate the Origin header; cookie is SameSite=Lax. */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Invalid credentials." };

  const h = await headers();
  await createSession(user.id, h.get("user-agent") ?? undefined);

  const nextPath = String(formData.get("next") ?? "");
  redirect(nextPath.startsWith("/admin/") ? nextPath : `/admin/en`);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/en/login");
}
