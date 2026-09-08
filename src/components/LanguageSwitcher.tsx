"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, LOCALE_DIR, type Locale } from "@/i18n/routing";

/**
 * Language switcher — navigates to the SAME page in the chosen locale
 * (path preserved), keeping the translation relationship between versions.
 * Uses a native <select> for maximum accessibility (keyboard + SR friendly).
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleChange(next: string) {
    setPending(true);
    router.replace(pathname, { locale: next });
  }

  const labels: Record<Locale, string> = {
    en: "English",
    es: "Español",
    ar: "العربية",
  };

  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      {/* Globe-free language glyph: "文/A" multilingual mark as decorative icon */}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4 shrink-0 text-ink-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="10" cy="10" r="8" />
        <path d="M2.5 10h15M10 2.2c-4.5 4.8-4.5 10.8 0 15.6M10 2.2c4.5 4.8 4.5 10.8 0 15.6" />
      </svg>
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className={`cursor-pointer rounded-md border border-navy-100 bg-white font-medium text-navy outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink ${
          compact ? "py-1 text-xs" : "py-1.5 text-sm"
        } pl-1.5 pr-6`}
        dir="ltr" // locale codes always read LTR, even on the Arabic site
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {labels[l]} ({LOCALE_DIR[l].toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
