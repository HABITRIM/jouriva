/**
 * Phase 3 sample data — small, factual, clearly labeled (spec §26).
 *
 * - Countries: Morocco, Spain, France (structured Country + CountryTranslation)
 * - Cities: Marrakech, Fes, Casablanca (MA), Barcelona (ES), Paris (FR)
 * - 8 Destination entities with independent per-locale versions:
 *     published (en/es/ar mixes) + DRAFT versions + one PUBLISHED-but-thin
 *     version (Paris/AR) so the thin-content gate is demonstrable end-to-end.
 * - Editorial article ↔ destination links (PRIMARY/SECONDARY) on the existing
 *   sample articles; 3 topics linking articles AND destinations.
 * - NO fabricated prices, visa rules, transport details, opening hours,
 *   hotels, flights or statistics. Editorial text is common-knowledge and
 *   every version carries a visible "sample content" label.
 *
 * Idempotent: safe to re-run (upserts keyed on the schema's unique keys).
 * Run: npx tsx scripts/seed-destinations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Blocks = unknown;

const b = (type: string, props: Record<string, unknown>) => ({ type, ...props });

/** Standard sample editorial core (≥400 chars with intro — indexable). */
function sampleBlocks(label: string, overview: string, heading: string, bullets: string[]): Blocks {
  return [
    b("paragraph", { text: label }),
    b("paragraph", { text: overview }),
    b("heading", { level: 2, text: heading }),
    b("list", { ordered: false, items: bullets }),
    b("paragraph", {
      text: "JOURIVA note: this sample page exists to demonstrate the destination engine (structure, relationships, related content). Practical, time-sensitive details are intentionally left out — editors add them after verification against official sources.",
    }),
  ];
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@jouriva.test" } });
  if (!admin) throw new Error("Run scripts/create-admin.ts + scripts/seed.ts first (admin user missing).");

  // ── 1. Structured countries ────────────────────────────────────────────────
  const countries: Record<string, string> = {};
  for (const c of [
    { iso2: "MA", translations: [
      { locale: "en", name: "Morocco", slug: "morocco" },
      { locale: "es", name: "Marruecos", slug: "morocco" },
      { locale: "ar", name: "المغرب", slug: "morocco" },
    ] },
    { iso2: "ES", translations: [
      { locale: "en", name: "Spain", slug: "spain" },
      { locale: "es", name: "España", slug: "spain" },
      { locale: "ar", name: "إسبانيا", slug: "spain" },
    ] },
    { iso2: "FR", translations: [
      { locale: "en", name: "France", slug: "france" },
      { locale: "es", name: "Francia", slug: "france" },
      { locale: "ar", name: "فرنسا", slug: "france" },
    ] },
  ]) {
    const country = await prisma.country.upsert({ where: { iso2: c.iso2 }, update: {}, create: { iso2: c.iso2 } });
    countries[c.iso2] = country.id;
    for (const t of c.translations) {
      await prisma.countryTranslation.upsert({
        where: { countryId_locale: { countryId: country.id, locale: t.locale } },
        update: { name: t.name, slug: t.slug },
        create: { countryId: country.id, ...t },
      });
    }
  }

  // ── 2. Structured cities ───────────────────────────────────────────────────
  const cities: Record<string, string> = {};
  for (const ci of [
    { key: "marrakech", iso2: "MA", featured: true, translations: [
      { locale: "en", name: "Marrakech", slug: "marrakech" },
      { locale: "es", name: "Marrakech", slug: "marrakech" },
      { locale: "ar", name: "مراكش", slug: "marrakech" },
    ] },
    { key: "fes", iso2: "MA", featured: false, translations: [
      { locale: "en", name: "Fes", slug: "fes" },
      { locale: "es", name: "Fez", slug: "fes" },
      { locale: "ar", name: "فاس", slug: "fes" },
    ] },
    { key: "casablanca", iso2: "MA", featured: false, translations: [
      { locale: "en", name: "Casablanca", slug: "casablanca" },
      { locale: "es", name: "Casablanca", slug: "casablanca" },
      { locale: "ar", name: "الدار البيضاء", slug: "casablanca" },
    ] },
    { key: "barcelona", iso2: "ES", featured: false, translations: [
      { locale: "en", name: "Barcelona", slug: "barcelona" },
      { locale: "es", name: "Barcelona", slug: "barcelona" },
      { locale: "ar", name: "برشلونة", slug: "barcelona" },
    ] },
    { key: "paris", iso2: "FR", featured: false, translations: [
      { locale: "en", name: "Paris", slug: "paris" },
      { locale: "es", name: "París", slug: "paris" },
      { locale: "ar", name: "باريس", slug: "paris" },
    ] },
  ]) {
    let city = await prisma.city.findFirst({ where: { countryId: countries[ci.iso2], translations: { some: { locale: "en", slug: ci.key } } } });
    if (!city) city = await prisma.city.create({ data: { countryId: countries[ci.iso2], isFeatured: ci.featured } });
    cities[ci.key] = city.id;
    for (const t of ci.translations) {
      await prisma.cityTranslation.upsert({
        where: { cityId_locale: { cityId: city.id, locale: t.locale } },
        update: { name: t.name, slug: t.slug },
        create: { cityId: city.id, ...t },
      });
    }
  }

  // ── 3. Topics (cross-cutting: articles AND destinations) ──────────────────
  const topics: Record<string, string> = {};
  for (const tp of [
    { key: "family-travel", position: 1, translations: [
      { locale: "en", name: "Family travel", slug: "family-travel" },
      { locale: "es", name: "Viajes en familia", slug: "viajes-en-familia" },
      { locale: "ar", name: "السفر العائلي", slug: "family-travel" },
    ] },
    { key: "entry-requirements", position: 2, translations: [
      { locale: "en", name: "Entry requirements", slug: "entry-requirements" },
      { locale: "es", name: "Requisitos de entrada", slug: "requisitos-de-entrada" },
      { locale: "ar", name: "شروط الدخول", slug: "entry-requirements" },
    ] },
    { key: "major-events", position: 3, translations: [
      { locale: "en", name: "Major events", slug: "major-events" },
      { locale: "es", name: "Grandes eventos", slug: "grandes-eventos" },
      { locale: "ar", name: "الأحداث الكبرى", slug: "major-events" },
    ] },
  ]) {
    const topic = await prisma.topic.upsert({ where: { key: tp.key }, update: { position: tp.position }, create: { key: tp.key, position: tp.position } });
    topics[tp.key] = topic.id;
    for (const t of tp.translations) {
      await prisma.topicTranslation.upsert({
        where: { topicId_locale: { topicId: topic.id, locale: t.locale } },
        update: { name: t.name, slug: t.slug },
        create: { topicId: topic.id, ...t },
      });
    }
  }

  // ── 4. Destinations + independent per-locale versions ─────────────────────
  // editorNote explains WHY each version has its state (doc value).
  const SAMPLE_LABEL = {
    en: "SAMPLE CONTENT — This labeled sample demonstrates JOURIVA's structured destination engine. Common-knowledge overview only; verify all time-sensitive details with official sources.",
    es: "CONTENIDO DE MUESTRA — Esta página de ejemplo demuestra el motor de destinos de JOURIVA. Solo información de conocimiento general; verifica siempre los detalles con fuentes oficiales.",
    ar: "محتوى تجريبي — هذه الصفحة النموذجية توضح محرك الوجهات في JOURIVA. معلومات عامة معروفة فقط؛ تحققوا دائمًا من التفاصيل الحساسة للوقت عبر المصادر الرسمية.",
  } as const;

  interface Version {
    locale: "en" | "es" | "ar";
    name: string; slug: string; tagline: string;
    intro: string; heading: string; bullets: string[];
    status: "PUBLISHED" | "DRAFT";
    verification?: "VERIFIED" | "NEEDS_REVIEW" | null;
    thin?: boolean; // publish but keep under the quality threshold (noindex demo)
  }
  interface Dest {
    key: string; type: "COUNTRY" | "CITY"; iso2?: string; cityKey?: string;
    featured: boolean; sortOrder: number; heroKey?: string; faq?: boolean;
    versions: Version[];
  }

  const destinations: Dest[] = [
    {
      key: "morocco", type: "COUNTRY", iso2: "MA", featured: true, sortOrder: 1,
      versions: [
        { locale: "en", name: "Morocco", slug: "morocco", tagline: "Sample country hub — mountains, medinas and two coasts",
          intro: "Morocco sits at the north-western corner of Africa, a short sea crossing from Europe. Arabic and Amazigh are its official languages, and its imperial cities — including Fes and Marrakech — rank among the most visited in the region.",
          heading: "What this sample destination hub demonstrates",
          bullets: [
            "A DB-driven country hub assembled from structured data plus an editorial core.",
            "Child destinations (Marrakech, Fes, Casablanca in this sample) listed from real relationships.",
            "Related guides drawn from explicit article ↔ destination links — never guessed from slugs.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "Marruecos", slug: "morocco", tagline: "Hub de país de muestra — montañas, medinas y dos costas",
          intro: "Marruecos ocupa la esquina noroeste de África, a un corto paso marítimo de Europa. El árabe y el amazigh son sus lenguas oficiales, y sus ciudades imperiales —como Fez y Marrakech— figuran entre las más visitadas de la región.",
          heading: "Qué demuestra este hub de país de muestra",
          bullets: [
            "Un hub de país gestionado desde la base de datos, con datos estructurados y núcleo editorial.",
            "Destinos hijos (Marrakech, Fez y Casablanca en esta muestra) listados desde relaciones reales.",
            "Guías relacionadas a partir de enlaces editoriales explícitos artículo ↔ destino.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "المغرب", slug: "morocco", tagline: "صفحة بلد نموذجية — جبال ومدائن وساحلان",
          intro: "يقع المغرب في الزاوية الشمالية الغربية لإفريقيا، على مسافة قصيرة من أوروبا عبر البحر. العربية والأمازيغية لغات رسميتان، ومدنه الإمبراطورية — كفاس ومراكش — من أكثر المدن زيارة في المنطقة.",
          heading: "ما توضحه هذه الصفحة النموذجية",
          bullets: [
            "صفحة بلد تُدار من قاعدة البيانات ببيانات مهيكلة ونواة تحريرية.",
            "الوجهات الفرعية (مراكش وفاس والدار البيضاء في هذه العينة) تُعرض من علاقات حقيقية.",
            "أدلة ذات صلة مستمدة من روابط تحريرية صريحة بين المقالات والوجهات.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
      ],
    },
    {
      key: "spain", type: "COUNTRY", iso2: "ES", featured: false, sortOrder: 7,
      versions: [
        { locale: "en", name: "Spain", slug: "spain", tagline: "Sample country hub",
          intro: "Spain occupies most of the Iberian Peninsula in south-western Europe. Catalonia, whose capital is Barcelona, is one of its autonomous communities, and the country is among the most visited in the world.",
          heading: "What this sample destination hub demonstrates",
          bullets: [
            "A second country proving the destination pattern is not Morocco-specific.",
            "The World Cup planning guide links here as a SECONDARY destination link.",
            "Related guides come from explicit editorial links — never slug inference.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "España", slug: "spain", tagline: "Hub de país de muestra",
          intro: "España ocupa la mayor parte de la península ibérica, al suroeste de Europa. Cataluña, cuya capital es Barcelona, es una de sus comunidades autónomas, y el país figura entre los más visitados del mundo.",
          heading: "Qué demuestra este hub de país de muestra",
          bullets: [
            "Un segundo país demuestra que el patrón de destinos no es específico de Marruecos.",
            "La guía del Mundial enlaza aquí como destino SECUNDARIO.",
            "Las guías relacionadas provienen de enlaces editoriales explícitos.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
      ],
    },
    {
      key: "france", type: "COUNTRY", iso2: "FR", featured: false, sortOrder: 8,
      versions: [
        { locale: "en", name: "France", slug: "france", tagline: "Sample country hub",
          intro: "France, in western Europe, needs little introduction: its capital Paris anchors one of the world's most visited metropolitan areas, and the country's landmarks are heavily represented on the UNESCO World Heritage list.",
          heading: "What this sample destination hub demonstrates",
          bullets: [
            "A country hub with only its English version published — other locales are drafts.",
            "Per-locale independence: the city page for Paris follows the same pattern.",
            "Entry-requirements topic links articles AND destinations across countries.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "Francia", slug: "france", tagline: "Hub de país de muestra",
          intro: "Francia, en Europa occidental, hardly needs introduction: su capital, París, ancla una de las áreas metropolitanas más visitadas del mundo, y sus monumentos figuran de forma destacada en la lista del Patrimonio Mundial de la UNESCO.",
          heading: "Qué demuestra este hub de país de muestra",
          bullets: [
            "Un país con solo algunas versiones publicadas demuestra la independencia por idioma.",
            "La página de ciudad de París sigue el mismo patrón por idioma.",
            "El tema de requisitos de entrada relaciona artículos y destinos entre países.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "فرنسا", slug: "france", tagline: "صفحة بلد نموذجية",
          intro: "فرنسا في غرب أوروبا: عاصمتها باريس تضم واحدة من أكثر المناطق الحضرية زيارة في العالم، ومعالمها ممثلة بقوة في قائمة التراث العالمي لليونسكو.",
          heading: "ما توضحه هذه الصفحة النموذجية",
          bullets: [
            "بلد ببعض النسخ المنشورة يوضح الاستقلالية حسب اللغة.",
            "صفحة مدينة باريس تتبع النمط نفسه حسب اللغة.",
            "موضوع شروط الدخول يربط المقالات والوجهات عبر البلدان.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
      ],
    },
    {
      key: "marrakech", type: "CITY", iso2: "MA", cityKey: "marrakech", featured: true, sortOrder: 2, heroKey: "marrakech", faq: true,
      versions: [
        { locale: "en", name: "Marrakech", slug: "marrakech", tagline: "The red city — sample city destination page",
          intro: "Marrakech is one of Morocco's four imperial cities, known for its walled medina and the Jemaa el-Fnaa square, inscribed by UNESCO as part of the intangible heritage of humanity. This sample page shows the full city template.",
          heading: "How this sample city page is assembled",
          bullets: [
            "Hero, intro and blocks are the editorial core — written and reviewed by editors.",
            "The guides list below comes from articles explicitly linked to this destination.",
            "Related destinations are curated or same-country siblings — deterministic, never random.",
          ], status: "PUBLISHED", verification: "VERIFIED" },
        { locale: "es", name: "Marrakech", slug: "marrakech", tagline: "La ciudad roja — página de ciudad de muestra",
          intro: "Marrakech es una de las cuatro ciudades imperiales de Marruecos, conocida por su medina amurallada y la plaza de Jemaa el-Fnaa, incluida por la UNESCO en el patrimonio cultural inmaterial de la humanidad.",
          heading: "Cómo se ensambla esta página de muestra",
          bullets: [
            "Héroe, introducción y bloques forman el núcleo editorial, escrito y revisado por editores.",
            "La lista de guías proviene de artículos vinculados explícitamente a este destino.",
            "Los destinos relacionados son curados o hermanos del mismo país: deterministas, nunca aleatorios.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "مراكش", slug: "marrakech", tagline: "المدينة الحمراء — صفحة مدينة نموذجية",
          intro: "مراكش إحدى المدن الإمبراطورية الأربع في المغرب، تشتهر بمدينتها القديمة المسوّرة وساحة جامع الفنا المصنفة ضمن التراث الثقافي اللامادي للإنسانية من طرف اليونسكو.",
          heading: "كيف تُبنى هذه الصفحة النموذجية",
          bullets: [
            "الصورة والمقدمة والفقرات هي النواة التحريرية التي يكتبها المحررون ويراجعونها.",
            "قائمة الأدلة أدناه مستمدة من مقالات مرتبطة صراحة بهذه الوجهة.",
            "الوجهات ذات الصلة مختارة تحريريًا أو من نفس البلد — تحديدية لا عشوائية.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
      ],
    },
    {
      key: "fes", type: "CITY", iso2: "MA", cityKey: "fes", featured: false, sortOrder: 3,
      versions: [
        { locale: "en", name: "Fes", slug: "fes", tagline: "Sample city page — the medieval medina",
          intro: "Fes is home to one of the best-preserved medieval medinas in the world; the Fes el-Bali district is listed by UNESCO as a World Heritage site. This sample focuses on the structured data and editorial split.",
          heading: "What this sample demonstrates",
          bullets: [
            "A city destination anchored to a real City record (Fes, Morocco).",
            "Independent per-locale publishing: the Arabic version below is still a draft.",
            "Related guides come from the editorial article ↔ destination engine.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "Fez", slug: "fes", tagline: "Página de ciudad de muestra — la medina medieval",
          intro: "Fez alberga una de las medinas medievales mejor conservadas del mundo; el distrito de Fes el-Bali está declarado Patrimonio de la Humanidad por la UNESCO.",
          heading: "Qué demuestra esta muestra",
          bullets: [
            "Un destino ciudad anclado a un registro City real (Fez, Marruecos).",
            "Publicación independiente por idioma: la versión árabe sigue siendo borrador.",
            "Guías relacionadas desde el motor editorial artículo ↔ destino.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "فاس", slug: "fes", tagline: "صفحة مدينة نموذجية",
          intro: "فاس تقصير — نموذج لمسودة غير منشورة. Short draft copy kept deliberately incomplete.",
          heading: "Draft",
          bullets: ["This Arabic version stays a DRAFT to demonstrate published-only hreflang."],
          status: "DRAFT", verification: null },
      ],
    },
    {
      key: "casablanca", type: "CITY", iso2: "MA", cityKey: "casablanca", featured: false, sortOrder: 4,
      versions: [
        { locale: "en", name: "Casablanca", slug: "casablanca", tagline: "Sample city page — Morocco's largest city",
          intro: "Casablanca is Morocco's largest city and its economic capital, on the Atlantic coast. The Hassan II Mosque, whose minaret is among the tallest in the world, stands on a promontory over the ocean.",
          heading: "What this sample demonstrates",
          bullets: [
            "City destinations for the same country share sibling links automatically.",
            "The Marrakech family guide links here as a SECONDARY destination link.",
            "Verification status and the official-source warning render above the content.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "Casablanca", slug: "casablanca", tagline: "Página de ciudad de muestra — la ciudad más grande de Marruecos",
          intro: "Casablanca es la ciudad más grande de Marruecos y su capital económica, a orillas del Atlántico. La mezquita de Hassan II, con uno de los minaretes más altos del mundo, se alza sobre un promontorio frente al mar.",
          heading: "Qué demuestra esta muestra",
          bullets: [
            "Los destinos ciudad de un mismo país comparten enlaces de hermanos automáticamente.",
            "La guía familiar de Marrakech enlaza aquí como destino SECUNDARIO.",
            "El estado de verificación y el aviso de fuentes oficiales se muestran sobre el contenido.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "الدار البيضاء", slug: "casablanca", tagline: "صفحة مدينة نموذجية",
          intro: "مسودة تجريبية — Draft placeholder for the Arabic version of the Casablanca sample.",
          heading: "Draft",
          bullets: ["DRAFT version — demonstrates that each locale publishes independently."],
          status: "DRAFT", verification: null },
      ],
    },
    {
      key: "barcelona", type: "CITY", iso2: "ES", cityKey: "barcelona", featured: false, sortOrder: 5,
      versions: [
        { locale: "en", name: "Barcelona", slug: "barcelona", tagline: "Sample city page — Mediterranean, Gaudí and the Gothic Quarter",
          intro: "Barcelona, the capital of Catalonia, stretches between the Mediterranean and the Collserola hills. Several works of the architect Antoni Gaudí — including the Sagrada Família and Park Güell — are UNESCO World Heritage sites.",
          heading: "What this sample demonstrates",
          bullets: [
            "A non-Moroccan destination proves the pattern is country-agnostic.",
            "The World Cup planning guide links here as a SECONDARY destination.",
            "Curated related-destination links point to Paris in this sample.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "Barcelona", slug: "barcelona", tagline: "Página de ciudad de muestra — Mediterráneo, Gaudí y el Barrio Gótico",
          intro: "Barcelona, capital de Cataluña, se extiende entre el Mediterráneo y la sierra de Collserola. Varias obras del arquitecto Antoni Gaudí —como la Sagrada Família y el Park Güell— son Patrimonio de la Humanidad por la UNESCO.",
          heading: "Qué demuestra esta muestra",
          bullets: [
            "Un destino fuera de Marruecos demuestra que el patrón es independiente del país.",
            "La guía del Mundial enlaza aquí como destino SECUNDARIO.",
            "Los enlaces de destinos relacionados apuntan a París en esta muestra.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "ar", name: "برشلونة", slug: "barcelona", tagline: "صفحة مدينة نموذجية",
          intro: "مسودة تجريبية — Draft placeholder for the Arabic version of the Barcelona sample.",
          heading: "Draft",
          bullets: ["DRAFT version — demonstrates that each locale publishes independently."],
          status: "DRAFT", verification: null },
      ],
    },
    {
      key: "paris", type: "CITY", iso2: "FR", cityKey: "paris", featured: false, sortOrder: 6,
      versions: [
        { locale: "en", name: "Paris", slug: "paris", tagline: "Sample city page — full and indexable",
          intro: "Paris, France's capital, sits on the Seine. The banks of the river and the Eiffel Tower are among the city's UNESCO-listed landmarks, and the Louvre is one of the world's largest art museums.",
          heading: "What this sample demonstrates",
          bullets: [
            "A complete, quality-gated page in English only — other locales stay drafts.",
            "Per-locale independence: publishing French later changes nothing for this page.",
            "Curated related-destination links point to Barcelona in this sample.",
          ], status: "PUBLISHED", verification: "NEEDS_REVIEW" },
        { locale: "es", name: "París", slug: "paris", tagline: "Página de ciudad de muestra",
          intro: "París, capital de Francia, se asienta sobre el Sena. Los muelles del río y la Torre Eiffel figuran entre los monumentos declarados Patrimonio de la Humanidad por la UNESCO.",
          heading: "Qué demuestra esta muestra",
          bullets: ["Los destinos relacionados apuntan a Barcelona en esta muestra."],
          status: "DRAFT", verification: null },
        // Thin-content protection demo: PUBLISHED but below the quality gate →
        // exists + linkable, renders noindex, excluded from the sitemap.
        { locale: "ar", name: "باريس", slug: "paris", tagline: "صفحة نموذجية",
          intro: "محتوى قصير جدًا.",
          heading: "Thin sample",
          bullets: ["Published but below the quality gate — noindex demo."],
          status: "PUBLISHED", verification: "NEEDS_REVIEW", thin: true },
      ],
    },
  ];

  const heroAssets = await prisma.mediaAsset.findMany();
  const heroByKind = (kind: string) => heroAssets.find((a) => a.filename.startsWith(kind)) ?? null;

  const destIds: Record<string, string> = {};
  const translationIds: Record<string, string> = {}; // `${key}:${locale}`

  for (const d of destinations) {
    const anchorWhere = d.type === "COUNTRY"
      ? { type: "COUNTRY" as const, countryId: countries[d.iso2!] }
      : { type: "CITY" as const, cityId: cities[d.cityKey!] };
    // Cities are anchored to BOTH the City record and its Country (breadcrumbs,
    // siblings and relationship-derived routing depend on countryId).
    const linkData = {
      countryId: d.iso2 ? countries[d.iso2] : null,
      cityId: d.cityKey ? cities[d.cityKey] : null,
    };
    const heroId = d.heroKey ? heroByKind(d.heroKey)?.id ?? null : null;
    let dest = await prisma.destination.findFirst({ where: anchorWhere });
    if (dest) {
      dest = await prisma.destination.update({
        where: { id: dest.id },
        data: { ...linkData, isFeatured: d.featured, sortOrder: d.sortOrder, heroAssetId: heroId },
      });
    } else {
      dest = await prisma.destination.create({ data: { type: d.type, ...linkData, isFeatured: d.featured, sortOrder: d.sortOrder, heroAssetId: heroId } });
    }
    destIds[d.key] = dest.id;

    for (const v of d.versions) {
      const blocks = v.thin
        ? [b("paragraph", { text: v.intro }), b("heading", { level: 2, text: v.heading }), b("list", { ordered: false, items: v.bullets })]
        : sampleBlocks(SAMPLE_LABEL[v.locale], v.intro, v.heading, v.bullets);
      const meta = `Sample ${v.name} destination page on JOURIVA — demonstrates the structured destination engine with editorial overview, related guides and destinations. Verify details with official sources.`;
      const published = v.status === "PUBLISHED";
      const data = {
        name: v.name,
        slug: v.slug,
        tagline: v.tagline,
        description: v.intro,
        blocks: blocks as never,
        seoTitle: `${v.name} — Sample destination | JOURIVA`,
        metaDescription: meta,
        noindex: false,
        workflowStatus: v.status as "PUBLISHED" | "DRAFT",
        publishedAt: published ? new Date() : null,
        verificationStatus: (v.verification ?? null) as "VERIFIED" | "NEEDS_REVIEW" | null,
        lastVerifiedAt: v.verification ? new Date() : null,
        verifiedById: v.verification ? admin.id : null,
        verificationNotes: v.verification
          ? "Sample data: common-knowledge facts only (no prices, hours, transport or visa specifics). Editorial verification still recommended before promoting beyond sample status."
          : null,
        warningEnabled: published, // sample pages always carry the official-source warning
      };
      const tr = await prisma.destinationTranslation.upsert({
        where: { destinationId_locale: { destinationId: dest.id, locale: v.locale } },
        update: data,
        create: { destinationId: dest.id, locale: v.locale, ...data },
      });
      translationIds[`${d.key}:${v.locale}`] = tr.id;
    }

    // Gallery: single sample asset for Marrakech (reuses the Phase 2 media system)
    if (d.heroKey) {
      const hero = heroByKind(d.heroKey);
      if (hero) {
        await prisma.destinationMedia.upsert({
          where: { destinationId_assetId: { destinationId: dest.id, assetId: hero.id } },
          update: { position: 0 },
          create: { destinationId: dest.id, assetId: hero.id, position: 0 },
        });
      }
    }
  }

  // ── 5. FAQ for Marrakech (visible FAQ → FAQPage JSON-LD) — factual, meta ──
  const marrakechEn = translationIds["marrakech:en"];
  const marrakechTr = await prisma.destinationTranslation.findUnique({ where: { id: marrakechEn }, include: { faqGroup: true } });
  if (marrakechTr && !marrakechTr.faqGroupId) {
    const group = await prisma.faqGroup.create({ data: { ownerType: "Destination", ownerId: destIds["marrakech"] } });
    const faq = [
      { q: "Is this an official tourism website for Marrakech?", a: "No — this is a labeled sample page on JOURIVA demonstrating the destination engine. For official information, always use the city's and country's official tourism sources." },
      { q: "Is the medina of Marrakech a UNESCO World Heritage site?", a: "Yes — the Medina of Marrakech is inscribed on the UNESCO World Heritage list, and Jemaa el-Fnaa is recognised as intangible cultural heritage. Confirm current details with UNESCO's official listings." },
    ];
    for (let i = 0; i < faq.length; i++) {
      const item = await prisma.faqItem.create({ data: { groupId: group.id, position: i } });
      await prisma.faqItemTranslation.create({ data: { itemId: item.id, locale: "en", question: faq[i].q, answer: faq[i].a } });
    }
    await prisma.destinationTranslation.update({ where: { id: marrakechEn }, data: { faqGroupId: group.id } });
  }

  // ── 6. Editorial article ↔ destination links (explicit, PRIMARY/SECONDARY) ─
  const articles = {
    marrakech: await prisma.article.findFirst({ where: { translations: { some: { slug: "marrakech-with-kids-48-hours" } } } }),
    visa: await prisma.article.findFirst({ where: { translations: { some: { slug: "visa-free-countries-moroccan-passport" } } } }),
    worldcup: await prisma.article.findFirst({ where: { translations: { some: { slug: "world-cup-2030-moroccan-fans-planning-guide" } } } }),
  };
  const link = async (articleId: string, destId: string, role: "PRIMARY" | "SECONDARY", position: number) => {
    await prisma.articleDestination.upsert({
      where: { articleId_destinationId: { articleId, destinationId: destId } },
      update: { role, position },
      create: { articleId, destinationId: destId, role, position },
    });
  };
  if (articles.marrakech) {
    await link(articles.marrakech.id, destIds["marrakech"], "PRIMARY", 0);
    await link(articles.marrakech.id, destIds["morocco"], "SECONDARY", 1);
    await link(articles.marrakech.id, destIds["casablanca"], "SECONDARY", 2);
  }
  if (articles.visa) {
    await link(articles.visa.id, destIds["morocco"], "SECONDARY", 0);
    await link(articles.visa.id, destIds["spain"] ?? destIds["morocco"], "SECONDARY", 1);
  }
  if (articles.worldcup) {
    await link(articles.worldcup.id, destIds["morocco"], "SECONDARY", 0);
    await link(articles.worldcup.id, destIds["barcelona"], "SECONDARY", 1);
    await link(articles.worldcup.id, destIds["casablanca"], "SECONDARY", 2);
  }

  // ── 7. Topics relating articles AND destinations ──────────────────────────
  const rel = async (topicId: string, articleId?: string, destId?: string) => {
    if (articleId) await prisma.articleTopic.upsert({ where: { articleId_topicId: { articleId, topicId } }, update: {}, create: { articleId, topicId } });
    if (destId) await prisma.destinationTopic.upsert({ where: { destinationId_topicId: { destinationId: destId, topicId } }, update: {}, create: { destinationId: destId, topicId } });
  };
  await rel(topics["family-travel"], articles.marrakech?.id, destIds["marrakech"]);
  await rel(topics["family-travel"], undefined, destIds["casablanca"]);
  await rel(topics["entry-requirements"], articles.visa?.id, destIds["morocco"]);
  await rel(topics["entry-requirements"], undefined, destIds["spain"] ?? destIds["morocco"]);
  await rel(topics["entry-requirements"], undefined, destIds["france"] ?? destIds["morocco"]);
  await rel(topics["major-events"], articles.worldcup?.id, destIds["morocco"]);
  await rel(topics["major-events"], undefined, destIds["barcelona"]);

  // ── 8. Curated related-destination links (destination ↔ destination) ──────
  const curate = async (ownerKey: string, targets: string[]) => {
    const ownerId = translationIds[ownerKey];
    await prisma.contentLink.deleteMany({ where: { ownerDestinationTranslationId: ownerId } });
    for (let i = 0; i < targets.length; i++) {
      await prisma.contentLink.create({
        data: { ownerDestinationTranslationId: ownerId, anchorText: "Related destination", targetDestination: { connect: { id: destIds[targets[i]] } }, position: i },
      });
    }
  };
  await curate("marrakech:en", ["fes", "casablanca"]);
  await curate("barcelona:en", ["paris"]);
  await curate("paris:en", ["barcelona"]);

  const counts = {
    countries: await prisma.country.count(),
    cities: await prisma.city.count(),
    destinations: await prisma.destination.count(),
    destinationTranslations: await prisma.destinationTranslation.count(),
    published: await prisma.destinationTranslation.count({ where: { workflowStatus: "PUBLISHED" } }),
    articleDestinationLinks: await prisma.articleDestination.count(),
    topics: await prisma.topic.count(),
    curatedLinks: await prisma.contentLink.count({ where: { ownerDestinationTranslationId: { not: null } } }),
  };
  console.log("Phase 3 sample data seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
