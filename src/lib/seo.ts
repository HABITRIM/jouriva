import type { Metadata } from "next";
import { SITE, OG_LOCALE } from "./config";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/routing";
import { faviconSet } from "./brand";

/**
 * SEO metadata builder — single source of truth for:
 * canonical URLs, hreflang alternates (+ x-default), Open Graph, Twitter/X
 * cards and robots directives. All Phase 1 routes use this builder so the
 * SEO foundation stays consistent as the platform grows.
 */

export type LocalePathOverrides = Partial<Record<Locale, string>>;

export interface BuildMetadataOptions {
  locale: Locale;
  /** Locale-independent path with leading AND trailing slash, e.g. "/morocco/". */
  path: string;
  /** Per-locale path overrides — used when translated slugs differ. */
  pathOverrides?: LocalePathOverrides;
  title: string;
  description: string;
  ogType?: "website" | "article";
  image?: { url: string; width?: number; height?: number; alt: string };
  publishedTime?: string;
  modifiedTime?: string;
  /** Author display names (article schema/OG) */
  authors?: string[];
  noIndex?: boolean;
}

function localePath(locale: Locale, path: string, overrides?: LocalePathOverrides): string {
  return `/${locale}${overrides?.[locale] ?? path}`;
}

export function absoluteUrl(locale: Locale, path: string, overrides?: LocalePathOverrides): string {
  return `${SITE.url}${localePath(locale, path, overrides)}`;
}

/** hreflang map: every enabled locale + x-default → default locale. */
export function buildAlternates(
  path: string,
  overrides?: LocalePathOverrides
): NonNullable<Metadata["alternates"]>["languages"] {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = absoluteUrl(locale, path, overrides);
  }
  languages["x-default"] = absoluteUrl(DEFAULT_LOCALE, path, overrides);
  return languages;
}

export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const {
    locale,
    path,
    pathOverrides,
    title,
    description,
    ogType = "website",
    image = SITE.ogImage,
    publishedTime,
    modifiedTime,
    authors,
    noIndex = false,
  } = options;

  const canonical = absoluteUrl(locale, path, pathOverrides);
  const imageUrl = image.url.startsWith("http") ? image.url : `${SITE.url}${image.url}`;

  const base: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: buildAlternates(path, pathOverrides),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE.name,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type: ogType,
      images: [
        {
          url: imageUrl,
          width: image.width ?? SITE.ogImage.width,
          height: image.height ?? SITE.ogImage.height,
          alt: image.alt,
        },
      ],
      ...(ogType === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitterHandle,
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: !noIndex,
      follow: true,
      googleBot: {
        index: !noIndex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };

  return base;
}

/** Metadata for the [locale] root layout (title template, icons, RSS). */
export function layoutMetadata(locale: Locale): Metadata {
  const fav = faviconSet();
  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} — ${SITE.slogan}`,
      template: `%s | ${SITE.name}`,
    },
    applicationName: SITE.name,
    icons: {
      icon: fav.icon,
      ...(fav.apple ? { apple: [fav.apple] } : {}),
    },
    alternates: {
      types: {
        "application/rss+xml": `${SITE.url}/${locale}/rss.xml`,
      },
    },
  };
}
