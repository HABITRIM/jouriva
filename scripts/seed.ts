/**
 * Seeds the JOURIVA CMS with its initial editorial state.
 *
 * REAL persistence only: images are ingested through the SAME storage
 * contract as the media library — the configured StorageProvider
 * (`local` driver in development, S3-compatible object storage such as
 * Supabase in staging via MEDIA_STORAGE_PROVIDER=s3) — opaque provider
 * keys, provider-generated public URLs. Users get real scrypt password
 * hashes, articles are PUBLISHED with audit transitions.
 *
 * Dev credentials (documented in docs/12-auth-and-permissions.md — dev only):
 *   admin@jouriva.test / editor@jouriva.test / author@jouriva.test /
 *   reviewer@jouriva.test   — password: jouriva-dev-2026
 *
 * Run: NODE_OPTIONS=--conditions=react-server npx tsx scripts/seed.ts
 * (the react-server condition lets tsx resolve the real `server-only`
 * marker exactly as Next.js does inside the app build)
 * Idempotent: re-running skips existing rows (natural keys).
 */
import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { storage } from "../src/lib/storage";
import sharp from "sharp";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${scryptSync(password, salt, 64, { N, r, p }).toString("hex")}`;
}

function b(type: string, extra: Record<string, unknown>): Record<string, unknown> {
  return { type, ...extra };
}

async function ingestImage(file: string, alt: { en: string; es: string; ar: string }) {
  const existing = await prisma.mediaAsset.findFirst({ where: { filename: file, credit: "AI-generated placeholder photography" } });
  if (existing) return existing;

  const buf = await readFile(path.join(process.cwd(), "public", "images", file));
  const meta = await sharp(buf).metadata();
  const ext = path.extname(file).toLowerCase() || ".jpg";
  const mime = `image/${ext === ".jpg" || ext === ".jpeg" ? "jpeg" : ext.replace(".", "")}`;

  // Persist through the configured StorageProvider (MIGRATION-STEP-4B-H1):
  // `local` driver in development, S3-compatible object storage in staging.
  // The provider generates the opaque key and the public URL — the seed
  // never touches MEDIA_STORAGE_DIR and never constructs /media/<key>.
  const stored = await storage().put(buf, mime);

  return prisma.mediaAsset.create({
    data: {
      storageKey: stored.key,
      url: stored.url,
      filename: file,
      mimeType: mime,
      sizeBytes: buf.length,
      width: meta.width ?? null,
      height: meta.height ?? null,
      credit: "AI-generated placeholder photography",
      license: "AI-generated placeholder (to be replaced by licensed originals)",
      aiGenerated: true,
      translations: { create: [
        { locale: "en", alt: alt.en },
        { locale: "es", alt: alt.es },
        { locale: "ar", alt: alt.ar },
      ] },
    },
  });
}

async function main() {
  console.log("· Seeding users…");
  const pw = process.env.SEED_PASSWORD ?? "jouriva-dev-2026";
  const users: Record<string, { id: string }> = {};
  for (const [email, name, role] of [
    ["admin@jouriva.test", "Yasmine El Amrani", "ADMIN"],
    ["editor@jouriva.test", "Karim Bouzid", "EDITOR"],
    ["author@jouriva.test", "Salma Benali", "AUTHOR"],
    ["reviewer@jouriva.test", "Omar Tazi", "REVIEWER"],
  ] as const) {
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role, passwordHash: hashPassword(pw), isActive: true },
    });
    users[role] = u;
  }

  console.log("· Seeding author profile…");
  const author = await prisma.author.upsert({
    where: { slug: "salma-benali" },
    update: {},
    create: {
      key: "salma-benali",
      slug: "salma-benali",
      name: "Salma Benali",
      email: "salma@jouriva.test",
      isActive: true,
      translations: { create: [
        { locale: "en", role: "Travel writer — Morocco & family", biography: "Salma covers Morocco for JOURIVA: family itineraries, city guides and practical logistics, always verified on the ground.", expertise: ["Morocco", "Family travel", "Marrakech"] },
        { locale: "es", role: "Redactora de viajes — Marruecos y familia", biography: "Salma escribe sobre Marruecos en JOURIVA: itinerarios familiares, guías de ciudad y logística práctica, siempre verificados in situ.", expertise: ["Marruecos", "Viajes en familia", "Marrakech"] },
        { locale: "ar", role: "كاتبة رحلات — المغرب والسفر العائلي", biography: "تغطي سلمى المغرب في JOURIVA: برامج عائلية وأدلة مدن ولوجستيات عملية، تم التحقق منها ميدانيًا.", expertise: ["المغرب", "السفر العائلي", "مراكش"] },
      ] },
    },
  });
  await prisma.user.update({ where: { id: users.AUTHOR.id }, data: { authorProfileId: author.id } });

  console.log("· Seeding categories…");
  const catDefs = [
    { key: "guides.general", slug: "guides", en: "Guides", es: "Guías", ar: "أدلة" },
    { key: "morocco.family", slug: "family-travel", en: "Family travel", es: "Viajes en familia", ar: "safar-aili" },
    { key: "travel-for-moroccans.visa-free", slug: "visa-free", en: "Visa-free travel", es: "Viajar sin visado", ar: "bila-tashira" },
    { key: "sports-travel.world-cup", slug: "world-cup", en: "World Cup", es: "Mundial", ar: "kass-alalam" },
  ];
  const categories: Record<string, string> = {};
  for (const c of catDefs) {
    const cat = await prisma.category.upsert({
      where: { key: c.key },
      update: {},
      create: { key: c.key, translations: { create: [
        { locale: "en", name: c.en, slug: c.slug }, { locale: "es", name: c.es, slug: c.slug }, { locale: "ar", name: c.ar, slug: c.slug },
      ] } },
    });
    categories[c.key] = cat.id;
  }

  console.log("· Ingesting media through the storage contract…");
  const imgFam = await ingestImage("hero-marrakech-family.jpg", {
    en: "Sunlit riad courtyard in Marrakech with zellige tiles and orange trees",
    es: "Patio de un riad de Marrakech al sol con zellige y naranjos",
    ar: "فناء رياض مشمس في مراكش مع زليج وأشجار البرتقال",
  });
  const imgVisa = await ingestImage("world-dolomites.jpg", {
    en: "Traveler overlooking an alpine valley at dawn",
    es: "Viajero contemplando un valle alpino al amanecer",
    ar: "مسافر يتطلع إلى وادٍ جبلي عند الفجر",
  });
  const imgWc = await ingestImage("sports-stadium.jpg", {
    en: "Packed football stadium at night under floodlights",
    es: "Estadio de fútbol lleno de noche bajo focos",
    ar: "ملعب كرة قدم ممتلئ ليلًا تحت الأضواء",
  });

  console.log("· Seeding articles…");
  const now = new Date();
  type Tr = {
    locale: "en" | "es" | "ar";
    slug: string; title: string; seoTitle: string; metaDescription: string; excerpt: string;
    heading: string; bullets: string[];
    faq: { question: string; answer: string }[];
  };
  const articles: {
    key: string; catKey: string; hero: { id: string }; publishedAt: Date; verifiedOn: string; warning: boolean;
    translations: Tr[];
  }[] = [
    {
      key: "marrakech-family-48h", catKey: "morocco.family", hero: { id: imgFam.id },
      publishedAt: new Date("2026-08-12T09:00:00Z"), verifiedOn: "2026-08-30", warning: false,
      translations: [
        { locale: "en", slug: "marrakech-with-kids-48-hours", title: "Marrakech with kids: a 48-hour family itinerary", seoTitle: "Marrakech with Kids: 48-Hour Family Itinerary (2026)", metaDescription: "A practical 48-hour Marrakech itinerary for families: kid-friendly riads, the medina without the overwhelm, gardens, and where to eat — verified by our editors.", excerpt: "Two days, zero stress: how to explore the medina, gardens and souks of Marrakech with children in tow — with naptimes, pools and snack stops built in.", heading: "How the two days are structured", bullets: ["Morning sightseeing, long lunch breaks at the riad, pool time in the early afternoon.", "One 'big' sight per half-day — the medina rewards depth over checklist ticking.", "Sunset from a rooftop with mint tea keeps everyone happy while you regroup."], faq: [{ question: "Is Marrakech walkable with young children?", answer: "Yes, in short stretches. The medina's alleys are unpaved and busy midday, so plan morning and late-afternoon walks and use a stroller carrier rather than a stroller inside the souks." }] },
        { locale: "es", slug: "marrakech-con-ninos-48-horas", title: "Marrakech con niños: un itinerario familiar de 48 horas", seoTitle: "Marrakech con Niños: Itinerario Familiar de 48 Horas (2026)", metaDescription: "Itinerario práctico de 48 horas en Marrakech para familias: riads aptos para niños, la medina sin agobios, jardines y dónde comer — verificado por nuestros editores.", excerpt: "Dos días sin estrés: cómo explorar la medina, los jardines y los zocos de Marrakech con niños, con siestas, piscinas y paradas para merendar incluidas.", heading: "Cómo se estructuran los dos días", bullets: ["Visitas por la mañana, comidas largas en el riad y piscina a primera hora de la tarde.", "Una visita 'grande' por media jornada: la medina premia la profundidad, no las listas.", "El atardecer desde una azotea con té a la menta contenta a todos mientras recuperáis energía."], faq: [{ question: "¿Se puede recorrer Marrakech a pie con niños pequeños?", answer: "Sí, en tramos cortos. Los callejones de la medina no están asfaltados y se llenan al mediodía: conviene caminar temprano o al atardecer y usar portabebés en lugar de carrito dentro de los zocos." }] },
        { locale: "ar", slug: "dalil-marrakech-lil-usar", title: "مراكش مع الأطفال: برنامج عائلي لمدة 48 ساعة", seoTitle: "مراكش مع الأطفال: برنامج عائلي لـ48 ساعة (2026)", metaDescription: "برنامج عملي لمدة 48 ساعة في مراكش للعائلات: رياضات مناسبة للأطفال، المدينة القديمة بلا ضغط، الحدائق وأفضل أماكن الأكل — تم التحقق من المعلومات من قبل فريقنا.", excerpt: "يومان بلا توتر: كيف تستكشفون المدينة القديمة والحدائق وأسواق مراكش مع الأطفال، مع أوقات راحة وحمامات سباحة وتوقفات للوجبات الخفيفة.", heading: "كيف ينظم البرنامج يوميه", bullets: ["زيارات صباحية، غداء طويل في الرياض، ووقت للمسبح في بداية العصر.", "معلم واحد «كبير» لكل نصف يوم — المدينة القديمة تكافئ التعمق لا تعداد القوائم.", "غروب من سطح مع شاي بالنعناع يريح الجميع قبل استئناف الجولة."], faq: [{ question: "هل يمكن التنقل في مراكش مشيًا مع أطفال صغار؟", answer: "نعم، على دفعات قصيرة. أزقة المدينة القديمة غير معبدة ومزدحمة وقت الظهيرة، فالأفضل السير صباحًا وقرب الغروب، واستخدام حمالة الأطفال بدل عربة داخل الأسواق." }] },
      ],
    },
    {
      key: "visa-free-moroccan-passport", catKey: "travel-for-moroccans.visa-free", hero: { id: imgVisa.id },
      publishedAt: new Date("2026-07-05T09:00:00Z"), verifiedOn: "2026-08-28", warning: true,
      translations: [
        { locale: "en", slug: "visa-free-countries-moroccan-passport", title: "Visa-free destinations for Moroccan passport holders in 2026", seoTitle: "Visa-Free Countries for Moroccan Passport Holders (2026)", metaDescription: "Where can Moroccan passport holders travel without a visa in 2026? Our verified overview of visa-free, visa-on-arrival and e-visa destinations — with official-source links.", excerpt: "A verified snapshot of where the Moroccan passport takes you without a consulate visit — plus the entry rules that change most often.", heading: "Visa-free vs visa-on-arrival: the practical difference", bullets: ["Visa-free: passport and return ticket are usually enough — check the permitted stay (often 30 or 90 days).", "Visa-on-arrival: expect fees in cash, passport photos and proof of accommodation at the border.", "E-visa: applied for online before departure; processing times vary from hours to weeks."], faq: [{ question: "Does visa-free mean I can stay as long as I want?", answer: "No. Visa-free entry still comes with a permitted stay — commonly 30 or 90 days — and sometimes conditions like an onward ticket. Check the allowed duration for your nationality with the official immigration source of the destination." }] },
        { locale: "es", slug: "paises-sin-visa-pasaporte-marroqui", title: "Destinos sin visado para pasaporte marroquí en 2026", seoTitle: "Países Sin Visado para Pasaporte Marroquí (2026)", metaDescription: "¿A dónde puede viajar el pasaporte marroquí sin visado en 2026? Resumen verificado de destinos sin visado, con visado a la llegada y e-visa — con fuentes oficiales.", excerpt: "Una imagen verificada de los destinos que puedes visitar con pasaporte marroquí sin pasar por un consulado, y las reglas de entrada que más cambian.", heading: "Sin visado o visado a la llegada: la diferencia práctica", bullets: ["Sin visado: basta pasaporte y billete de vuelta — comprueba la estancia permitida (30 o 90 días normalmente).", "Visado a la llegada: prevé tasas en efectivo, fotos de pasaporte y prueba de alojamiento en la frontera.", "E-visa: se solicita en línea antes de salir; los plazos van de horas a semanas."], faq: [{ question: "¿Sin visado significa que puedo quedarme todo lo que quiera?", answer: "No. La entrada sin visado tiene un período máximo de estancia —habitualmente 30 o 90 días— y a veces condiciones como billete de salida. Consulta la duración permitida en la fuente oficial de inmigración del destino." }] },
        { locale: "ar", slug: "duwal-bila-tashira", title: "وجهات بدون تأشيرة لحاملي الجواز المغربي في 2026", seoTitle: "دول بدون تأشيرة للجواز المغربي (2026)", metaDescription: "إلى أين يسافر الجواز المغربي بدون تأشيرة في 2026؟ نظرة موثقة على الوجهات بدون تأشيرة وبالتأشيرة عند الوصول والتأشيرة الإلكترونية — مع مصادر رسمية.", excerpt: "لمحة موثقة عن الدول التي تصلها بالجواز المغربي دون زيارة قنصلية، ومجموعة القواعد التي تتغير بسرعة.", heading: "الفرق العملي بين «بدون تأشيرة» و«تأشيرة عند الوصول»", bullets: ["بدون تأشيرة: يكفي الجواز وتذكرة العودة غالبًا — تحقق من مدة الإقامة المسموحة (30 أو 90 يومًا عادة).", "تأشيرة عند الوصول: توقّع رسومًا نقدية وصورًا وإثبات إقامة عند الحدود.", "التأشيرة الإلكترونية: تُطلب عبر الإنترنت قبل السفر؛ مدد المعالجة تتراوح بين ساعات وأسابيع."], faq: [{ question: "هل يعني عدم اشتراط التأشيرة إمكانية البقاء مدة غير محددة؟", answer: "لا. الدخول بدون تأشيرة يتضمن مدة إقامة مسموحة — عادة 30 أو 90 يومًا — وأحيانًا شروطًا مثل تذكرة مغادرة. تحققوا من المدة المسموح بها عبر المصدر الرسمي لهجرة البلد المقصود." }] },
      ],
    },
    {
      key: "world-cup-2030-fans", catKey: "sports-travel.world-cup", hero: { id: imgWc.id },
      publishedAt: new Date("2026-08-18T09:00:00Z"), verifiedOn: "2026-08-22", warning: true,
      translations: [
        { locale: "en", slug: "world-cup-2030-moroccan-fans-planning-guide", title: "World Cup 2030: early planning guide for Moroccan fans", seoTitle: "World Cup 2030 for Moroccan Fans: Early Planning Guide", metaDescription: "Morocco co-hosts the 2030 FIFA World Cup with Spain and Portugal. What Moroccan fans can plan early: host cities, travel windows, budgets and ticket processes.", excerpt: "The World Cup is coming to Moroccan soil. Here is what makes sense to plan years ahead — and what to ignore until the draw.", heading: "What to plan early — and what to wait for", bullets: ["Worth deciding early: long-haul flights into Europe, flexible accommodation, a budget framework.", "Not yet: anything tied to specific fixtures — the draw and match schedule come much later.", "Tickets: only via official FIFA channels once sales open; never unofficial resale sites."], faq: [{ question: "When should fans start booking for a World Cup?", answer: "Accommodation and long-haul transport reward early planning; individual match tickets can only be bought through official channels once sales open. Never buy from unofficial resale sites — availability, prices and validity are not guaranteed." }] },
        { locale: "es", slug: "mundial-2030-guia-aficionados-marroquies", title: "Mundial 2030: guía anticipada para aficionados marroquíes", seoTitle: "Mundial 2030 para Aficionados Marroquíes: Guía Anticipada", metaDescription: "Marruecos coorganiza el Mundial 2030 con España y Portugal. Lo que los aficionados marroquíes pueden planificar ya: ciudades sede, ventanas de viaje, presupuestos y proceso de entradas.", excerpt: "El Mundial llega a tierra marroquí. Esto es lo que tiene sentido planificar con años de antelación — y lo que conviene esperar al sorteo.", heading: "Qué planificar pronto — y qué esperar", bullets: ["Merece decidir pronto: vuelos de larga distancia a Europa, alojamiento flexible y un marco de presupuesto.", "Todavía no: todo lo ligado a partidos concretos — el sorteo y el calendario llegan mucho después.", "Entradas: solo por canales oficiales de la FIFA cuando se abra la venta; nunca reventa no oficial."], faq: [{ question: "¿Cuándo deben empezar los aficionados a reservar para un Mundial?", answer: "El alojamiento y el transporte de larga distancia premian la anticipación; las entradas individuales solo se compran por canales oficiales cuando se abre la venta. Nunca compres en sitios de reventa no oficiales." }] },
        { locale: "ar", slug: "kass-alalam-2030-dalil", title: "كأس العالم 2030: دليل تخطيط مبكر للجماهير المغربية", seoTitle: "كأس العالم 2030 للجماهير المغربية: دليل تخطيط مبكر", metaDescription: "المغرب ينظم مونديال 2030 مع إسبانيا والبرتغال. ما يمكن للجماهير المغربية التخطيط له مبكرًا: المدن المستضيفة، نوافذ السفر، الميزانيات ومسار التذاكر.", excerpt: "المونديال قادم إلى الأرض المغربية. هذا ما يستحق التخطيط المبكر — وهذا ما ينتظر القرعة.", heading: "ما يُخطط مبكرًا — وما ينتظر", bullets: ["يستحق الحسم مبكرًا: رحلات طويلة نحو أوروبا، إقامة مرنة، وإطار ميزانية واضح.", "ليس بعد: كل ما يتعلق بمباريات محددة — القرعة والبرنامج يأتيان لاحقًا.", "التذاكر: عبر القنوات الرسمية فقط عند افتتاح البيع؛ أبدًا من مواقع إعادة البيع غير الرسمية."], faq: [{ question: "متى يجب أن يبدأ المشجعون بالحجز للمونديال؟", answer: "الإقامة والنقل لمسافات طويلة يكافئان التخطيط المبكر؛ أما التذاكر الفردية فتُشترى فقط عبر القنوات الرسمية عند افتتاح البيع. لا تشتروا أبدًا من مواقع إعادة البيع غير الرسمية." }] },
      ],
    },
  ];

  for (const a of articles) {
    let article = await prisma.article.findFirst({
      where: { translations: { some: { slug: a.translations[0].slug } } },
    });
    if (!article) {
      article = await prisma.article.create({ data: { authorId: author.id, categoryId: categories[a.catKey], heroImageId: a.hero.id } });
    }

    for (const t of a.translations) {
      const blocks = [
        b("paragraph", { text: t.excerpt }),
        b("heading", { level: 2, text: t.heading }),
        b("list", { ordered: false, items: t.bullets }),
        b("paragraph", { text: t.locale === "ar" ? "تم التحقق من كل المعلومات الواردة أعلاه في التاريخ الموضح، ويرجى دائمًا مراجعة المصادر الرسمية قبل الحجز." : t.locale === "es" ? "Toda la información anterior fue verificada en la fecha indicada; confirma siempre con las fuentes oficiales antes de reservar." : "Everything above was verified on the date shown; always confirm with official sources before booking." }),
      ];
      const existing = await prisma.articleTranslation.findUnique({ where: { locale_slug: { locale: t.locale, slug: t.slug } } });
      if (existing) continue;
      const faqGroup = await prisma.faqGroup.create({
        data: { items: { create: t.faq.map((f, i) => ({ position: i, translations: { create: [{ locale: t.locale, question: f.question, answer: f.answer }] } })) } },
      });
      const tr = await prisma.articleTranslation.create({
        data: {
          articleId: article.id,
          locale: t.locale,
          slug: t.slug,
          title: t.title,
          h1: null,
          excerpt: t.excerpt,
          blocks: blocks as unknown as Prisma.InputJsonValue,
          faqGroupId: faqGroup.id,
          seoTitle: t.seoTitle,
          metaDescription: t.metaDescription,
          verificationStatus: "VERIFIED",
          lastVerifiedAt: new Date(a.verifiedOn),
          verifiedById: users.ADMIN.id,
          warningEnabled: a.warning,
          workflowStatus: "PUBLISHED",
          publishedAt: a.publishedAt,
          readingMinutes: 4,
        },
      });
      await prisma.articleTransition.create({
        data: {
          translationId: tr.id,
          userId: users.EDITOR.id,
          fromStatus: "APPROVED",
          toStatus: "PUBLISHED",
          notes: "seed: initial publication",
        },
      });
    }
  }

  console.log("· Linking related guides…");
  const allTrs = await prisma.articleTranslation.findMany({ select: { id: true, locale: true, slug: true } });
  // per locale: source slug → { targetSlug, anchorText }
  const anchors: Record<string, Record<string, { targetSlug: string; anchorText: string }>> = {
    en: {
      "marrakech-with-kids-48-hours": { targetSlug: "visa-free-countries-moroccan-passport", anchorText: "visa-free destinations for Moroccan passport holders" },
      "visa-free-countries-moroccan-passport": { targetSlug: "world-cup-2030-moroccan-fans-planning-guide", anchorText: "early World Cup 2030 planning guide" },
      "world-cup-2030-moroccan-fans-planning-guide": { targetSlug: "marrakech-with-kids-48-hours", anchorText: "48-hour Marrakech family itinerary" },
    },
    es: {
      "marrakech-con-ninos-48-horas": { targetSlug: "paises-sin-visa-pasaporte-marroqui", anchorText: "destinos sin visado para pasaporte marroquí" },
      "paises-sin-visa-pasaporte-marroqui": { targetSlug: "mundial-2030-guia-aficionados-marroquies", anchorText: "guía anticipada del Mundial 2030" },
      "mundial-2030-guia-aficionados-marroquies": { targetSlug: "marrakech-con-ninos-48-horas", anchorText: "itinerario familiar de Marrakech en 48 horas" },
    },
    ar: {
      "dalil-marrakech-lil-usar": { targetSlug: "duwal-bila-tashira", anchorText: "وجهات بدون تأشيرة لحاملي الجواز المغربي" },
      "duwal-bila-tashira": { targetSlug: "kass-alalam-2030-dalil", anchorText: "دليل تخطيط مونديال 2030 المبكر" },
      "kass-alalam-2030-dalil": { targetSlug: "dalil-marrakech-lil-usar", anchorText: "برنامج مراكش العائلي لمدة 48 ساعة" },
    },
  };
  for (const tr of allTrs) {
    const link = anchors[tr.locale]?.[tr.slug];
    if (!link) continue;
    const target = allTrs.find((x) => x.locale === tr.locale && x.slug === link.targetSlug);
    if (!target) continue;
    const dup = await prisma.contentLink.findFirst({ where: { ownerId: tr.id, targetArticleTranslationId: target.id } });
    if (!dup) {
      await prisma.contentLink.create({ data: { ownerId: tr.id, targetArticleTranslationId: target.id, anchorText: link.anchorText } });
    }
  }

  console.log("\n✓ Seed complete.");
  console.log("  Dev logins (DEV ONLY): admin@ / editor@ / author@ / reviewer@jouriva.test — password: jouriva-dev-2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
