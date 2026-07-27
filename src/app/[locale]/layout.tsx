import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isPt = locale === "pt";
  const title = isPt
    ? "Mel — A tua vida, organizada."
    : "Mel — Your life, organised.";
  const description = isPt
    ? "Assistente pessoal inteligente: tarefas, calendário, captura por voz e relatórios semanais."
    : "Intelligent personal assistant: tasks, calendar, voice capture and weekly reports.";

  return {
    title: {
      default: title,
      template: `%s · Mel`,
    },
    description,
    applicationName: "Mel",
    appleWebApp: {
      capable: true,
      title: "Mel",
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      title,
      description,
      siteName: "Mel",
      type: "website",
      locale: isPt ? "pt_PT" : "en_GB",
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
        <div lang={locale === "pt" ? "pt-PT" : "en"}>
          {children}
          <PwaRegister />
        </div>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
