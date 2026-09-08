import "server-only";
import { revalidatePath } from "next/cache";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/routing";

/**
 * Public-page cache invalidation (spec §11/§22/§24).
 * Public reads go through unstable_cache(tags: ["articles"]); every CMS
 * mutation that affects published content calls revalidateTag("articles")
 * plus the specific page paths — the public site stays static-first and
 * never queries PostgreSQL per request.
 */
export function revalidateArticlePublicPaths(
  locale: string,
  slug: string,
  opts?: { oldSlug?: string | null }
): void {
  const { revalidateTag } = require("next/cache") as typeof import("next/cache");
  revalidateTag("articles");

  revalidatePath(`/${locale}/`);
  revalidatePath(`/${locale}/guides/`);
  revalidatePath(`/${locale}/guides/${slug}/`);
  if (opts?.oldSlug && opts.oldSlug !== slug) {
    revalidatePath(`/${locale}/guides/${opts.oldSlug}/`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath(`/${locale}/rss.xml`);
  // Authors' public pages list their published articles
  revalidatePath(`/${locale}/authors/`, "layout");
  void DEFAULT_LOCALE;
  void LOCALES;
}
