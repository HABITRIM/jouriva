import { promoteDueScheduled } from "@/lib/cms/articles";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Scheduled-publication worker (spec §11): promotes due SCHEDULED articles.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 * Infrastructure dependency: call this endpoint every minute from the
 * platform scheduler (e.g. Vercel Cron / systemd timer) in production —
 * documented in docs/09-cms-architecture.md.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET not configured", { status: 503 });

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key") ?? "";
  if (provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const promoted = await promoteDueScheduled();
  for (const p of promoted) {
    revalidatePath(`/${p.locale}/guides/${p.slug}/`);
  }
  return Response.json({ ok: true, promoted: promoted.length, items: promoted });
}
