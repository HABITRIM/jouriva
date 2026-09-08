import { useTranslations } from "next-intl";
import { getAuthor } from "@/content/authors";
import type { VerificationInfo } from "@/lib/verification";

/**
 * Author block — E-E-A-T foundation. Real profiles with role, biography and
 * expertise per locale. No "By Admin", ever.
 */
export function AuthorBlock({
  authorId,
  locale,
  updatedAt,
}: {
  authorId: string;
  locale: string;
  updatedAt: string;
}) {
  const t = useTranslations("author");
  const tc = useTranslations("common");
  const author = getAuthor(authorId);
  const tr = author.translations[locale as keyof typeof author.translations];

  return (
    <section aria-label={t("profile")} className="not-prose mt-8 rounded-xl border border-navy-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy font-display text-base font-bold text-sand"
        >
          {author.avatarInitials}
        </span>
        <div>
          <p className="font-semibold text-navy">{author.name}</p>
          <p className="text-sm text-terracotta-ink">{tr.role}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{tr.biography}</p>
          <p className="mt-2 text-xs text-ink-soft">
            <span className="font-semibold">{t("expertise")}:</span> {tr.expertise.join(" · ")}
          </p>
          <p className="mt-1 text-xs text-ink-soft/80">{tc("updated", { date: updatedAt })}</p>
        </div>
      </div>
    </section>
  );
}

const STATUS_DOT: Record<VerificationInfo["status"], string> = {
  verified: "bg-emerald-500",
  needsReview: "bg-amber-500",
  outdated: "bg-orange-500",
  archived: "bg-stone-400",
};

/**
 * Verification badge — shows last-verified date + status for time-sensitive
 * content. Status labels come from locale messages (verification.*).
 */
export function VerificationBadge({ info }: { info: VerificationInfo }) {
  const t = useTranslations("verification");
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-navy-100 bg-white px-2.5 py-0.5 text-xs font-semibold text-navy`}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_DOT[info.status]}`} />
        {t(info.status)}
      </span>
      {t("lastVerified", { date: info.lastVerified })}
    </p>
  );
}

/**
 * Standing warning for time-sensitive information. Required wording:
 * "Information may change. Always verify critical requirements with official
 * sources." — localized per locale (messages.verification.warning).
 */
export function VerificationWarning() {
  const t = useTranslations("verification");
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M10 3 1.8 17h16.4L10 3Z" />
        <path d="M10 8v4M10 14.6v.4" />
      </svg>
      <p className="text-sm font-medium leading-relaxed text-amber-900">{t("warning")}</p>
    </div>
  );
}
