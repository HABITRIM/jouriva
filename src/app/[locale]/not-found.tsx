import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("common");
  return (
    <div className="container-jouriva flex flex-col items-center py-24 text-center">
      <p className="font-display text-6xl font-black text-terracotta">404</p>
      <h1 className="font-display mt-4 text-2xl font-bold text-navy">{t("pageNotFound")}</h1>
      <Link
        href="/"
        className="mt-6 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition hover:bg-navy-700"
      >
        ← {t("backHome")}
      </Link>
    </div>
  );
}
