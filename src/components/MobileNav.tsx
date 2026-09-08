"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/config";
import { Link } from "@/i18n/navigation";
import { SearchBox } from "./SearchBox";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Mobile navigation drawer — full IA access on small screens:
 * primary + secondary nav, search, language switcher and CTA.
 * Scrim click and Escape close it; focus moves back to the toggle.
 */
export function MobileNav({ primaryLabel, secondaryLabel }: { primaryLabel: string; secondaryLabel: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes + focus restore
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups: { label: string; items: readonly NavItem[] }[] = [
    { label: primaryLabel, items: PRIMARY_NAV },
    { label: secondaryLabel, items: [...SECONDARY_NAV, { key: "contact", href: "/contact/" }] },
  ];

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2 text-sm font-semibold text-navy lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
        {t("header.menu")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("header.menu")}>
          <button
            type="button"
            aria-label={t("header.close")}
            className="absolute inset-0 w-full bg-navy/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
              <span className="font-display text-lg font-bold tracking-[0.14em] text-navy">JOURIVA</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm font-semibold text-navy"
              >
                {t("header.close")}
              </button>
            </div>

            <div className="border-b border-navy-100 px-4 py-3">
              <SearchBox id="mobile-search" />
            </div>

            <nav className="flex-1 px-4 py-4" aria-label={primaryLabel}>
              {groups.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="kicker mb-2">{group.label}</p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="block rounded-lg px-2 py-2.5 text-base font-semibold text-charcoal hover:bg-navy-50 hover:text-navy"
                        >
                          {t(`nav.${item.key}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3">
              <LanguageSwitcher compact />
              <Link
                href="/quiz/"
                className="rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white hover:bg-terracotta-dark"
              >
                {t("header.cta")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
