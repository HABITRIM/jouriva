import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { HubScreen, hubGenerateMetadata } from "../hub-screen";

export const generateMetadata = hubGenerateMetadata("travel-for-moroccans");

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HubScreen hubKey="travel-for-moroccans" locale={locale} />;
}
