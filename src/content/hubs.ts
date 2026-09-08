import type { HubContent } from "./types";

/**
 * Phase 1 hub/section pages — one per primary IA entry.
 * Each hub exists independently per locale (own SEO title, meta, intro, FAQ).
 * Topic chips may link to routes that EXIST in Phase 1 only (no dead links);
 * links to future phases are intentionally omitted.
 */
export const hubs: HubContent[] = [
  {
    key: "morocco",
    path: "/morocco/",
    kicker: { en: "Morocco", es: "Marruecos", ar: "المغرب" },
    title: {
      en: "Discover Morocco, region by region",
      es: "Descubre Marruecos, región a región",
      ar: "اكتشف المغرب، جهةً بجهة",
    },
    intro: {
      en: "Practical, editor-verified guides to Morocco's cities, coasts, mountains and deserts — family trips, luxury escapes, weekend breaks and every way of getting around.",
      es: "Guías prácticas verificadas por editores sobre las ciudades, costas, montañas y desiertos de Marruecos: viajes en familia, escapadas de lujo, puentes de fin de semana y todas las formas de moverse.",
      ar: "أدلة عملية يتحقق منها المحررون عن مدن المغرب وسواحله وجباله وصحاريه — رحلات عائلية وهروب فاخر ونهايات أسبوع وكل وسائل التنقل.",
    },
    seoTitle: {
      en: "Morocco Travel Guides: Cities, Itineraries & Transport",
      es: "Guías de Viaje por Marruecos: Ciudades, Itinerarios y Transporte",
      ar: "أدلة السفر في المغرب: المدن والبرامج والتنقل",
    },
    metaDescription: {
      en: "Editor-verified Morocco travel guides: cities, family travel, luxury, adventure, food, hotels, weekend trips, trains, buses, flights and ready-made itineraries.",
      es: "Guías de viaje por Marruecos verificadas por editores: ciudades, familia, lujo, aventura, gastronomía, hoteles, puentes de fin de semana, trenes, autobuses, vuelos e itinerarios.",
      ar: "أدلة سفر موثقة للمغرب: المدن، السفر العائلي، الفخامة، المغامرة، الطعام، الفنادق، نهايات الأسبوع، القطارات، الحافلات، الطائرات والبرامج الجاهزة.",
    },
    topics: [
      { label: { en: "Cities", es: "Ciudades", ar: "المدن" } },
      { label: { en: "Family travel", es: "Viaje en familia", ar: "السفر العائلي" } },
      { label: { en: "Luxury", es: "Lujo", ar: "الفخامة" } },
      { label: { en: "Adventure", es: "Aventura", ar: "المغامرة" } },
      { label: { en: "Food", es: "Gastronomía", ar: "المطبخ" } },
      { label: { en: "Hotels", es: "Hoteles", ar: "الفنادق" } },
      { label: { en: "Weekend trips", es: "Escapadas", ar: "نهايات الأسبوع" } },
      { label: { en: "Trains & buses", es: "Trenes y autobuses", ar: "القطارات والحافلات" } },
      { label: { en: "Flights", es: "Vuelos", ar: "الطيران" } },
      { label: { en: "Transport", es: "Transporte", ar: "النقل" } },
      { label: { en: "Itineraries", es: "Itinerarios", ar: "البرامج" } },
      { label: { en: "Tours", es: "Tours", ar: "الجولات" } },
    ],
    featuredArticleIds: ["marrakech-family-48h"],
  },
  {
    key: "world",
    path: "/world/",
    kicker: { en: "World Travel", es: "Viajes por el Mundo", ar: "سفر حول العالم" },
    title: {
      en: "The world, explained for curious travelers",
      es: "El mundo, explicado para viajeros curiosos",
      ar: "العالم بأسلوب يفهمه المسافر الفضولي",
    },
    intro: {
      en: "Destination guides beyond Morocco — practical, current and written for the way people actually travel.",
      es: "Guías de destino más allá de Marruecos: prácticas, actualizadas y escritas para como se viaja de verdad.",
      ar: "أدلة وجهات خارج المغرب — عملية، محدّثة، ومكتوبة بطريقة يفهمها المسافر الحقيقي.",
    },
    seoTitle: {
      en: "World Travel Guides & Destination Resources",
      es: "Guías de Viaje por el Mundo y Recursos de Destinos",
      ar: "أدلة السفر حول العالم ومصادر الوجهات",
    },
    metaDescription: {
      en: "Destination guides beyond Morocco: practical world travel resources with the same editorial verification as our Morocco coverage.",
      es: "Guías de destino más allá de Marruecos: recursos prácticos con la misma verificación editorial que nuestra cobertura de Marruecos.",
      ar: "أدلة وجهات خارج المغرب: مصادر عملية بنفس التحقق التحريري الخاص بتغطيتنا للمغرب.",
    },
    topics: [
      { label: { en: "Europe", es: "Europa", ar: "أوروبا" } },
      { label: { en: "Asia", es: "Asia", ar: "آسيا" } },
      { label: { en: "Africa", es: "África", ar: "إفريقيا" } },
      { label: { en: "Americas", es: "Américas", ar: "الأمريكتان" } },
      { label: { en: "Middle East", es: "Oriente Medio", ar: "الشرق الأوسط" } },
    ],
  },
  {
    key: "travel-for-moroccans",
    path: "/travel-for-moroccans/",
    kicker: { en: "Travel for Moroccans", es: "Viajar desde Marruecos", ar: "السفر للمغاربة" },
    title: {
      en: "Travel for Moroccans, answered precisely",
      es: "Viajar desde Marruecos, con respuestas precisas",
      ar: "السفر للمغاربة، بإجابات دقيقة",
    },
    intro: {
      en: "The practical questions Moroccan travelers ask most: where the passport goes without a visa, what things really cost, and how to fly further for less.",
      es: "Las dudas prácticas de quien viaja desde Marruecos: a dónde llega el pasaporte sin visado, qué cuesta realmente el viaje y cómo volar más lejos por menos.",
      ar: "الأسئلة العملية التي يطرحها المسافر المغربي: إلى أين يصل الجواز بدون تأشيرة، كم تكلف الرحلة حقًا، وكيف تسافر أبعد بتكلفة أقل.",
    },
    seoTitle: {
      en: "Travel for Moroccans: Visas, Costs & Cheapest Flights",
      es: "Viajar desde Marruecos: Visados, Costes y Vuelos Baratos",
      ar: "السفر للمغاربة: التأشيرات والتكاليف وأرخص الرحلات",
    },
    metaDescription: {
      en: "Visa-free and easy-visa destinations for Moroccan passport holders, realistic travel costs, cheapest flight strategies, best seasons and entry requirements — verified and dated.",
      es: "Destinos sin visado y con visado fácil para el pasaporte marroquí, costes reales, estrategias de vuelos baratos, mejores temporadas y requisitos de entrada — verificados y fechados.",
      ar: "وجهات بدون تأشيرة أو بتأشيرة سهلة لحاملي الجواز المغربي، تكاليف واقعية، استراتيجيات أرخص الرحلات، أفضل المواسم ومتطلبات الدخول — موثقة ومؤرخة.",
    },
    topics: [
      { label: { en: "Visa-free destinations", es: "Destinos sin visado", ar: "وجهات بدون تأشيرة" } },
      { label: { en: "Easy-visa destinations", es: "Visado fácil", ar: "تأشيرة سهلة" } },
      { label: { en: "Travel costs", es: "Costes de viaje", ar: "تكاليف السفر" } },
      { label: { en: "Cheapest flights", es: "Vuelos baratos", ar: "أرخص الرحلات" } },
      { label: { en: "Best time to travel", es: "Mejor época", ar: "أفضل وقت للسفر" } },
      { label: { en: "Requirements", es: "Requisitos", ar: "المتطلبات" } },
      { label: { en: "Family travel", es: "Viaje en familia", ar: "السفر العائلي" } },
    ],
    featuredArticleIds: ["visa-free-moroccan-passport"],
    showWarning: true,
  },
  {
    key: "sports-travel",
    path: "/sports-travel/",
    kicker: { en: "Sports Travel", es: "Viajes Deportivos", ar: "السفر الرياضي" },
    title: {
      en: "Plan trips around the world's biggest events",
      es: "Planifica viajes en torno a los grandes eventos",
      ar: "خططوا لرحلاتكم حول أكبر الأحداث الرياضية",
    },
    intro: {
      en: "A complete fan-planning path for every major event — host country, city, venue, hotels, flights, visas, transport, budgets and matchday guides. Event by event, edition by edition.",
      es: "Un camino completo de planificación para aficionados en cada gran evento: país sede, ciudad, estadio, hoteles, vuelos, visados, transporte, presupuestos y guías de partido. Evento a evento, edición a edición.",
      ar: "مسار تخطيط كامل للجماهير في كل حدث كبير — البلد المستضيف، المدينة، الملعب، الفنادق، الرحلات، التأشيرات، النقل، الميزانيات وأدلة يوم المباراة. حدثًا بحدث، ونسخةً بنسخة.",
    },
    seoTitle: {
      en: "Sports Travel: World Cup, Olympics, AFCON & Fan Guides",
      es: "Viajes Deportivos: Mundial, Juegos Olímpicos, CAN y Guías para Aficionados",
      ar: "السفر الرياضي: المونديال، الأولمبياد، أمم إفريقيا وأدلة الجماهير",
    },
    metaDescription: {
      en: "Fan travel planning for the FIFA World Cup, Olympics, AFCON, Champions League, Formula 1 and tennis — host cities, venues, hotels, flights, visas and budgets.",
      es: "Planificación de viajes para aficionados: Mundial, Juegos Olímpicos, CAN, Champions League, Fórmula 1 y tenis — ciudades sede, estadios, hoteles, vuelos, visados y presupuestos.",
      ar: "تخطيط سفر الجماهير لكأس العالم والأولمبياد وأمم إفريقيا ودوري الأبطال والفورمولا 1 والتنس — المدن المستضيفة، الملاعب، الفنادق، الرحلات، التأشيرات والميزانيات.",
    },
    topics: [
      { label: { en: "FIFA World Cup", es: "Mundial FIFA", ar: "كأس العالم" }, href: "/guides/" },
      { label: { en: "Olympics", es: "Juegos Olímpicos", ar: "الألعاب الأولمبية" } },
      { label: { en: "AFCON", es: "CAN", ar: "كأس أمم إفريقيا" } },
      { label: { en: "Champions League", es: "Champions League", ar: "دوري الأبطال" } },
      { label: { en: "Formula 1", es: "Fórmula 1", ar: "الفورمولا 1" } },
      { label: { en: "Tennis", es: "Tenis", ar: "التنس" } },
    ],
    featuredArticleIds: ["world-cup-2030-fans"],
    showWarning: true,
  },
  {
    key: "study-abroad",
    path: "/study-abroad/",
    kicker: { en: "Study Abroad", es: "Estudiar en el Extranjero", ar: "الدراسة بالخارج" },
    title: {
      en: "Study abroad, from shortlist to arrival",
      es: "Estudiar en el extranjero, de la lista corta a la llegada",
      ar: "الدراسة بالخارج، من القائمة المختصرة إلى الوصول",
    },
    intro: {
      en: "A practical hub for studying in Spain, France, Germany, the UK, Turkey, China, Malaysia, Canada and beyond — universities, tuition, scholarships, visas and student life.",
      es: "Un hub práctico para estudiar en España, Francia, Alemania, Reino Unido, Turquía, China, Malasia, Canadá y más: universidades, matrículas, becas, visados y vida estudiantil.",
      ar: "منصة عملية للدراسة في إسبانيا وفرنسا وألمانيا والمملكة المتحدة وتركيا والصين وماليزيا وكندا وغيرها — الجامعات، الرسوم، المنح، التأشيرات والحياة الطلابية.",
    },
    seoTitle: {
      en: "Study Abroad Hub: Universities, Scholarships & Student Visas",
      es: "Estudiar en el Extranjero: Universidades, Becas y Visados de Estudiante",
      ar: "الدراسة بالخارج: الجامعات والمنح وتأشيرات الطلاب",
    },
    metaDescription: {
      en: "Study abroad resources for Moroccan and international students: universities, tuition, living costs, scholarships, student visas, accommodation, insurance and student life.",
      es: "Recursos para estudiar en el extranjero: universidades, matrículas, costes de vida, becas, visados de estudiante, alojamiento, seguros y vida estudiantil.",
      ar: "مصادر الدراسة بالخارج: الجامعات، الرسوم، تكاليف المعيشة، المنح، تأشيرات الطلاب، الإقامة، التأمين والحياة الطلابية.",
    },
    topics: [
      { label: { en: "Spain", es: "España", ar: "إسبانيا" } },
      { label: { en: "France", es: "Francia", ar: "فرنسا" } },
      { label: { en: "Germany", es: "Alemania", ar: "ألمانيا" } },
      { label: { en: "United Kingdom", es: "Reino Unido", ar: "المملكة المتحدة" } },
      { label: { en: "Turkey", es: "Turquía", ar: "تركيا" } },
      { label: { en: "China", es: "China", ar: "الصين" } },
      { label: { en: "Malaysia", es: "Malasia", ar: "ماليزيا" } },
      { label: { en: "Canada", es: "Canadá", ar: "كندا" } },
    ],
    showWarning: true,
  },
  {
    key: "travel-updates",
    path: "/travel-updates/",
    kicker: { en: "Travel Updates", es: "Actualizaciones de Viaje", ar: "مستجدات السفر" },
    title: {
      en: "What changed in travel, and when we checked",
      es: "Qué ha cambiado en los viajes, y cuándo lo comprobamos",
      ar: "ما تغيّر في عالم السفر، ومتى تحققنا منه",
    },
    intro: {
      en: "Route changes, visa changes, airport and railway updates, hotel openings and entry requirements — each with a last-verified date and a clear verification status.",
      es: "Cambios de rutas, visados, aeropuertos y ferrocarriles, aperturas de hoteles y requisitos de entrada — cada uno con fecha de verificación y estado claro.",
      ar: "تغييرات المسارات والتأشيرات والمطارات والسكك، افتتاحات الفنادق ومتطلبات الدخول — كل خبر بتاريخ تحقق وحالة واضحة.",
    },
    seoTitle: {
      en: "Travel Updates: Visa, Route & Entry Requirement Changes",
      es: "Actualizaciones de Viaje: Cambios de Visados, Rutas y Requisitos",
      ar: "مستجدات السفر: تغييرات التأشيرات والمسارات ومتطلبات الدخول",
    },
    metaDescription: {
      en: "Time-sensitive travel news with verification built in: airline route changes, visa changes, airport updates, hotel openings and entry requirements.",
      es: "Noticias de viaje sensibles al tiempo con verificación integrada: cambios de rutas aéreas, visados, aeropuertos, aperturas de hoteles y requisitos de entrada.",
      ar: "أخبار سفر حساسة للوقت مع تحقق مدمج: تغييرات مسارات الطيران، التأشيرات، المطارات، افتتاحات الفنادق ومتطلبات الدخول.",
    },
    topics: [
      { label: { en: "Airline routes", es: "Rutas aéreas", ar: "مسارات الطيران" } },
      { label: { en: "Visa changes", es: "Cambios de visado", ar: "تغييرات التأشيرات" } },
      { label: { en: "Airports", es: "Aeropuertos", ar: "المطارات" } },
      { label: { en: "Hotel openings", es: "Aperturas de hoteles", ar: "افتتاح الفنادق" } },
      { label: { en: "Railways", es: "Ferrocarriles", ar: "السكك الحديدية" } },
      { label: { en: "Entry requirements", es: "Requisitos de entrada", ar: "متطلبات الدخول" } },
    ],
    showWarning: true,
  },
  {
    key: "guides",
    path: "/guides/",
    kicker: { en: "Travel Guides", es: "Guías de Viaje", ar: "أدلة السفر" },
    title: {
      en: "Long-form guides, checked line by line",
      es: "Guías en profundidad, revisadas línea a línea",
      ar: "أدلة شاملة، مدققة سطرًا بسطر",
    },
    intro: {
      en: "In-depth, editorially reviewed travel guides — itineraries, city companions and planning explainers you can trust on the road.",
      es: "Guías de viaje en profundidad revisadas editorialmente: itinerarios, acompañantes de ciudad y explicativos de planificación en los que puedes confiar.",
      ar: "أدلة سفر شاملة بمراجعة تحريرية — برامج وأدلة مدن وشرح التخطيط التي تثق بها في الطريق.",
    },
    seoTitle: {
      en: "Travel Guides: Itineraries, City Guides & Planning",
      es: "Guías de Viaje: Itinerarios, Guías de Ciudad y Planificación",
      ar: "أدلة السفر: البرامج وأدلة المدن والتخطيط",
    },
    metaDescription: {
      en: "Editorially reviewed travel guides: itineraries, city companions and planning explainers with verification dates and expert authors.",
      es: "Guías de viaje revisadas editorialmente: itinerarios, guías de ciudad y planificación con fechas de verificación y autores expertos.",
      ar: "أدلة سفر بمراجعة تحريرية: برامج، أدلة مدن وتخطيط بتواريخ تحقق ومؤلفون متخصصون.",
    },
    topics: [
      { label: { en: "Itineraries", es: "Itinerarios", ar: "البرامج" } },
      { label: { en: "City guides", es: "Guías de ciudad", ar: "أدلة المدن" } },
      { label: { en: "Budget planning", es: "Presupuestos", ar: "تخطيط الميزانية" } },
      { label: { en: "Transport explainers", es: "Transporte", ar: "شرح النقل" } },
    ],
    featuredArticleIds: [
      "marrakech-family-48h",
      "visa-free-moroccan-passport",
      "world-cup-2030-fans",
    ],
  },
  {
    key: "deals",
    path: "/deals/",
    kicker: { en: "Deals", es: "Ofertas", ar: "العروض" },
    title: {
      en: "Deals worth your browser history",
      es: "Ofertas que valen tu tiempo",
      ar: "عروض تستحق وقتك",
    },
    intro: {
      en: "Curated flight, hotel and travel-service offers — transparently labelled, independently curated, and never influencing our editorial verdicts.",
      es: "Ofertas de vuelos, hoteles y servicios de viaje — etiquetadas con transparencia, curadas de forma independiente y sin influir en nuestro criterio editorial.",
      ar: "عروض منتقاة للطيران والفنادق وخدمات السفر — موسومة بشفافية ومنتقاة باستقلالية دون أن تؤثر على تقييماتنا التحريرية.",
    },
    seoTitle: {
      en: "Travel Deals: Flights, Hotels & Tours",
      es: "Ofertas de Viaje: Vuelos, Hoteles y Tours",
      ar: "عروض السفر: الطيران والفنادق والجولات",
    },
    metaDescription: {
      en: "Curated travel deals — flights, hotels, tours and travel services. Transparently labelled affiliate offers, clearly separated from editorial content.",
      es: "Ofertas de viaje curadas: vuelos, hoteles, tours y servicios. Ofertas de afiliados etiquetadas con transparencia, separadas del contenido editorial.",
      ar: "عروض سفر منتقاة: الطيران والفنادق والجولات والخدمات. عروض تسويق بالعمولة موسومة بشفافية ومفصولة عن المحتوى التحريري.",
    },
    topics: [
      { label: { en: "Flights", es: "Vuelos", ar: "الطيران" } },
      { label: { en: "Hotels", es: "Hoteles", ar: "الفنادق" } },
      { label: { en: "Apartments", es: "Apartamentos", ar: "الشقق" } },
      { label: { en: "Tours", es: "Tours", ar: "الجولات" } },
      { label: { en: "Travel insurance", es: "Seguro de viaje", ar: "تأمين السفر" } },
      { label: { en: "eSIM", es: "eSIM", ar: "eSIM" } },
    ],
  },
  {
    key: "tools",
    path: "/tools/",
    kicker: { en: "Travel Tools", es: "Herramientas de Viaje", ar: "أدوات السفر" },
    title: {
      en: "Tools that do the travel math for you",
      es: "Herramientas que hacen los números del viaje por ti",
      ar: "أدوات تحسب لك رحلتك",
    },
    intro: {
      en: "A growing toolkit for planning: currency conversion, trip budgets, packing checklists, time zones, distances and a future visa checker — informational only, never legal advice.",
      es: "Un kit de planificación en crecimiento: conversión de moneda, presupuestos, listas de equipaje, husos horarios, distancias y un futuro verificador de visados — solo informativo, nunca asesoría legal.",
      ar: "صندوق أدوات متجدد للتخطيط: تحويل العملات، ميزانية الرحلة، قوائم الحقيبة، الفرق الزمني، المسافات، وفاحص تأشيرات مستقبلي — للمعلومة فقط وليس استشارة قانونية.",
    },
    seoTitle: {
      en: "Travel Tools: Currency Converter, Budgets & Checklists",
      es: "Herramientas de Viaje: Conversor, Presupuestos y Checklists",
      ar: "أدوات السفر: محول العملات والميزانيات وقوائم التجهيز",
    },
    metaDescription: {
      en: "Free travel planning tools: currency converter, trip budget calculator, packing checklist, timezone converter, distance calculator and an informational visa checker.",
      es: "Herramientas gratuitas de planificación: conversor de moneda, calculadora de presupuesto, checklist de equipaje, husos horarios, distancias y verificador informativo de visados.",
      ar: "أدوات مجانية للتخطيط: محول عملات، حاسبة ميزانية، قائمة تجهيز الحقيبة، محول التوقيت، حاسبة المسافات وفاحص تأشيرات معلوماتي.",
    },
    topics: [
      { label: { en: "Currency converter", es: "Conversor de moneda", ar: "محول العملات" } },
      { label: { en: "Trip budget calculator", es: "Calculadora de presupuesto", ar: "حاسبة ميزانية الرحلة" } },
      { label: { en: "Packing checklist", es: "Checklist de equipaje", ar: "قائمة التجهيز" } },
      { label: { en: "Timezone converter", es: "Husos horarios", ar: "محول التوقيت" } },
      { label: { en: "Distance calculator", es: "Calculadora de distancias", ar: "حاسبة المسافات" } },
      { label: { en: "Trip planner", es: "Planificador de viaje", ar: "مخطط الرحلات" } },
      { label: { en: "Visa checker (coming later)", es: "Verificador de visados (próximamente)", ar: "فاحص التأشيرات (قريبًا)" } },
    ],
  },
  {
    key: "quiz",
    path: "/quiz/",
    kicker: { en: "Destination Quiz", es: "Quiz de Destinos", ar: "اختبار الوجهات" },
    title: {
      en: "Find your next destination",
      es: "Encuentra tu próximo destino",
      ar: "اعثر على وجهتك القادمة",
    },
    intro: {
      en: "Answer a few questions about your budget, travel style and pace — and get five destinations that actually fit, with costs, seasons, visa info and guides. Coming soon.",
      es: "Responde unas preguntas sobre tu presupuesto, estilo y ritmo de viaje, y recibe cinco destinos que encajan de verdad: costes, temporadas, visados y guías. Muy pronto.",
      ar: "أجب عن أسئلة قليلة حول ميزانيتك وأسلوبك وإيقاع سفرك — واحصل على خمس وجهات تناسبك فعلًا، مع التكاليف والمواسم والتأشيرات والأدلة. قريبًا.",
    },
    seoTitle: {
      en: "Find Your Next Destination — Smart Travel Quiz",
      es: "Encuentra tu Próximo Destino — Quiz de Viaje Inteligente",
      ar: "اعثر على وجهتك القادمة — اختبار سفر ذكي",
    },
    metaDescription: {
      en: "Take the JOURIVA destination quiz: answer questions about budget, duration, travel style and season — get five destinations that fit, with costs, visa info and guides.",
      es: "Haz el quiz de destinos de JOURIVA: presupuesto, duración, estilo y temporada — recibe cinco destinos que encajan con costes, visados y guías.",
      ar: "شارك في اختبار وجهات JOURIVA: الميزانية، المدة، أسلوب السفر والموسم — واحصل على خمس وجهات مناسبة مع التكاليف والتأشيرات والأدلة.",
    },
    topics: [
      { label: { en: "Coming soon", es: "Muy pronto", ar: "قريبًا" } },
    ],
  },
  {
    key: "about",
    path: "/about/",
    kicker: { en: "About", es: "Quiénes Somos", ar: "من نحن" },
    title: {
      en: "About JOURIVA",
      es: "Sobre JOURIVA",
      ar: "عن JOURIVA",
    },
    intro: {
      en: "JOURIVA is a multilingual travel media and discovery platform with Moroccan roots — helping the world discover Morocco, and Moroccan travelers discover the world.",
      es: "JOURIVA es una plataforma multilingüe de viajes y descubrimiento con raíces marroquíes: ayudamos al mundo a descubrir Marruecos y a los viajeros marroquíes a descubrir el mundo.",
      ar: "JOURIVA منصة إعلامية متعددة اللغات للسفر والاكتشاف بجذور مغربية — نساعد العالم على اكتشاف المغرب، والمسافر المغربي على اكتشاف العالم.",
    },
    seoTitle: {
      en: "About JOURIVA — Our Mission & Editorial Standards",
      es: "Sobre JOURIVA — Misión y Estándares Editoriales",
      ar: "عن JOURIVA — رسالتنا ومعاييرنا التحريرية",
    },
    metaDescription: {
      en: "Learn about JOURIVA: a multilingual travel media platform with Moroccan roots, our editorial standards, verification process and how we work.",
      es: "Conoce JOURIVA: plataforma multilingüe de viajes con raíces marroquíes, nuestros estándares editoriales, proceso de verificación y forma de trabajo.",
      ar: "تعرّف على JOURIVA: منصة سفر متعددة اللغات بجذور مغربية، معاييرنا التحريرية، عملية التحقق وطريقة عملنا.",
    },
    topics: [
      { label: { en: "Editorial standards", es: "Estándares editoriales", ar: "المعايير التحريرية" } },
      { label: { en: "Verification process", es: "Proceso de verificación", ar: "عملية التحقق" } },
      { label: { en: "How we fund the site", es: "Cómo nos financiamos", ar: "كيف نموّل الموقع" } },
    ],
  },
  {
    key: "contact",
    path: "/contact/",
    kicker: { en: "Contact", es: "Contacto", ar: "اتصل بنا" },
    title: {
      en: "Get in touch",
      es: "Ponte en contacto",
      ar: "تواصل معنا",
    },
    intro: {
      en: "Questions, corrections, partnerships or story ideas — we read everything and answer what matters.",
      es: "Preguntas, correcciones, colaboraciones o ideas de historias: lo leemos todo y respondemos a lo que importa.",
      ar: "أسئلة، تصحيحات، شراكات أو أفكار — نقرأ كل شيء ونرد على ما يستحق.",
    },
    seoTitle: {
      en: "Contact JOURIVA",
      es: "Contacto — JOURIVA",
      ar: "اتصل بـ JOURIVA",
    },
    metaDescription: {
      en: "Contact the JOURIVA team: editorial questions, corrections, partnerships, advertising and study-abroad services.",
      es: "Contacta con el equipo de JOURIVA: cuestiones editoriales, correcciones, colaboraciones, publicidad y servicios de estudio en el extranjero.",
      ar: "تواصل مع فريق JOURIVA: أسئلة تحريرية، تصحيحات، شراكات، إعلانات وخدمات الدراسة بالخارج.",
    },
    topics: [
      { label: { en: "Editorial & corrections", es: "Redacción y correcciones", ar: "التحرير والتصحيحات" } },
      { label: { en: "Partnerships", es: "Colaboraciones", ar: "الشراكات" } },
      { label: { en: "Advertising", es: "Publicidad", ar: "الإعلانات" } },
    ],
  },
];

export function getHub(key: string): HubContent | undefined {
  return hubs.find((h) => h.key === key);
}
