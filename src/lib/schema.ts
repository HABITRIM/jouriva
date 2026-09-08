import { SITE } from "./config";
import { logoFile } from "./brand";
import type { Locale } from "@/i18n/routing";

/**
 * Structured data (JSON-LD) builders — Organization, WebSite, BreadcrumbList,
 * FAQPage and Article. Rendered through the <JsonLd> component. Builders are
 * pure functions so the output can be tested without React.
 */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: `${SITE.url}${logoFile() ?? "/brand/logo/jouriva-symbol.svg"}`,
    slogan: SITE.slogan,
    sameAs: SITE.socials.map((s) => s.url),
  };
}

export function webSiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: `${SITE.url}/${locale}/`,
    inLanguage: locale,
    publisher: { "@type": "Organization", name: SITE.name },
    // SearchAction is intentionally omitted until on-site search ships (Phase 2+).
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleSchema(options: {
  locale: Locale;
  headline: string;
  description?: string;
  url: string;
  image: string;
  authorName: string;
  datePublished: string;
  dateModified: string;
}) {
  const imgUrl = options.image.startsWith("http") ? options.image : `${SITE.url}${options.image}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    image: [imgUrl],
    author: { "@type": "Person", name: options.authorName },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}${logoFile() ?? "/brand/logo/jouriva-symbol.svg"}` },
    },
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": options.url },
    inLanguage: options.locale,
  };
}
