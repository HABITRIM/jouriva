import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Fragment } from "react";

export interface Crumb {
  name: string;
  href?: string;
}

/**
 * Breadcrumbs — visual + schema foundation. The matching BreadcrumbList
 * JSON-LD is emitted separately via breadcrumbSchema() so URLs stay absolute.
 * RTL correctness comes from logical `ms/me` utilities.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("common");
  const all: Crumb[] = [{ name: t("breadcrumbHome"), href: "/" }, ...items];

  return (
    <nav aria-label={t("breadcrumbLabel")} className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-soft">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="underline-offset-2 transition hover:text-navy hover:underline">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="font-medium text-navy">
                  {crumb.name}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-navy-100">
                  {/* direction-aware separator */}
                  <svg viewBox="0 0 8 12" className="h-3 w-2 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="m2 1 5 5-5 5" />
                  </svg>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
