import { useTranslations } from "next-intl";
import { Logo } from "./Logo";
import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "./NewsletterForm";
import { SITE } from "@/lib/config";

/**
 * Site footer: mission tagline, full IA columns (including About/Contact and
 * legal placeholders), social profiles, language-independent slogan and the
 * newsletter capture foundation.
 */
export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  const columns: { title: string; links: { key: string; href: string }[] }[] = [
    {
      title: t("footer.explore"),
      links: [
        { key: "morocco", href: "/morocco/" },
        { key: "world", href: "/world/" },
        { key: "guides", href: "/guides/" },
        { key: "deals", href: "/deals/" },
      ],
    },
    {
      title: t("footer.platform"),
      links: [
        { key: "travelForMoroccans", href: "/travel-for-moroccans/" },
        { key: "sportsTravel", href: "/sports-travel/" },
        { key: "studyAbroad", href: "/study-abroad/" },
        { key: "travelUpdates", href: "/travel-updates/" },
        { key: "tools", href: "/tools/" },
        { key: "quiz", href: "/quiz/" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { key: "about", href: "/about/" },
        { key: "contact", href: "/contact/" },
      ],
    },
  ];

  return (
    <footer className="navy-section bg-star-motif mt-16">
      <div className="container-jouriva py-12">
        {/* Newsletter */}
        <div className="mb-10 grid gap-6 border-b border-white/10 pb-10 md:grid-cols-2">
          <div>
            <p className="kicker">{t("footer.platform")}</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">{t("footer.newsletterTitle")}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-sand/75">{t("footer.newsletterSubtitle")}</p>
          </div>
          <div className="md:justify-self-end md:self-center w-full">
            <NewsletterForm source="footer" />
          </div>
        </div>

        {/* Columns + brand */}
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <Logo inverted />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-sand/75">{t("footer.tagline")}</p>
            <p className="kicker mt-4">{t("brand.slogan")}</p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-sm text-sand/75 transition hover:text-white">
                      {t(`nav.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Social + legal */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t("footer.follow")}>
            {SITE.socials.map((s) => (
              <li key={s.key}>
                <a
                  href={s.url}
                  rel="me noopener"
                  className="text-sm font-medium text-sand/75 transition hover:text-white"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-sand/50">
            <li>{t("footer.privacy")}</li>
            <li>{t("footer.terms")}</li>
            <li>{t("footer.editorialPolicy")}</li>
            <li>{t("footer.affiliateDisclosure")}</li>
          </ul>
        </div>
        <p className="mt-4 text-xs text-sand/50">{t("footer.rights", { year })}</p>
      </div>
    </footer>
  );
}
