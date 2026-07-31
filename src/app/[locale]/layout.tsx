import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { routing, type AppLocale } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "@/app/globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: {
      default: `${t("appName")} — ${t("tagline")}`,
      template: `%s · ${t("appName")}`,
    },
    description: t("tagline"),
    openGraph: {
      title: `${t("appName")} — ${t("tagline")}`,
      description: t("tagline"),
      siteName: t("appName"),
      type: "website",
      locale: locale === "pt" ? "pt_PT" : "en_GB",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <div
          lang={locale}
          className={`${display.variable} ${body.variable} has-bottom-nav`}
        >
          <RegisterSW />
          <DemoModeBanner />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
