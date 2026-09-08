import { useTranslations } from "next-intl";
import type { FaqEntry } from "@/content/types";

/**
 * FAQ block — semantic <details>/<summary> (works without JavaScript).
 * The matching FAQPage JSON-LD is emitted by the page via faqSchema().
 */
export function Faq({ items, title }: { items: FaqEntry[]; title?: string }) {
  const t = useTranslations("hub");
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-title" className="mt-10">
      <h2 id="faq-title" className="font-display text-2xl font-bold text-navy">
        {title ?? t("faqTitle")}
      </h2>
      <div className="mt-4 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {items.map((item, i) => (
          <details key={i} className="group px-4 py-3 open:bg-sand/40 sm:px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-navy [&::-webkit-details-marker]:hidden">
              <h3 className="text-[0.98rem] font-semibold">{item.question}</h3>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4 shrink-0 text-terracotta-ink transition group-open:rotate-45"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M8 2v12M2 8h12" />
              </svg>
            </summary>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
