import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getAuthor } from "@/content/authors";
import type { SampleArticle, SampleCity, HubTopic } from "@/content/types";

/** Kicker + title header for editorial sections. */
export function SectionHeader({
  kicker,
  title,
  subtitle,
  viewAllHref,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}) {
  const t = useTranslations("home");
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="font-display mt-1 text-2xl font-bold text-navy sm:text-[1.7rem]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-bold text-terracotta-ink underline-offset-4 transition hover:text-terracotta-dark hover:underline"
        >
          {t("viewAll")} →
        </Link>
      )}
    </div>
  );
}

/** Editorial article card — whole card clickable via stretched link, one real link. */
export function ArticleCard({
  article,
  locale,
  priority = false,
}: {
  article: SampleArticle;
  locale: string;
  priority?: boolean;
}) {
  const t = useTranslations("common");
  const tr = article.translations[locale as keyof typeof article.translations];
  const author = getAuthor(article.authorId);
  const authorTr = author.translations[locale as keyof typeof author.translations];

  return (
    <article className="card-hover group relative flex h-full flex-col overflow-hidden rounded-xl border border-navy-100 bg-white">
      <div className="relative aspect-[3/2] overflow-hidden bg-navy-50">
        <Image
          src={article.image}
          alt={article.imageAlt[locale as keyof typeof article.imageAlt]}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          priority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-bold leading-snug text-navy">
          <Link href={`/guides/${tr.slug}/`} className="after:absolute after:inset-0 after:content-['']">
            {tr.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{tr.excerpt}</p>
        <p className="mt-auto pt-3 text-xs text-ink-soft">
          {t("byAuthor", { author: author.name })} · {t("updated", { date: article.updatedAt })}
        </p>
      </div>
    </article>
  );
}

/** Destination card for city hubs. */
export function DestinationCard({ city, locale }: { city: SampleCity; locale: string }) {
  const tr = city.translations[locale as keyof typeof city.translations];
  return (
    <article className="card-hover group relative flex h-full flex-col overflow-hidden rounded-xl border border-navy-100 bg-white">
      <div className="relative aspect-[3/2] overflow-hidden bg-navy-50">
        <Image
          src={city.image}
          alt={city.imageAlt[locale as keyof typeof city.imageAlt]}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-terracotta-ink">{tr.region}</p>
        <h3 className="font-display mt-1 text-xl font-bold text-navy">
          <Link href={`/morocco/${city.slug}/`} className="after:absolute after:inset-0 after:content-['']">
            {tr.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{tr.headline}</p>
      </div>
    </article>
  );
}

/** Topic chip used on hub pages (links only to existing Phase 1 routes). */
export function TopicChip({ topic, locale }: { topic: HubTopic; locale: string }) {
  const label = topic.label[locale as keyof typeof topic.label];
  const inner = (
    <span className="inline-block rounded-full border border-navy-100 bg-white px-3.5 py-1.5 text-sm font-medium text-navy transition group-hover:border-terracotta group-hover:text-terracotta-ink">
      {label}
    </span>
  );
  if (topic.href) {
    return (
      <li>
        <Link href={topic.href} className="group inline-block">
          {inner}
        </Link>
      </li>
    );
  }
  return <li className="group inline-block">{inner}</li>;
}
