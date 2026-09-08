import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * Serves media through an opaque key — original filenames/paths are never
 * exposed (spec §14). Immutable caching; 404 for unknown/archived keys.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { storageKey: key } });
  if (!asset || asset.archived) {
    return new Response("Not found", { status: 404 });
  }
  const data = await storage().get(asset.storageKey);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
