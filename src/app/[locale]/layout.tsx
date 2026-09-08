import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, LOCALE_DIR } from "@/i18n/routing";
import { layoutMetadata } from "@/lib/seo";
import { fontVariables } from "@/lib/fonts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema } from "@/lib/schema";
import "@/styles/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return layoutMetadata(locale as (typeof routing.locales)[number]);
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D2B45",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const dir = LOCALE_DIR[locale as keyof typeof LOCALE_DIR];

  // Enable static rendering for this locale
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={dir} className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-white text-charcoal">
        <NextIntlClientProvider>
          <a href="#main-content" className="skip-link">
            <SkipLabel locale={locale} />
          </a>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <JsonLd data={organizationSchema()} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function SkipLabel({ locale }: { locale: string }) {
  // Localized skip link label without hooks (server component tree above providers)
  const labels: Record<string, string> = {
    en: "Skip to main content",
    es: "Saltar al contenido principal",
    ar: "الانتقال إلى المحتوى الرئيسي",
  };
  return <>{labels[locale] ?? labels.en}</>;
}
