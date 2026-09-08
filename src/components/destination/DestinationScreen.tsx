import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { VerificationBadge, VerificationWarning } from "@/components/Verification";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { absoluteUrl } from "@/lib/seo";
import { BlocksRenderer } from "@/components/cms/BlocksRenderer";
import { PublicArticleCard } from "@/components/cms/PublicArticleCard";
import type { PublicDestination } from "@/lib/cms/public-destinations";
import type { RelatedArticleCard } from "@/lib/cms/related";

const TYPE_LABEL: Record<string, { en: string; es: string; ar: string }> = {
  COUNTRY: { en: "Country", es: "País", ar: "بلد" },
  CITY: { en: "Destination", es: "Destino", ar: "وجهة" },
  REGION: { en: "Region", es: "Región", ar: "منطقة" },
  ATTRACTION: { en: "Attraction", es: "Atracción", ar: "معلم" },
  VENUE: { en: "Venue", es: "Recinto", ar: "مكان" },
};

/**
 * Reusable destination screen (spec §9/§10): hybrid architecture — structured
 * entity + editorial core + dynamically related content. Only available
 * information is rendered; nothing is fabricated (spec §25).
 */
export function DestinationScreen({
  destination,
  relatedArticles,
  locale,
}: {
  destination: PublicDestination;
  relatedArticles: RelatedArticleCard[];
  locale: string;
}) {
  const d = destination;
  const L = (x: { en: string; es: string; ar: string }) => (locale === "ar" ? x.ar : locale === "es" ? x.es : x.en);
  const breadcrumbs = [
    ...(d.parent ? [{ name: d.parent.name, href: d.parent.path }] : []),
    { name: d.name },
  ];

  return (
    <div className="container-jouriva py-8">
      <Breadcrumbs items={breadcrumbs} />

      {d.hero && (
        <figure className="relative mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy/10">
          <Image src={d.hero.url} alt={d.hero.alt || d.name} fill priority sizes="(max-width: 1024px) 100vw, 1152px" className="object-cover" />
          {(d.hero.credit || d.hero.aiGenerated) && (
            <figcaption className="absolute bottom-2 end-2 rounded-full bg-navy/70 px-3 py-1 text-xs text-white">
              {d.hero.credit}
              {d.hero.aiGenerated ? " · AI-generated image" : ""}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mt-6 max-w-3xl">
        <p className="kicker">{L(TYPE_LABEL[d.type] ?? TYPE_LABEL.CITY)}</p>
        <h1 className="font-display mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl">{d.name}</h1>
        {d.tagline && <p className="font-display mt-2 text-xl text-terracotta-ink" dir="auto">{d.tagline}</p>}
        {d.intro && <p className="mt-4 text-lg leading-relaxed text-ink-soft" dir="auto">{d.intro}</p>}

        {(d.verificationStatus || d.lastVerifiedAt) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {d.verificationStatus && d.lastVerifiedAt && (
              <VerificationBadge
                info={{
                  status:
                    d.verificationStatus === "VERIFIED"
                      ? "verified"
                      : d.verificationStatus === "NEEDS_REVIEW"
                        ? "needsReview"
                        : d.verificationStatus === "OUTDATED"
                          ? "outdated"
                          : "archived",
                  lastVerified: d.lastVerifiedAt.slice(0, 10),
                }}
              />
            )}
          </div>
        )}
        {d.warningEnabled && (
          <div className="mt-4">
            <VerificationWarning />
          </div>
        )}
      </div>

      {d.blocks.length > 0 && (
        <div className="mx-auto mt-4 max-w-3xl">
          <BlocksRenderer blocks={d.blocks} assets={{}} />
        </div>
      )}

      {d.gallery.length > 0 && (
        <section aria-labelledby="gallery-h" className="mt-10">
          <h2 id="gallery-h" className="font-display text-xl font-bold text-navy">{L({ en: "Gallery", es: "Galería", ar: "معرض الصور" })}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {d.gallery.map((g) => (
              <figure key={g.url} className="overflow-hidden rounded-xl border border-navy-100">
                <div className="relative aspect-[4/3]">
                  <Image src={g.url} alt={g.alt || d.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
                </div>
                {(g.credit || g.aiGenerated) && (
                  <figcaption className="p-2 text-xs text-ink-soft">
                    {g.credit}
                    {g.aiGenerated ? " · AI-generated image" : ""}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {d.children.length > 0 && (
        <section aria-labelledby="children-h" className="mt-10">
          <h2 id="children-h" className="font-display text-2xl font-bold text-navy">
            {L({ en: "Destinations", es: "Destinos", ar: "الوجهات" })}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {d.children.map((c) => (
              <Link key={c.destinationId} href={c.path} className="card-hover group overflow-hidden rounded-xl border border-navy-100 bg-white">
                {c.hero && (
                  <div className="relative aspect-[3/2]">
                    <Image src={c.hero} alt={c.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold text-navy group-hover:text-terracotta-ink">{c.name}</h3>
                  {c.tagline && <p className="mt-1 line-clamp-2 text-sm text-ink-soft" dir="auto">{c.tagline}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {relatedArticles.length > 0 && (
        <section aria-labelledby="related-h" className="mt-10">
          <h2 id="related-h" className="font-display text-2xl font-bold text-navy">
            {L({ en: "Related articles & guides", es: "Artículos y guías relacionadas", ar: "مقالات وأدلة ذات صلة" })}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((a) => (
              <PublicArticleCard
                key={a.slug}
                locale={locale}
                article={{ slug: a.slug, title: a.title, excerpt: a.excerpt, updatedAt: a.updatedAt, hero: a.heroUrl ? { url: a.heroUrl, alt: a.heroAlt } : null }}
              />
            ))}
          </div>
        </section>
      )}

      {d.relatedDestinations.length > 0 && (
        <section aria-labelledby="reldest-h" className="mt-10">
          <h2 id="reldest-h" className="font-display text-2xl font-bold text-navy">
            {L({ en: "Nearby & related destinations", es: "Destinos cercanos y relacionados", ar: "وجهات قريبة وذات صلة" })}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {d.relatedDestinations.map((r) => (
              <Link key={r.destinationId} href={r.path} className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-terracotta">
                {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {d.faq.length > 0 && (
        <div className="mx-auto mt-10 max-w-3xl">
          <Faq items={d.faq} />
        </div>
      )}

      <JsonLd
        data={breadcrumbSchema(
          breadcrumbs.map((b) => ({ name: b.name, url: b.href ? absoluteUrl(locale as "en", b.href) : absoluteUrl(locale as "en", d.path) }))
        )}
      />
      {d.faq.length > 0 && <JsonLd data={faqSchema(d.faq)} />}
    </div>
  );
}
