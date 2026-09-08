import type { Locale } from "@/i18n/routing";
import type { VerificationInfo } from "@/lib/verification";

/**
 * Typed content layer (Phase 1).
 *
 * Phase 1 ships a small, curated set of SAMPLE content as typed data. It
 * demonstrates the content architecture (per-locale independence, slugs,
 * SEO fields, verification, translation relationships) that the CMS layer
 * in Phase 2 will manage through the Prisma model (prisma/schema.prisma).
 *
 * Every entry here is placeholder/sample material — see docs/PHASE1-REPORT.md.
 */

export type PageKey =
  | "morocco"
  | "world"
  | "travel-for-moroccans"
  | "sports-travel"
  | "study-abroad"
  | "travel-updates"
  | "guides"
  | "deals"
  | "tools"
  | "quiz"
  | "about"
  | "contact";

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Fully localized content for one article version. Each locale is independent. */
export interface ArticleTranslationContent {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  h1?: string;
  excerpt: string;
  body: string[];
  faq?: FaqEntry[];
}

export interface SampleArticle {
  id: string;
  image: string;
  imageAlt: Record<Locale, string>;
  authorId: string;
  categoryKey: string;
  tags: string[];
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  /** Present on time-sensitive articles */
  verification?: VerificationInfo;
  /** Show the "verify with official sources" warning banner */
  warning?: boolean;
  translations: Record<Locale, ArticleTranslationContent>;
}

export interface CityTranslationContent {
  name: string;
  region: string;
  headline: string;
  seoTitle: string;
  metaDescription: string;
  intro: string;
  highlights: string[];
  faq: FaqEntry[];
}

export interface SampleCity {
  id: string;
  /** City slugs are transliterated and shared across locales (URL stability) */
  slug: string;
  image: string;
  imageAlt: Record<Locale, string>;
  updatedAt: string;
  translations: Record<Locale, CityTranslationContent>;
}

export interface HubTopic {
  label: Record<Locale, string>;
  /** Optional link — only to routes that exist in Phase 1 (no dead links). */
  href?: string;
}

export interface HubContent {
  key: PageKey;
  path: string; // with leading + trailing slash
  kicker: Record<Locale, string>;
  title: Record<Locale, string>;
  intro: Record<Locale, string>;
  seoTitle: Record<Locale, string>;
  metaDescription: Record<Locale, string>;
  topics: HubTopic[];
  faq?: Record<Locale, FaqEntry[]>;
  featuredArticleIds?: string[];
  showWarning?: boolean;
}

export interface AuthorProfile {
  id: string;
  key: string;
  name: string;
  avatarInitials: string;
  links?: { label: string; url: string }[];
  translations: Record<Locale, { role: string; biography: string; expertise: string[] }>;
}
