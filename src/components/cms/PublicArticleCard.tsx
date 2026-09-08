import Image from "next/image";
import { Link } from "@/i18n/navigation";

/** Public card for DB-backed articles (home, hubs, author pages). */
export function PublicArticleCard({
  article,
  locale,
  priority = false,
}: {
  article: { slug: string; title: string; excerpt: string | null; updatedAt: string | null; hero?: { url: string; alt?: string | null } | null };
  locale: string;
  priority?: boolean;
}) {
  const updated = article.updatedAt?.slice(0, 10);
  return (
    <article className="card-hover group relative flex h-full flex-col overflow-hidden rounded-xl border border-navy-100 bg-white">
      {article.hero && (
        <div className="relative aspect-[3/2] overflow-hidden bg-navy-50">
          <Image src={article.hero.url} alt={article.hero.alt || article.title} fill priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-bold leading-snug text-navy">
          <Link href={`/guides/${article.slug}/`} className="after:absolute after:inset-0 after:content-['']">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft" dir="auto">{article.excerpt}</p>}
        {updated && <p className="mt-auto pt-3 text-xs text-ink-soft">{updated}</p>}
      </div>
    </article>
  );
}
