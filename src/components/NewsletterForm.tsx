"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Newsletter capture foundation (Phase 1): accessible client-side form with
 * honest demo behaviour. Provider integration (Phase 4) replaces the local
 * state handling — the form contract (email + locale + source) matches the
 * NewsletterSubscriber entity in the data model.
 */
export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const t = useTranslations("footer");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div>
        <p className="text-sm font-semibold text-emerald-300" role="status">
          {t("newsletterSuccess")}
        </p>
        <p className="mt-1 text-xs text-sand/60">{t("newsletterDemo")}</p>
      </div>
    );
  }

  return (
    <form
      className="max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        // Phase 1 demo: no provider call. Phase 4 wires provider here (server-side key).
        setDone(true);
      }}
    >
      <label htmlFor={`newsletter-${source}`} className="sr-only">
        {t("newsletterEmailLabel")}
      </label>
      <div className="flex overflow-hidden rounded-lg bg-white/10 ring-1 ring-inset ring-white/25 focus-within:ring-2 focus-within:ring-terracotta-bright">
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletterEmailLabel")}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-sand/50"
        />
        <button
          type="submit"
          className="shrink-0 bg-terracotta px-4 text-sm font-bold text-white transition hover:bg-terracotta-dark"
        >
          {t("newsletterCta")}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-sand/60">{t("newsletterPrivacyNote")}</p>
      <p className="mt-1 text-xs text-sand/40">{t("newsletterDemo")}</p>
      {/* locale + source travel with the subscription in Phase 4 */}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
    </form>
  );
}
