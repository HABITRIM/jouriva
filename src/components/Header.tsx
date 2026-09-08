import { useTranslations } from "next-intl";
import { Logo } from "./Logo";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SearchBox } from "./SearchBox";
import { MobileNav } from "./MobileNav";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/config";

/**
 * Responsive editorial header.
 * Desktop: logo · search · language · CTA / two-tier nav below.
 * Mobile: menu · logo · language (search + full IA in the drawer).
 * Kept deliberately uncrowded per brand guidelines.
 */
export function Header() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="container-jouriva">
        {/* Row 1 */}
        <div className="flex items-center gap-3 py-3 sm:gap-4">
          <MobileNav
            primaryLabel={t("header.primaryNav")}
            secondaryLabel={t("header.secondaryNav")}
          />

          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <div className="mx-auto hidden w-full max-w-md lg:block">
            <SearchBox />
          </div>

          <div className="ms-auto flex items-center gap-3 lg:ms-0">
            <LanguageSwitcher compact />
            <Link
              href="/quiz/"
              className="hidden shrink-0 rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white transition hover:bg-terracotta-dark md:inline-block"
            >
              {t("header.cta")}
            </Link>
          </div>
        </div>

        {/* Row 2 — desktop navigation (two tiers, no overcrowding) */}
        <nav aria-label={t("header.primaryNav")} className="hidden border-t border-navy-100/70 py-1.5 lg:block">
          <ul className="flex items-center gap-6">
            {PRIMARY_NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="inline-block py-1.5 text-[0.95rem] font-bold text-navy transition hover:text-terracotta-ink"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li aria-hidden="true" className="h-4 w-px bg-navy-100" />
            {SECONDARY_NAV.filter((i) => i.key !== "about" && i.key !== "contact").map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="inline-block py-1.5 text-sm font-medium text-ink-soft transition hover:text-navy"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
