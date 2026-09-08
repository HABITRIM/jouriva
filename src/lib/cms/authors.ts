import "server-only";
import { prisma } from "@/lib/prisma";
import { SLUG_RE } from "@/lib/cms/blocks";
import { ValidationError } from "@/lib/cms/errors";
import type { SessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

/**
 * Author services (spec §13): CMS-managed profiles with localized bios,
 * avatar via MediaAsset, optional linked login account.
 */

export async function createAuthor(
  user: SessionUser,
  input: {
    name: string;
    slug: string;
    key?: string;
    email?: string | null;
    photoAssetId?: string | null;
    socials?: { label: string; url: string }[];
    bio: Record<string, string | undefined>;
    roles: Record<string, string | undefined>;
    expertise: Record<string, string | undefined>;
    createLogin?: { email: string; password: string; role: "AUTHOR" | "EDITOR" | "REVIEWER" | "ADMIN" };
  }
): Promise<string> {
  if (!SLUG_RE.test(input.slug)) throw new ValidationError("Author slug may only contain lowercase letters, numbers and hyphens");
  const clash = await prisma.author.findUnique({ where: { slug: input.slug } });
  if (clash) throw new ValidationError("Author slug already in use");

  let loginId: string | undefined;
  if (input.createLogin) {
    const email = input.createLogin.email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new ValidationError("A user with this email already exists");
    if (input.createLogin.password.length < 10) throw new ValidationError("Login password must be at least 10 characters");
    const u = await prisma.user.create({
      data: {
        email,
        name: input.name,
        role: input.createLogin.role,
        passwordHash: hashPassword(input.createLogin.password),
      },
    });
    loginId = u.id;
  }

  const author = await prisma.author.create({
    data: {
      key: input.key?.trim() || input.slug,
      slug: input.slug,
      name: input.name,
      email: input.email ?? null,
      photoAssetId: input.photoAssetId || null,
      socials: input.socials ?? [],
      ...(loginId ? { user: { connect: { id: loginId } } } : {}),
      translations: {
        create: (["en", "es", "ar"] as const)
          .filter((l) => (input.bio[l] ?? input.roles[l] ?? input.expertise[l]) !== undefined)
          .map((l) => ({
            locale: l,
            role: input.roles[l] ?? null,
            biography: input.bio[l] ?? null,
            expertise: (input.expertise[l] ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })),
      },
    },
  });
  void user;
  return author.id;
}

export async function updateAuthor(
  user: SessionUser,
  id: string,
  input: {
    name?: string;
    slug?: string;
    email?: string | null;
    photoAssetId?: string | null;
    isActive?: boolean;
    socials?: { label: string; url: string }[];
    bio: Record<string, string | undefined>;
    roles: Record<string, string | undefined>;
    expertise: Record<string, string | undefined>;
  }
): Promise<void> {
  if (input.slug && !SLUG_RE.test(input.slug)) throw new ValidationError("Author slug may only contain lowercase letters, numbers and hyphens");
  if (input.slug) {
    const clash = await prisma.author.findFirst({ where: { slug: input.slug, id: { not: id } } });
    if (clash) throw new ValidationError("Author slug already in use");
  }
  await prisma.author.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.photoAssetId !== undefined ? { photoAssetId: input.photoAssetId || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.socials !== undefined ? { socials: input.socials } : {}),
    },
  });
  for (const locale of ["en", "es", "ar"] as const) {
    const bio = input.bio[locale];
    const role = input.roles[locale];
    const expertise = input.expertise[locale];
    if (bio === undefined && role === undefined && expertise === undefined) continue;
    await prisma.authorTranslation.upsert({
      where: { authorId_locale: { authorId: id, locale } },
      create: {
        authorId: id,
        locale,
        role: role ?? null,
        biography: bio ?? null,
        expertise: (expertise ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      },
      update: {
        ...(role !== undefined ? { role } : {}),
        ...(bio !== undefined ? { biography: bio } : {}),
        ...(expertise !== undefined
          ? { expertise: expertise.split(",").map((s) => s.trim()).filter(Boolean) }
          : {}),
      },
    });
  }
  void user;
}
