import { defineRouting } from "next-intl/routing";

/**
 * JOURIVA locales.
 * - ar = Arabic (RTL)
 * - en = English (LTR, default)
 * - es = Spanish (LTR)
 *
 * Every locale is an independent audience with independently manageable
 * content — translations are related, never duplicated 1:1 assumptions.
 */
export const routing = defineRouting({
  locales: ["ar", "en", "es"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
export const LOCALES: readonly Locale[] = routing.locales;

export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  ar: "rtl",
  en: "ltr",
  es: "ltr",
};

export const DEFAULT_LOCALE: Locale = routing.defaultLocale;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
