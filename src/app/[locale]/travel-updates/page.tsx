import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { HubScreen, hubGenerateMetadata } from "../hub-screen";

export const generateMetadata = hubGenerateMetadata("travel-updates");

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HubScreen hubKey="travel-updates" locale={locale} />;
}
