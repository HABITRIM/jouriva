import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { articlesForTopic } from "@/lib/cms/related";
import { PublicArticleCard } from "@/components/cms/PublicArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const dynamicParams = true;

/**
 * Topic article lists (Phase 3, spec §11): editorially controlled topics,
 * each with its own listing of published articles. noindex when the topic
 * has no published articles (thin-content protection, spec §15).
 */

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: Locale; slug: string }>;
}

async function loadTopic(locale: string, slug: string) {
  return prisma.topicTranslation.findFirst({
    where: { locale, slug, topic: { isActive: true } },
    include: { topic: { select: { id: true, isActive: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const topic = await loadTopic(locale, slug).catch(() => null);
  if (!topic) return {};
  const articles = await articlesForTopic(topic.topicId, locale, 24);
  return buildMetadata({
    locale,
    path: `/topics/${slug}/`,
    title: topic.name,
    description: `${topic.name} — published articles, guides and updates on JOURIVA.`,
    // Thin gate: no published articles → keep out of the index
    noIndex: articles.length === 0,
  });
}

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const topic = await loadTopic(locale, slug);
  if (!topic) notFound();
  const articles = await articlesForTopic(topic.topicId, locale, 24);
  const labels = {
    title: locale === "ar" ? "موضوع" : locale === "es" ? "Tema" : "Topic",
    empty: locale === "ar" ? "لا مقالات منشورة في هذا الموضوع بعد." : locale === "es" ? "Todavía no hay artículos publicados en este tema." : "No published articles in this topic yet.",
  };

  return (
    <div className="container-jouriva py-8">
      <Breadcrumbs items={[{ name: labels.title }, { name: topic.name }]} />
      <p className="kicker">{labels.title}</p>
      <h1 className="font-display mt-2 text-3xl font-black text-navy sm:text-4xl">{topic.name}</h1>

      {articles.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-navy-100 p-10 text-center text-ink-soft">{labels.empty}</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <PublicArticleCard
              key={a.slug}
              locale={locale}
              priority={i === 0}
              article={{ slug: a.slug, title: a.title, excerpt: a.excerpt, updatedAt: a.updatedAt, hero: a.heroUrl ? { url: a.heroUrl, alt: a.heroAlt } : null }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
