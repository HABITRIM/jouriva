import "server-only";
import { prisma } from "@/lib/prisma";
import { storage, sniffMime, validateFilename, maxUploadBytes, ALLOWED_MIME } from "@/lib/storage";
import { ValidationError } from "@/lib/cms/errors";
import type { SessionUser } from "@/lib/auth";

/**
 * Media services (spec §14/§15/§23): REAL uploads through the storage
 * abstraction, magic-byte + decode validation, rights/AI metadata,
 * localized alt/caption.
 */

export async function registerUpload(
  user: SessionUser,
  file: { name: string; type: string; size: number; buffer: Buffer },
  meta: { alt?: string; credit?: string; sourceUrl?: string; license?: string; aiGenerated?: boolean; locale?: string }
): Promise<{ id: string; url: string }> {
  if (file.size <= 0) throw new ValidationError("Empty file");
  if (file.size > maxUploadBytes()) throw new ValidationError(`File exceeds the ${process.env.MEDIA_MAX_MB ?? 10} MB limit`);

  const mime = sniffMime(file.buffer);
  if (!mime || !ALLOWED_MIME.includes(mime)) {
    throw new ValidationError("Only JPEG, PNG, WebP, GIF or AVIF images are allowed");
  }

  // Real image decode — rejects corrupt/poisoned files and captures dimensions
  const sharp = (await import("sharp")).default;
  let width: number | undefined;
  let height: number | undefined;
  try {
    const image = sharp(file.buffer);
    const metadata = await image.metadata();
    width = metadata.width;
    height = metadata.height;
    if (!width || !height) throw new Error("no dimensions");
  } catch {
    throw new ValidationError("The file could not be decoded as an image");
  }

  const stored = await storage().put(file.buffer, mime);
  const asset = await prisma.mediaAsset.create({
    data: {
      filename: validateFilename(file.name),
      storageKey: stored.key,
      mimeType: mime,
      sizeBytes: file.size,
      width: width ?? null,
      height: height ?? null,
      url: stored.url,
      credit: meta.credit ?? null,
      sourceUrl: meta.sourceUrl ?? null,
      license: meta.license ?? null,
      aiGenerated: meta.aiGenerated ?? false,
      uploadedById: user.id,
      translations: {
        create: {
          locale: meta.locale ?? "en",
          alt: meta.alt?.trim() || validateFilename(file.name).replace(/\.[a-z0-9]+$/i, ""),
        },
      },
    },
  });
  return { id: asset.id, url: asset.url };
}

export async function updateMediaMetadata(
  user: SessionUser,
  id: string,
  meta: {
    filename?: string;
    credit?: string | null;
    sourceUrl?: string | null;
    license?: string | null;
    aiGenerated?: boolean;
    archived?: boolean;
    alt: Record<string, string | undefined>;
    captions: Record<string, string | undefined>;
  }
): Promise<void> {
  void user;
  const data: Parameters<typeof prisma.mediaAsset.update>[0]["data"] = {
    filename: meta.filename !== undefined ? validateFilename(meta.filename) : undefined,
    credit: meta.credit ?? undefined,
    sourceUrl: meta.sourceUrl ?? undefined,
    license: meta.license ?? undefined,
    aiGenerated: meta.aiGenerated,
    archived: meta.archived,
  };
  Object.keys(data).forEach((k) => data[k as keyof typeof data] === undefined && delete data[k as keyof typeof data]);
  await prisma.mediaAsset.update({ where: { id }, data });

  for (const locale of ["en", "es", "ar"]) {
    const alt = meta.alt[locale];
    const caption = meta.captions[locale];
    if (alt === undefined && caption === undefined) continue;
    await prisma.mediaAssetTranslation.upsert({
      where: { assetId_locale: { assetId: id, locale } },
      create: { assetId: id, locale, alt: alt ?? "", caption: caption ?? null },
      update: { ...(alt !== undefined ? { alt } : {}), ...(caption !== undefined ? { caption } : {}) },
    });
  }
}

/** Archive keeps history (articles referencing it stay intact); hard delete
 * is blocked while any article uses the asset. */
export async function deleteMedia(user: SessionUser, id: string): Promise<{ deleted: boolean; reason?: string }> {
  if (user.role !== "ADMIN") throw new ValidationError("Only admins can permanently delete media");
  const usedByArticles = await prisma.article.count({ where: { OR: [{ heroImageId: id }, { translations: { some: { ogImageId: id } } }] } });
  if (usedByArticles > 0) throw new ValidationError(`Asset is used by ${usedByArticles} article(s) — archive it instead`);
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { deleted: true };
  await storage().delete(asset.storageKey);
  await prisma.mediaAsset.delete({ where: { id } });
  return { deleted: true };
}
