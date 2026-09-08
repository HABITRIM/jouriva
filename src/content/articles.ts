import type { SampleArticle } from "./types";

/**
 * SAMPLE articles (Phase 1 pattern demonstration).
 *
 * Each article exists as an independent version per locale with its OWN
 * slug, SEO title, meta description and FAQ — demonstrating the
 * "translations are related, not duplicated" architecture:
 *   - en: /en/guides/marrakech-with-kids-48-hours/
 *   - es: /es/guides/marrakech-con-ninos-48-horas/
 *   - ar: /ar/guides/dalil-marrakech-lil-usar/
 * hreflang alternates connect the three versions automatically.
 */
export const sampleArticles: SampleArticle[] = [
  {
    id: "marrakech-family-48h",
    image: "/images/hero-marrakech-family.jpg",
    imageAlt: {
      en: "Sunlit riad courtyard in Marrakech with zellige tiles and orange trees",
      es: "Patio de un riad de Marrakech al sol con zellige y naranjos",
      ar: "فناء رياض مشمس في مراكش مع زليج وأشجار البرتقال",
    },
    authorId: "author-1",
    categoryKey: "morocco.family",
    tags: ["morocco", "marrakech", "family"],
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-30",
    translations: {
      en: {
        slug: "marrakech-with-kids-48-hours",
        title: "Marrakech with kids: a 48-hour family itinerary",
        seoTitle: "Marrakech with Kids: 48-Hour Family Itinerary (2026)",
        metaDescription:
          "A practical 48-hour Marrakech itinerary for families: kid-friendly riads, the medina without the overwhelm, gardens, and where to eat — verified by our editors.",
        excerpt:
          "Two days, zero stress: how to explore the medina, gardens and souks of Marrakech with children in tow — with naptimes, pools and snack stops built in.",
        body: [
          "Marrakech can be magical for children — if you pace it right. This 48-hour plan keeps walks short, builds in pool time, and puts the medina's sensory overload into small, manageable doses.",
          "Day one covers the east side of the medina in the morning before the heat: the Ben Youssef area, a long lunch break at the riad, then the Saadian Tombs and a sunset mint tea on a rooftop. Day two saves the Jardin Majorelle for the 9 a.m. entry slot, followed by the new-g district playgrounds and an early hammam-and-dinner combo.",
          "Every venue, price and opening hour in this guide was checked by our editors on the date shown above. You can swap any day's plan with the 'getting around' options in our Marrakech city guide.",
        ],
        faq: [
          {
            question: "Is Marrakech walkable with young children?",
            answer:
              "Yes, in short stretches. The medina's alleys are unpaved and busy midday, so plan morning and late-afternoon walks and use a stroller carrier rather than a stroller inside the souks.",
          },
        ],
      },
      es: {
        slug: "marrakech-con-ninos-48-horas",
        title: "Marrakech con niños: un itinerario familiar de 48 horas",
        seoTitle: "Marrakech con Niños: Itinerario Familiar de 48 Horas (2026)",
        metaDescription:
          "Itinerario práctico de 48 horas en Marrakech para familias: riads aptos para niños, la medina sin agobios, jardines y dónde comer — verificado por nuestros editores.",
        excerpt:
          "Dos días sin estrés: cómo explorar la medina, los jardines y los zocos de Marrakech con niños, con siestas, piscinas y paradas para merendar incluidas.",
        body: [
          "Marrakech puede ser mágica para los niños si se lleva el buen ritmo. Este plan de 48 horas acorta los paseos, incluye tiempo de piscina y reparte la sobrecarga sensorial de la medina en dosis pequeñas.",
          "El primer día cubre el lado este de la medina por la mañana antes del calor: la zona de Ben Youssef, una pausa larga para comer en el riad y después las Tumbas Saadíes con un té a la sombra al atardecer. El segundo día reserva el Jardin Majorelle para la franja de las 9:00, seguido de parques y una cena temprana.",
          "Cada local, precio y horario de esta guía fue verificado por nuestros editores en la fecha indicada arriba. Puedes combinar cualquier día con las opciones de transporte de nuestra guía de la ciudad.",
        ],
        faq: [
          {
            question: "¿Se puede recorrer Marrakech a pie con niños pequeños?",
            answer:
              "Sí, en tramos cortos. Los callejones de la medina no están asfaltados y se llenan al mediodía: conviene caminar temprano o al atardecer y usar portabebés en lugar de carrito dentro de los zocos.",
          },
        ],
      },
      ar: {
        slug: "dalil-marrakech-lil-usar",
        title: "مراكش مع الأطفال: برنامج عائلي لمدة 48 ساعة",
        seoTitle: "مراكش مع الأطفال: برنامج عائلي لـ48 ساعة (2026)",
        metaDescription:
          "برنامج عملي لمدة 48 ساعة في مراكش للعائلات: رياضات مناسبة للأطفال، المدينة القديمة بلا ضغط، الحدائق وأفضل أماكن الأكل — تم التحقق من المعلومات من قبل فريقنا.",
        excerpt:
          "يومان بلا توتر: كيف تستكشفون المدينة القديمة والحدائق وأسواق مراكش مع الأطفال، مع أوقات راحة وحمامات سباحة وتوقفات للوجبات الخفيفة.",
        body: [
          "يمكن أن تكون مراكش سحرية للأطفال إذا ضبطتم الإيقاع. هذا البرنامج لمدة 48 ساعة يقصّر المسيرات ويخصص وقتًا للسباحة ويوزع ازدحام المدينة القديمة على جرعات صغيرة.",
          "اليوم الأول يغطي الجانب الشرقي صباحًا قبل الحر: منطقة بن يوسف، ثم استراحة غداء طويلة في الرياض، ثم قبور السعديين وشاي بالنعناع على سطح عند الغروب. اليوم الثاني يخصص حديقة ماجوريل لموعد التاسعة صباحًا، ثم حدائق الحي الجديد وعشاء مبكر.",
          "تم التحقق من كل معلومة وسعر ووقت عمل في هذا الدليل من قبل فريق التحرير في التاريخ المذكور أعلاه، ويمكنكم دمج أي يوم مع خيارات التنقل في دليل المدينة.",
        ],
        faq: [
          {
            question: "هل يمكن التنقل في مراكش مشيًا مع أطفال صغار؟",
            answer:
              "نعم، على دفعات قصيرة. أزقة المدينة القديمة غير معبدة ومزدحمة وقت الظهيرة، فالأفضل السير صباحًا وقرب الغروب، واستخدام حمالة الأطفال بدل عربة داخل الأسواق.",
          },
        ],
      },
    },
  },
  {
    id: "visa-free-moroccan-passport",
    image: "/images/world-dolomites.jpg",
    imageAlt: {
      en: "Traveler overlooking an alpine valley at dawn — discovering a visa-free destination",
      es: "Viajero contemplando un valle alpino al amanecer",
      ar: "مسافر يتطلع إلى وادٍ جبلي عند الفجر",
    },
    authorId: "author-1",
    categoryKey: "travel-for-moroccans.visa-free",
    tags: ["visas", "passports", "budget"],
    publishedAt: "2026-07-05",
    updatedAt: "2026-08-28",
    verification: { status: "verified", lastVerified: "2026-08-28" },
    warning: true,
    translations: {
      en: {
        slug: "visa-free-countries-moroccan-passport",
        title: "Visa-free destinations for Moroccan passport holders in 2026",
        seoTitle: "Visa-Free Countries for Moroccan Passport Holders (2026)",
        metaDescription:
          "Where can Moroccan passport holders travel without a visa in 2026? Our verified overview of visa-free, visa-on-arrival and e-visa destinations — with official-source links.",
        excerpt:
          "A verified snapshot of where the Moroccan passport takes you without a consulate visit — plus the entry rules that change most often.",
        body: [
          "The Moroccan passport opens the door to a solid list of visa-free and visa-on-arrival destinations across Africa, Asia and Latin America. This overview groups them by region and by how 'easy' the entry actually is in practice.",
          "Visa-free is not the same as visa-on-arrival: the first needs nothing but your passport and return ticket, while the second usually means fees in cash, photos and proof of accommodation. We separate the two clearly, because it changes how you prepare at the check-in desk.",
          "Entry rules are among the fastest-changing facts in travel. This article was verified by our editors on the date shown above — always confirm requirements with the destination's official sources before booking.",
        ],
        faq: [
          {
            question: "Does visa-free mean I can stay as long as I want?",
            answer:
              "No. Visa-free entry still comes with a permitted stay — commonly 30 or 90 days — and sometimes conditions like an onward ticket. Check the allowed duration for your nationality with the official immigration source of the destination.",
          },
        ],
      },
      es: {
        slug: "paises-sin-visa-pasaporte-marroqui",
        title: "Destinos sin visado para pasaporte marroquí en 2026",
        seoTitle: "Países Sin Visado para Pasaporte Marroquí (2026)",
        metaDescription:
          "¿A dónde puede viajar el pasaporte marroquí sin visado en 2026? Resumen verificado de destinos sin visado, con visado a la llegada y e-visa — con fuentes oficiales.",
        excerpt:
          "Una imagen verificada de los destinos que puedes visitar con pasaporte marroquí sin pasar por un consulado, y las reglas de entrada que más cambian.",
        body: [
          "El pasaporte marroquí abre la puerta a una buena lista de destinos sin visado y con visado a la llegada en África, Asia y Latinoamérica. Este resumen los agrupa por región y por lo fácil que es en la práctica la entrada.",
          "Sin visado no es lo mismo que visado a la llegada: el primero solo exige pasaporte y billete de vuelta; el segundo suele implicar tasas en efectivo, fotos y prueba de alojamiento. Separamos ambos casos porque cambia cómo te preparas en el mostrador.",
          "Las reglas de entrada son de los datos que más rápido cambian en viajes. Este artículo fue verificado por nuestros editores en la fecha indicada; confirma siempre los requisitos con las fuentes oficiales del destino antes de reservar.",
        ],
        faq: [
          {
            question: "¿Sin visado significa que puedo quedarme todo lo que quiera?",
            answer:
              "No. La entrada sin visado tiene un período máximo de estancia —habitualmente 30 o 90 días— y a veces condiciones como billete de salida. Consulta la duración permitida en la fuente oficial de inmigración del destino.",
          },
        ],
      },
      ar: {
        slug: "duwal-bila-tashira",
        title: "وجهات بدون تأشيرة لحاملي الجواز المغربي في 2026",
        seoTitle: "دول بدون تأشيرة للجواز المغربي (2026)",
        metaDescription:
          "إلى أين يسافر الجواز المغربي بدون تأشيرة في 2026؟ نظرة موثقة على الوجهات بدون تأشيرة وبالتأشيرة عند الوصول والتأشيرة الإلكترونية — مع مصادر رسمية.",
        excerpt:
          "لمحة موثقة عن الدول التي تصلها بالجواز المغربي دون زيارة قنصلية، ومجموعة القواعد التي تتغير بسرعة.",
        body: [
          "يفتح الجواز المغربي الباب أمام قائمة جيدة من الوجهات بدون تأشيرة أو بتأشيرة عند الوصول في إفريقيا وآسيا وأمريكا اللاتينية. نجمعها هنا حسب المنطقة وحسب سهولة الدخول فعليًا.",
          "عدم اشتراط التأشيرة يختلف عن التأشيرة عند الوصول: الأول يكفيه الجواز وتذكرة العودة، والثاني يعني غالبًا رسومًا نقدية وصورًا وإثبات إقامة. نفصل بين الحالتين لأن ذلك يغير تحضيراتك في مطامر المغادرة.",
          "قواعد الدخول من أسرع المعلومات تغيرًا في السفر. تم التحقق من هذا المقال في التاريخ المذكور أعلاه، وتأكدوا دائمًا من المتطلبات عبر المصادر الرسمية قبل الحجز.",
        ],
        faq: [
          {
            question: "هل يعني عدم اشتراط التأشيرة إمكانية البقاء مدة غير محددة؟",
            answer:
              "لا. الدخول بدون تأشيرة يتضمن مدة إقامة مسموحة — عادة 30 أو 90 يومًا — وأحيانًا شروطًا مثل تذكرة مغادرة. تحققوا من المدة المسموح بها عبر المصدر الرسمي لهجرة البلد المقصود.",
          },
        ],
      },
    },
  },
  {
    id: "world-cup-2030-fans",
    image: "/images/sports-stadium.jpg",
    imageAlt: {
      en: "Packed football stadium at night under floodlights",
      es: "Estadio de fútbol lleno de noche bajo focos",
      ar: "ملعب كرة قدم ممتلئ ليلًا تحت الأضواء",
    },
    authorId: "author-1",
    categoryKey: "sports-travel.world-cup",
    tags: ["sports", "world-cup", "morocco"],
    publishedAt: "2026-08-18",
    updatedAt: "2026-08-22",
    verification: { status: "verified", lastVerified: "2026-08-22" },
    warning: true,
    translations: {
      en: {
        slug: "world-cup-2030-moroccan-fans-planning-guide",
        title: "World Cup 2030: early planning guide for Moroccan fans",
        seoTitle: "World Cup 2030 for Moroccan Fans: Early Planning Guide",
        metaDescription:
          "Morocco co-hosts the 2030 FIFA World Cup with Spain and Portugal. What Moroccan fans can plan early: host cities, travel windows, budgets and ticket processes.",
        excerpt:
          "The World Cup is coming to Moroccan soil. Here is what makes sense to plan years ahead — and what to ignore until the draw.",
        body: [
          "The 2030 tournament will be staged across Morocco, Spain and Portugal, which turns this World Cup into something rare for Moroccan fans: a home edition combined with short-haul European trips.",
          "What is worth planning early? Long-haul flights into Europe for group-stage away legs, accommodation flexibility in host cities, and a realistic budget framework. What is not worth deciding yet? Anything tied to specific fixtures — the draw and match schedule come much later.",
          "JOURIVA's sports travel section is built event by event — host country, city, venue, hotels, flights, visas and fan guides — so every edition gets its own planning path, not just this World Cup.",
        ],
        faq: [
          {
            question: "When should fans start booking for a World Cup?",
            answer:
              "Accommodation and long-haul transport reward early planning; individual match tickets can only be bought through official channels once sales open. Never buy from unofficial resale sites — availability, prices and validity are not guaranteed.",
          },
        ],
      },
      es: {
        slug: "mundial-2030-guia-aficionados-marroquies",
        title: "Mundial 2030: guía anticipada para aficionados marroquíes",
        seoTitle: "Mundial 2030 para Aficionados Marroquíes: Guía Anticipada",
        metaDescription:
          "Marruecos coorganiza el Mundial 2030 con España y Portugal. Lo que los aficionados marroquíes pueden planificar ya: ciudades sede, ventanas de viaje, presupuestos y proceso de entradas.",
        excerpt:
          "El Mundial llega a tierra marroquí. Esto es lo que tiene sentido planificar con años de antelación — y lo que conviene esperar al sorteo.",
        body: [
          "El torneo de 2030 se disputará entre Marruecos, España y Portugal, lo que convierte este Mundial en algo inédito para la afición marroquí: una edición en casa combinada con viajes cortos por Europa.",
          "¿Qué merece la pena planificar pronto? Los vuelos de larga distancia hacia Europa, la flexibilidad de alojamiento en las ciudades sede y un marco de presupuesto realista. ¿Qué no? Todo lo ligado a partidos concretos: el sorteo y el calendario llegan mucho después.",
          "La sección de viajes deportivos de JOURIVA se construye evento a evento — país sede, ciudad, estadio, hoteles, vuelos, visados y guías de aficionados — para que cada edición tenga su propio camino de planificación.",
        ],
        faq: [
          {
            question: "¿Cuándo deben empezar los aficionados a reservar para un Mundial?",
            answer:
              "El alojamiento y el transporte de larga distancia premian la anticipación; las entradas individuales solo se compran por canales oficiales cuando se abre la venta. Nunca compres en sitios de reventa no oficiales.",
          },
        ],
      },
      ar: {
        slug: "kass-alalam-2030-dalil",
        title: "كأس العالم 2030: دليل تخطيط مبكر للجماهير المغربية",
        seoTitle: "كأس العالم 2030 للجماهير المغربية: دليل تخطيط مبكر",
        metaDescription:
          "المغرب ينظم مونديال 2030 مع إسبانيا والبرتغال. ما يمكن للجماهير المغربية التخطيط له مبكرًا: المدن المستضيفة، نوافذ السفر، الميزانيات ومسار التذاكر.",
        excerpt:
          "المونديال قادم إلى الأرض المغربية. هذا ما يستحق التخطيط المبكر — وهذا ما ينتظر القرعة.",
        body: [
          "ستقام منافسات 2030 بين المغرب وإسبانيا والبرتغال، وهو ما يجعل هذا المونديال مختلفًا للجماهير المغربية: نسخة على الأرض مع رحلات أوروبية قصيرة.",
          "ما يستحق التخطيط مبكرًا؟ رحلات الخطوط الطويلة نحو أوروبا، مرونة الإقامة في المدن المستضيفة، وإطار ميزانية واقعي. وما لا يستحق؟ كل ما يتعلق بمباريات محددة — فالقرعة والبرنامج يأتيان لاحقًا.",
          "قسم السفر الرياضي في JOURIVA يُبنى حدثًا بحدث — البلد المستضيف، المدينة، الملعب، الفنادق، الرحلات، التأشيرات وأدلة الجماهير — لتكون لكل نسخة مسار تخطيط خاص بها.",
        ],
        faq: [
          {
            question: "متى يجب أن يبدأ المشجعون بالحجز للمونديال؟",
            answer:
              "الإقامة والنقل لمسافات طويلة يكافئان التخطيط المبكر؛ أما التذاكر الفردية فتُشترى فقط عبر القنوات الرسمية عند افتتاح البيع. لا تشتروا أبدًا من مواقع إعادة البيع غير الرسمية.",
          },
        ],
      },
    },
  },
];

export function listArticles(locale: Locale2): SampleArticle[] {
  return sampleArticles;
}

// Small helper import indirection to avoid circular type noise
import type { Locale } from "@/i18n/routing";
type Locale2 = Locale;

export function getArticleById(id: string): SampleArticle | undefined {
  return sampleArticles.find((a) => a.id === id);
}

export function getArticleBySlug(locale: Locale, slug: string): SampleArticle | undefined {
  return sampleArticles.find((a) => a.translations[locale].slug === slug);
}

export function articlePath(locale: Locale, article: SampleArticle): string {
  return `/guides/${article.translations[locale].slug}/`;
}
