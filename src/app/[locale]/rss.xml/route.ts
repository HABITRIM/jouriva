import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/config";
import { publishedForRss } from "@/lib/cms/public-queries";

export const dynamic = "force-dynamic";

/**
 * RSS 2.0 feed per locale (/{locale}/rss.xml) — DB-backed: PUBLISHED +
 * publishedAt ≤ now only. Freshness: dynamic route so publish/unpublish is
 * reflected immediately (spec §11/§22).
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const articles = await publishedForRss(locale, 30);
  const items = articles
    .map((a) => {
      const url = `${SITE.url}/${locale}/guides/${a.slug}/`;
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.excerpt ?? "")}</description>
      ${a.authorName ? `<author>editorial@jouriva.com (${escapeXml(a.authorName)})</author>` : ""}
      <pubDate>${new Date(a.publishedAt ?? a.updatedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${SITE.name} — ${t("latestTitle")}`)}</title>
    <link>${SITE.url}/${locale}/</link>
    <description>${escapeXml(t("latestSubtitle"))}</description>
    <language>${locale}</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
