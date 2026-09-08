import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { publishedByAuthor } from "@/lib/cms/public-queries";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/config";

export const revalidate = 300;

/** Public author profile (spec §13) — SEO-ready, Person schema, published
 * articles only. Real attribution; "By Admin" does not exist. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await publishedByAuthor(locale, slug);
  if (!data) return { robots: { index: false } };
  const tr = data.author.translations.find((t) => t.locale === locale) ?? data.author.translations.find((t) => t.locale === "en");
  return buildMetadata({
    locale: locale as "en",
    path: `/authors/${slug}/`,
    title: tr?.role ? `${data.author.name} — ${tr.role}` : data.author.name,
    description: tr?.biography?.slice(0, 155) ?? `Articles by ${data.author.name} on JOURIVA.`,
  });
}

export default async function AuthorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await publishedByAuthor(locale, slug);
  if (!data) notFound();

  const tr = data.author.translations.find((t) => t.locale === locale) ?? data.author.translations.find((t) => t.locale === "en");
  const labels = {
    articles: locale === "ar" ? "مقالات منشورة" : locale === "es" ? "Artículos publicados" : "Published articles",
    by: locale === "ar" ? "بقلم" : locale === "es" ? "Por" : "By",
  };

  return (
    <div className="container-jouriva py-8">
      <Breadcrumbs items={[{ name: data.author.name }]} />

      <section className="flex flex-wrap items-start gap-6">
        {data.author.photo ? (
          <Image src={data.author.photo.url} alt="" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-full bg-navy font-display text-2xl font-bold text-sand">
            {data.author.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
        )}
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-black text-navy">{data.author.name}</h1>
          {tr?.role && <p className="mt-1 font-semibold text-terracotta-ink">{tr.role}</p>}
          {tr?.biography && <p className="mt-3 leading-relaxed text-ink-soft" dir="auto">{tr.biography}</p>}
          {tr && tr.expertise.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              <span className="font-semibold">{locale === "ar" ? "التخصصات" : locale === "es" ? "Especialidades" : "Expertise"}:</span>{" "}
              {tr.expertise.join(" · ")}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="author-articles-h" className="mt-10">
        <h2 id="author-articles-h" className="font-display text-2xl font-bold text-navy">{labels.articles}</h2>
        <ul className="mt-4 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {data.articles.map((a) => (
            <li key={a.slug} className="p-4">
              <a href={`/guides/${a.slug}/`} className="font-display text-lg font-bold text-navy hover:text-terracotta-ink hover:underline">
                {a.title}
              </a>
              <p className="mt-1 text-sm text-ink-soft" dir="auto">{a.excerpt}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 10) : ""} · {labels.by} {data.author.name}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: data.author.name,
            url: absoluteUrl(locale as "en", `/authors/${slug}/`),
            ...(data.author.photo ? { image: `${SITE.url}${data.author.photo.url}` } : {}),
            ...(tr?.biography ? { description: tr.biography } : {}),
            worksFor: { "@type": "Organization", name: SITE.name },
          },
        }}
      />
    </div>
  );
}
