import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import { sampleCities } from "@/content";
import { listPublishedArticles } from "@/lib/cms/public-queries";
import { DestinationCard, SectionHeader } from "@/components/cards";
import { PublicArticleCard } from "@/components/cms/PublicArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return buildMetadata({
    locale,
    path: "/",
    title: t("heroTitle"),
    description: t("heroDescription"),
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");

  // Latest published stories from the CMS (PUBLISHED + publishedAt ≤ now only)
  const latest = await listPublishedArticles(locale, { limit: 3 });

  return (
    <>
      <JsonLd data={webSiteSchema(locale)} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-star-motif border-b border-navy-100 bg-sand">
        <div className="container-jouriva grid items-center gap-8 py-10 md:grid-cols-2 md:py-14">
          <div>
            <p className="kicker">{t("heroKicker")}</p>
            <h1 className="font-display mt-2 text-4xl font-black leading-[1.08] text-navy sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {t("heroDescription")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/morocco/"
                className="rounded-full bg-terracotta px-6 py-3 text-sm font-bold text-white transition hover:bg-terracotta-dark"
              >
                {t("heroCtaPrimary")}
              </Link>
              <Link
                href="/quiz/"
                className="rounded-full border-2 border-navy px-6 py-3 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
              >
                {t("heroCtaSecondary")}
              </Link>
            </div>
          </div>
          <figure className="relative">
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-xl ring-1 ring-navy/10">
              <Image
                src="/images/hero-marrakech-family.jpg"
                alt={sampleCities[0].imageAlt[locale]}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs text-ink-soft">{t("heroImageCaption")}</figcaption>
          </figure>
        </div>
      </section>

      <div className="container-jouriva pt-8">
        <AdSlot placement="betweenSections" />
      </div>

      {/* ── Latest stories ───────────────────────────────────────────────── */}
      <section className="container-jouriva py-10" aria-labelledby="latest-title">
        <SectionHeader
          kicker={t("latestTitle")}
          title={t("latestTitle")}
          subtitle={t("latestSubtitle")}
          viewAllHref="/guides/"
        />
        <h2 id="latest-title" className="sr-only">
          {t("latestTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a, i) => (
            <PublicArticleCard
              key={a.translationId}
              locale={locale}
              priority={i === 0}
              article={{
                slug: a.slug,
                title: a.title,
                excerpt: a.excerpt,
                updatedAt: a.updatedAt,
                hero: a.heroImage ? { url: a.heroImage.url, alt: a.heroImage.alt } : null,
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Morocco highlights ───────────────────────────────────────────── */}
      <section className="border-y border-navy-100 bg-sand/60 py-10" aria-labelledby="morocco-title">
        <div className="container-jouriva">
          <SectionHeader
            kicker={nav("morocco")}
            title={t("moroccoTitle")}
            subtitle={t("moroccoSubtitle")}
            viewAllHref="/morocco/"
          />
          <h2 id="morocco-title" className="sr-only">
            {t("moroccoTitle")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sampleCities.map((city) => (
              <DestinationCard key={city.id} city={city} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* ── World travel ─────────────────────────────────────────────────── */}
      <section className="container-jouriva py-10" aria-labelledby="world-title">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <figure className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy/10 md:order-1">
            <Image
              src="/images/world-dolomites.jpg"
              alt={
                locale === "ar"
                  ? "مسافر يتطلع إلى وادٍ جبلي عند الفجر"
                  : locale === "es"
                    ? "Viajero contemplando un valle alpino al amanecer"
                    : "Traveler overlooking an alpine valley at dawn"
              }
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </figure>
          <div>
            <p className="kicker">{nav("world")}</p>
            <h2 id="world-title" className="font-display mt-1 text-2xl font-bold text-navy sm:text-3xl">
              {t("worldTitle")}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{t("worldSubtitle")}</p>
            <p className="mt-3 max-w-lg leading-relaxed text-ink-soft">
              {locale === "ar"
                ? "من جبال الألب إلى جزر جنوب شرق آسيا، نغطي العالم بنفس المنهجية: معلومات موثقة بتواريخها وأدلة كتبها متخصصون."
                : locale === "es"
                  ? "De los Alpes a las islas del sudeste asiático: cubrimos el mundo con el mismo método, información verificada y con fecha, y guías escritas por especialistas."
                  : "From the Alps to Southeast Asian islands: we cover the world with the same method — dated, verified information and guides written by specialists."}
            </p>
            <Link
              href="/world/"
              className="mt-4 inline-block rounded-full border-2 border-navy px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              {t("viewAll")} →
            </Link>
          </div>
        </div>
        <h2 className="sr-only">{t("worldTitle")}</h2>
      </section>

      {/* ── Navy band: Travel for Moroccans + Sports Travel ─────────────── */}
      <section className="navy-section bg-star-motif" aria-label={`${nav("travelForMoroccans")} + ${nav("sportsTravel")}`}>
        <div className="container-jouriva grid gap-10 py-12 md:grid-cols-2">
          <div>
            <p className="kicker">{nav("travelForMoroccans")}</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">{t("forMoroccansTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sand/75">{t("forMoroccansSubtitle")}</p>
            <ul className="mt-4 space-y-2.5">
              {latest.slice(1, 2).map((a) => (
                <li key={a.translationId}>
                  <Link
                    href={`/guides/${a.slug}/`}
                    className="font-display block rounded-xl bg-white/5 p-4 text-lg font-bold text-sand ring-1 ring-white/15 transition hover:bg-white/10"
                  >
                    {a.title} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/travel-for-moroccans/" className="mt-4 inline-block text-sm font-bold text-terracotta-bright hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
          <div>
            <p className="kicker">{nav("sportsTravel")}</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">{t("sportsTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sand/75">{t("sportsSubtitle")}</p>
            <ul className="mt-4 space-y-2.5">
              {latest.slice(2, 3).map((a) => (
                <li key={a.translationId}>
                  <Link
                    href={`/guides/${a.slug}/`}
                    className="font-display block rounded-xl bg-white/5 p-4 text-lg font-bold text-sand ring-1 ring-white/15 transition hover:bg-white/10"
                  >
                    {a.title} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/sports-travel/" className="mt-4 inline-block text-sm font-bold text-terracotta-bright hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Study abroad ─────────────────────────────────────────────────── */}
      <section className="container-jouriva py-10" aria-labelledby="study-title">
        <SectionHeader kicker={nav("studyAbroad")} title={t("studyTitle")} subtitle={t("studySubtitle")} viewAllHref="/study-abroad/" />
        <h2 id="study-title" className="sr-only">
          {t("studyTitle")}
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {["Spain", "France", "Germany", "UK", "Turkey", "China", "Malaysia", "Canada"].map((c) => (
            <span
              key={c}
              className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy"
            >
              {locale === "ar" ? { Spain: "إسبانيا", France: "فرنسا", Germany: "ألمانيا", UK: "المملكة المتحدة", Turkey: "تركيا", China: "الصين", Malaysia: "ماليزيا", Canada: "كندا" }[c] : locale === "es" ? { Spain: "España", France: "Francia", Germany: "Alemania", UK: "Reino Unido", Turkey: "Turquía", China: "China", Malaysia: "Malasia", Canada: "Canadá" }[c] : c}
            </span>
          ))}
        </div>
      </section>

      {/* ── Deals teaser ─────────────────────────────────────────────────── */}
      <section className="border-y border-navy-100 bg-sand/60 py-10" aria-labelledby="deals-title">
        <div className="container-jouriva">
          <SectionHeader kicker={nav("deals")} title={t("dealsTitle")} subtitle={t("dealsSubtitle")} viewAllHref="/deals/" />
          <h2 id="deals-title" className="sr-only">
            {t("dealsTitle")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { en: "Flights", es: "Vuelos", ar: "الطيران" },
              { en: "Hotels", es: "Hoteles", ar: "الفنادق" },
              { en: "Tours", es: "Tours", ar: "الجولات" },
            ].map((v) => (
              <div key={v.en} className="rounded-xl border border-navy-100 bg-white p-5">
                <p className="font-display text-lg font-bold text-navy">
                  {locale === "ar" ? v.ar : locale === "es" ? v.es : v.en}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{common("comingSoon")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quiz banner ──────────────────────────────────────────────────── */}
      <section className="container-jouriva py-10">
        <div className="rounded-2xl border-2 border-terracotta/30 bg-terracotta-soft p-8 text-center sm:p-10">
          <p className="kicker">{nav("quiz")}</p>
          <h2 className="font-display mx-auto mt-1 max-w-xl text-2xl font-bold text-navy sm:text-3xl">
            {locale === "ar" ? "اعثر على وجهتك القادمة" : locale === "es" ? "Encuentra tu próximo destino" : "Find your next destination"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{common("comingSoon")}</p>
          <Link
            href="/quiz/"
            className="mt-4 inline-block rounded-full bg-terracotta px-6 py-3 text-sm font-bold text-white transition hover:bg-terracotta-dark"
          >
            {t("heroCtaSecondary")}
          </Link>
        </div>
      </section>

      {/* ── Editorial promise ────────────────────────────────────────────── */}
      <section className="container-jouriva pb-14" aria-labelledby="promise-title">
        <div className="max-w-3xl">
          <h2 id="promise-title" className="font-display text-xl font-bold text-navy">
            {t("editorialPromiseTitle")}
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{t("editorialPromise")}</p>
        </div>
      </section>

      <AdSlot placement="mobileSticky" />
    </>
  );
}
