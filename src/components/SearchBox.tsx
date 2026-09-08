"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Search foundation (Phase 1): semantic, accessible search UI with a clear
 * "coming soon" response. The search index/engine itself is Phase 2 scope.
 */
export function SearchBox({ id = "site-search" }: { id?: string }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="w-full"
    >
      <label htmlFor={id} className="sr-only">
        {t("search")}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-navy-100 bg-white focus-within:outline-2 focus-within:outline-terracotta-ink">
        <input
          id={id}
          type="search"
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent px-3 py-2 text-sm text-charcoal outline-none placeholder:text-ink-soft/70"
          onChange={() => setSubmitted(false)}
        />
        <button
          type="submit"
          className="shrink-0 border-s border-navy-100 bg-sand px-3 text-sm font-semibold text-navy transition hover:bg-sand-dark"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" />
          </svg>
          <span className="sr-only">{t("search")}</span>
        </button>
      </div>
      {submitted && (
        <p className="mt-1.5 text-xs text-ink-soft" role="status">
          {locale === "ar"
            ? "البحث يصلك في مرحلة لاحقة — حاليًا تصفحوا الأقسام من القائمة."
            : locale === "es"
              ? "El buscador llega en una fase posterior; explora por secciones de momento."
              : "Site search arrives in a later phase — browse by section for now."}
        </p>
      )}
    </form>
  );
}
