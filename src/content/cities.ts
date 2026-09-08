import type { SampleCity } from "./types";

/**
 * SAMPLE city destinations (Phase 1 pattern demonstration).
 * URL pattern: /{locale}/morocco/{slug}/ — slugs are transliterated and
 * shared across locales for URL stability; names/copy are fully localized.
 * Replace with CMS-managed destinations in Phase 2.
 */
export const sampleCities: SampleCity[] = [
  {
    id: "marrakech",
    slug: "marrakech",
    image: "/images/hero-marrakech-family.jpg",
    imageAlt: {
      en: "Riad courtyard with zellige tiles and orange trees in Marrakech",
      es: "Patio de riad con zellige y naranjos en Marrakech",
      ar: "فناء رياض بالزليج وأشجار البرتقال في مراكش",
    },
    updatedAt: "2026-08-30",
    translations: {
      en: {
        name: "Marrakech",
        region: "Marrakech–Safi",
        headline: "The red city of gardens, souks and rooftops",
        seoTitle: "Marrakech Travel Guide (2026)",
        metaDescription:
          "Practical Marrakech guide: when to go, how to get around, where to stay and what to book first — maintained and verified by JOURIVA editors.",
        intro:
          "Marrakech layers a thousand years of medina history over palm groves and design-forward new districts. It is Morocco's most visited city — and the one that rewards planning most.",
        highlights: [
          "Jemaa el-Fnaa and the medina souks",
          "Jardin Majorelle and the Yves Saint Laurent Museum",
          "Bahia Palace and the Saadian Tombs",
          "Day trips to the Atlas Mountains and Agafay desert",
        ],
        faq: [
          {
            question: "What is the best time of year to visit Marrakech?",
            answer:
              "Spring (March–May) and autumn (October–November) offer the most comfortable temperatures. Summer heat is intense; winter days are mild but nights can be cold.",
          },
          {
            question: "How many days do you need in Marrakech?",
            answer:
              "Two to three full days cover the essential medina and garden sights; add a fourth for an Atlas or desert day trip.",
          },
        ],
      },
      es: {
        name: "Marrakech",
        region: "Marrakech–Safi",
        headline: "La ciudad roja de jardines, zocos y azoteas",
        seoTitle: "Guía de Viaje de Marrakech (2026)",
        metaDescription:
          "Guía práctica de Marrakech: cuándo ir, cómo moverse, dónde alojarse y qué reservar primero — mantenida y verificada por los editores de JOURIVA.",
        intro:
          "Marrakech superpone mil años de medina sobre palmerales y barrios nuevos de diseño. Es la ciudad más visitada de Marruecos — y la que más recompensa la planificación.",
        highlights: [
          "Jemaa el-Fnaa y los zocos de la medina",
          "Jardin Majorelle y el Museo Yves Saint Laurent",
          "Palacio de la Bahía y las Tumbas Saadíes",
          "Excursiones al Atlas y al desierto de Agafay",
        ],
        faq: [
          {
            question: "¿Cuál es la mejor época para visitar Marrakech?",
            answer:
              "La primavera (marzo–mayo) y el otoño (octubre–noviembre) ofrecen las temperaturas más cómodas. El verano es muy caluroso; el invierno es suave de día pero frío por la noche.",
          },
          {
            question: "¿Cuántos días hacen falta en Marrakech?",
            answer:
              "Dos o tres días completos cubren lo esencial de la medina y los jardines; añade un cuarto para una excursión al Atlas o al desierto.",
          },
        ],
      },
      ar: {
        name: "مراكش",
        region: "مراكش–آسفي",
        headline: "المدينة الحمراء للحدائق والأسواق والأسطح",
        seoTitle: "دليل السفر إلى مراكش (2026)",
        metaDescription:
          "دليل عملي لمراكش: متى تسافر، كيف تتنقل، أين تقيم وماذا تحجز أولًا — يحدّثه ويتحقق منه محررو JOURIVA.",
        intro:
          "تراكب مراكش ألف عام من تاريخ المدينة القديمة فوق واحات النخيل وأحياء جديدة عصرية. هي أكثر مدن المغرب زيارة — وهي الأكثر مكافأة للتخطيط الجيد.",
        highlights: [
          "ساحة جامع الفنا وأسواق المدينة القديمة",
          "حديقة ماجوريل ومتحف إيف سان لوران",
          "قصر الباهية وقبور السعديين",
          "رحلات نهارية إلى الأطلس وصحراء أكفاي",
        ],
        faq: [
          {
            question: "ما هو أفضل وقت لزيارة مراكش؟",
            answer:
              "الربيع (مارس–مايو) والخريف (أكتوبر–نوفمبر) يوفران أكثر الأجواء لطفًا. الصيف حار جدًا؛ وشتاءً الأيام معتدلة لكن الليالي باردة.",
          },
          {
            question: "كم يومًا تحتاجون في مراكش؟",
            answer:
              "يومان إلى ثلاثة أيام كاملة تغطي أساسيات المدينة القديمة والحدائق؛ أضيفوا يومًا رابعًا لرحلة إلى الأطلس أو الصحراء.",
          },
        ],
      },
    },
  },
  {
    id: "chefchaouen",
    slug: "chefchaouen",
    image: "/images/city-chefchaouen.jpg",
    imageAlt: {
      en: "Blue-washed alley with plant pots in Chefchaouen",
      es: "Callejón azul con macetas en Chefchaouen",
      ar: "زقاق أزرق بأصص زرعية في شفشاون",
    },
    updatedAt: "2026-08-15",
    translations: {
      en: {
        name: "Chefchaouen",
        region: "Tanger-Tetouan-Al Hoceima",
        headline: "Morocco's blue mountain escape",
        seoTitle: "Chefchaouen Travel Guide (2026)",
        metaDescription:
          "Plan a calm escape to Chefchaouen: the blue medina, Rif Mountain hikes, how to get there from Tangier or Casablanca, and the best seasons.",
        intro:
          "Folded into the Rif Mountains, Chefchaouen's blue-washed medina is one of Morocco's calmest and most photogenic towns — a weekend favourite for families and hikers alike.",
        highlights: [
          "The blue lanes of the old medina",
          "Spanish Mosque viewpoint at sunset",
          "Ras El Maa waterfall and riverside cafés",
          "Hiking trails into Talassemtane National Park",
        ],
        faq: [
          {
            question: "How do you get to Chefchaouen?",
            answer:
              "Direct buses and shared taxis run from Tangier, Tetouan and Casablanca. The nearest airports are Tangier and Tetouan; Casablanca works well with a combined bus or train-plus-bus route.",
          },
        ],
      },
      es: {
        name: "Chefchaouen",
        region: "Tánger-Tetuán-Alhucemas",
        headline: "El refugio azul de las montañas marroquíes",
        seoTitle: "Guía de Viaje de Chefchaouen (2026)",
        metaDescription:
          "Planifica una escapada tranquila a Chefchaouen: la medina azul, rutas por el Rif, cómo llegar desde Tánger o Casablanca y las mejores temporadas.",
        intro:
          "Enclavada en el Rif, la medina azul de Chefchaouen es uno de los pueblos más tranquilos y fotogénicos de Marruecos — favorita para fines de semana de familias y senderistas.",
        highlights: [
          "Los callejones azules de la medina antigua",
          "Mirador de la Mezquita Española al atardecer",
          "Cascada de Ras El Maa y cafés junto al río",
          "Senderos del Parque Nacional de Talassemtane",
        ],
        faq: [
          {
            question: "¿Cómo se llega a Chefchaouen?",
            answer:
              "Autobuses directos y taxis compartidos conectan desde Tánger, Tetuán y Casablanca. Los aeropuertos más cercanos son Tánger y Tetuán; desde Casablanca conviene combinar tren y autobús.",
          },
        ],
      },
      ar: {
        name: "شفشاون",
        region: "طنجة–تطوان–الحسيمة",
        headline: "ملاذ الجبال الأزرق في المغرب",
        seoTitle: "دليل السفر إلى شفشاون (2026)",
        metaDescription:
          "خططوا لرحلة هادئة إلى شفشاون: المدينة الزرقاء، دروب ريف الجبلية، كيفية الوصول من طنجة أو الدار البيضاء، وأفضل المواسم.",
        intro:
          "محشوة بين جبال الريف، المدينة الزرقاء في شفشاون من أكثر بلدات المغرب هدوءًا وجمالًا للتصوير — وجهة نهاية الأسبوع المفضلة للعائلات والمشيدين.",
        highlights: [
          "الأزقة الزرقاء للمدينة القديمة",
          "منظر مسجد الأسبانيات عند الغروب",
          "شلال راس الماء ومقاهي ضفته",
          "دروب حديقة تالاسمان الجهوية للمشي",
        ],
        faq: [
          {
            question: "كيف يتم الوصول إلى شفشاون؟",
            answer:
              "حافلات مباشرة وسيارات أجرة مشتركة تنطلق من طنجة وتطوان والدار البيضاء. أقرب المطارات طنجة وتطوان؛ ومن الدار البيضاء يفضل الجمع بين القطار والحافلة.",
          },
        ],
      },
    },
  },
  {
    id: "fes",
    slug: "fes",
    image: "/images/city-fes.jpg",
    imageAlt: {
      en: "Carved cedar door and zellige mosaic in the Fes medina",
      es: "Puerta de cedro tallado y zellige en la medina de Fez",
      ar: "باب من خشب الأرز منقوش وزليج في مدينة فاس العتيقة",
    },
    updatedAt: "2026-08-10",
    translations: {
      en: {
        name: "Fes",
        region: "Fès–Meknès",
        headline: "The spiritual and artisan heart of Morocco",
        seoTitle: "Fes Travel Guide (2026)",
        metaDescription:
          "A practical guide to Fes: navigating the world's largest car-free medina, artisans' quarters, day trips to Meknes and Volubilis, and travel tips.",
        intro:
          "Fes is Morocco's cultural capital: the largest car-free urban area on earth, working tanneries, and artisan guilds that have shaped the country's craft for centuries.",
        highlights: [
          "Al-Qarawiyyin university and library district",
          "Chouara Tannery viewpoints",
          "Bou Inania madrasa and the medina's foundouks",
          "Day trips to Meknes and Roman Volubilis",
        ],
        faq: [
          {
            question: "Is it easy to get lost in the Fes medina?",
            answer:
              "Yes — and that is part of the experience. The medina has thousands of alleys; take the main axes between Bab Boujloud and the tanneries, and consider a licensed local guide for the first visit.",
          },
        ],
      },
      es: {
        name: "Fez",
        region: "Fez–Mequinez",
        headline: "El corazón espiritual y artesano de Marruecos",
        seoTitle: "Guía de Viaje de Fez (2026)",
        metaDescription:
          "Guía práctica de Fez: cómo moverse por la medina peatonal más grande del mundo, barrios de artesanos, excursiones a Mequinez y Volubilis, y consejos.",
        intro:
          "Fez es la capital cultural de Marruecos: la mayor zona urbana peatonal del planeta, curtidurías en activo y gremios artesanos que han forjado el oficio del país durante siglos.",
        highlights: [
          "Distrito de la universidad y biblioteca Al-Qarawiyyin",
          "Miradores de la curtiduría Chouara",
          "Madraza de Bou Inania y los fondouks de la medina",
          "Excursiones a Mequinez y la romana Volubilis",
        ],
        faq: [
          {
            question: "¿Es fácil perderse en la medina de Fez?",
            answer:
              "Sí — y forma parte de la experiencia. La medina tiene miles de callejones; usa los ejes principales entre Bab Boujloud y las curtidurías y valora un guía local autorizado en la primera visita.",
          },
        ],
      },
      ar: {
        name: "فاس",
        region: "فاس–مكناس",
        headline: "القلب الروحي والحرفي للمغرب",
        seoTitle: "دليل السفر إلى فاس (2026)",
        metaDescription:
          "دليل عملي لفاس: كيف تتنقلون في أكبر مدينة مشاة في العالم، أحياء الحرفيين، رحلات إلى مكناس ولوليبة، ونصائح السفر.",
        intro:
          "فاس هي العاصمة الثقافية للمغرب: أكبر منطقة حضرية للمشاة في العالم، مدابغ عاملة، ونقابات حرفية صنعت حرفة البلد لقرون.",
        highlights: [
          "حي جامع القرويين ومكتبته",
          "مناظر مدبغة الشوارة",
          "مدرسة بوعنانية وفنادق الفندوق بالمدينة",
          "رحلات نهارية إلى مكناس ولوليبة الرومانية",
        ],
        faq: [
          {
            question: "هل من السهل الضياع في مدينة فاس العتيقة؟",
            answer:
              "نعم — وهذا جزء من التجربة. المدينة فيها آلاف الأزقة؛ التزموا المحاور الرئيسية بين باب بوجلود والمدابغ، وفكروا في مرشد محلي مرخص في الزيارة الأولى.",
          },
        ],
      },
    },
  },
];

export function getCityBySlug(slug: string): SampleCity | undefined {
  return sampleCities.find((c) => c.slug === slug);
}

export function cityPath(slug: string): string {
  return `/morocco/${slug}/`;
}
