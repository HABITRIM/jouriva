import type { Locale } from "@/i18n/routing";

/**
 * Global site configuration. Values here are non-secret and safe for the
 * client. Secrets/API keys must NEVER be placed in this file or prefixed
 * with NEXT_PUBLIC_ — see .env.example.
 */
export const SITE = {
  name: "JOURIVA",
  slogan: "Discover More. Travel Better.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.jouriva.com",
  contactEmail: "hello@jouriva.com",
  twitterHandle: "@jouriva",
  ogImage: {
    url: "/images/og-default.jpg",
    width: 1200,
    height: 630,
    alt: "JOURIVA — Discover More. Travel Better.",
  },
  // Update these profile URLs when official accounts go live (Phase 2+).
  socials: [
    { key: "instagram", label: "Instagram", url: "https://www.instagram.com/jouriva" },
    { key: "facebook", label: "Facebook", url: "https://www.facebook.com/jouriva" },
    { key: "x", label: "X (Twitter)", url: "https://x.com/jouriva" },
    { key: "youtube", label: "YouTube", url: "https://www.youtube.com/@jouriva" },
    { key: "pinterest", label: "Pinterest", url: "https://www.pinterest.com/jouriva" },
    { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@jouriva" },
  ],
} as const;

/** Open Graph locale codes (Facebook format) per app locale. */
export const OG_LOCALE: Record<Locale, string> = {
  ar: "ar_AR",
  en: "en_US",
  es: "es_ES",
};

/** Primary navigation (desktop tier 1). Keys map to messages.nav.* */
export const PRIMARY_NAV = [
  { key: "morocco", href: "/morocco/" },
  { key: "world", href: "/world/" },
  { key: "travelForMoroccans", href: "/travel-for-moroccans/" },
  { key: "sportsTravel", href: "/sports-travel/" },
  { key: "studyAbroad", href: "/study-abroad/" },
] as const;

/** Secondary navigation (desktop tier 2 / mobile drawer). */
export const SECONDARY_NAV = [
  { key: "travelUpdates", href: "/travel-updates/" },
  { key: "guides", href: "/guides/" },
  { key: "deals", href: "/deals/" },
  { key: "tools", href: "/tools/" },
  { key: "quiz", href: "/quiz/" },
  { key: "about", href: "/about/" },
  { key: "contact", href: "/contact/" },
] as const;

export type NavItem = { key: string; href: string };
