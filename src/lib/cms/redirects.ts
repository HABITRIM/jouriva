import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { ValidationError } from "@/lib/cms/errors";

/**
 * Redirect management (spec §19): per-locale, 301, loop-safe.
 * Applied by src/middleware.ts (TTL-cached); changes also revalidate nothing
 * public (middleware consults the DB via its own short cache).
 */

export async function createRedirect(
  user: SessionUser,
  input: { locale: string; sourcePath: string; destinationPath: string; statusCode?: number }
): Promise<void> {
  const source = normalize(input.sourcePath);
  const dest = normalize(input.destinationPath);
  if (!source || !dest) throw new ValidationError("Source and destination paths are required");
  if (!/^\/[a-z0-9\-/]*$/.test(source) || !/^\/[a-z0-9\-/]*$/.test(dest)) {
    throw new ValidationError("Paths must be internal, starting with / (letters, numbers, hyphens)");
  }
  if (source === dest) throw new ValidationError("A redirect cannot point to itself");

  // Loop prevention: follow the chain from the destination; it must never
  // return to the source (and chains are capped).
  let cursor = dest;
  for (let hops = 0; hops < 10; hops++) {
    if (cursor === source) throw new ValidationError("This redirect would create a loop");
    const next = await prisma.redirect.findUnique({
      where: { locale_sourcePath: { locale: input.locale, sourcePath: cursor } },
    });
    if (!next || !next.active) break;
    cursor = next.destinationPath;
  }

  await prisma.redirect.upsert({
    where: { locale_sourcePath: { locale: input.locale, sourcePath: source } },
    create: {
      locale: input.locale,
      sourcePath: source,
      destinationPath: dest,
      statusCode: input.statusCode ?? 301,
      createdById: user.id,
    },
    update: { destinationPath: dest, statusCode: input.statusCode ?? 301, active: true, createdById: user.id },
  });
}

export async function setRedirectActive(user: SessionUser, id: string, active: boolean): Promise<void> {
  void user;
  await prisma.redirect.update({ where: { id }, data: { active } });
}

export async function deleteRedirect(user: SessionUser, id: string): Promise<void> {
  void user;
  await prisma.redirect.delete({ where: { id } });
}

/** Called by the article service when a live slug changes. Returns true when
 * a redirect is now in place (creates or updates the mapping). */
export async function ensureRedirectForSlugChange(
  user: SessionUser,
  locale: string,
  sourcePath: string,
  destinationPath: string
): Promise<boolean> {
  try {
    await createRedirect(user, { locale, sourcePath, destinationPath, statusCode: 301 });
    return true;
  } catch {
    // If mapping would loop (e.g. slug changed back), drop any stale mapping.
    await prisma.redirect.updateMany({
      where: { locale, sourcePath: normalize(sourcePath) ?? "" },
      data: { active: false },
    });
    return false;
  }
}

function normalize(p: string): string | null {
  const trimmed = p.trim();
  if (!trimmed) return null;
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailingDouble = withLeading.replace(/\/{2,}/g, "/");
  return withoutTrailingDouble.length > 1 ? withoutTrailingDouble.replace(/\/$/, "") || "/" : withLeading;
}

export function normalizeRedirectPath(p: string): string | null {
  return normalize(p);
}

/** Uncached single lookup for the instant fallback path (guides page 404
 * path) — complements the middleware's TTL cache so slug-change 301s are
 * effective immediately, not just within the cache TTL. */
export async function findActiveRedirect(locale: string, sourcePath: string): Promise<{ destinationPath: string; statusCode: number } | null> {
  const normalized = normalize(sourcePath);
  if (!normalized) return null;
  const rows = await prisma.redirect.findMany({
    where: { locale, active: true },
    select: { sourcePath: true, destinationPath: true, statusCode: true },
  });
  const hit = rows.find((r) => r.sourcePath.replace(/\/+$/, "") === normalized.replace(/\/+$/, ""));
  if (!hit || hit.destinationPath.replace(/\/+$/, "") === normalized.replace(/\/+$/, "")) return null; // loop guard
  return { destinationPath: hit.destinationPath, statusCode: hit.statusCode };
}
