import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAFIL — Gestão Financeira Familiar",
  description:
    "Controlo inteligente de receitas, despesas, orçamentos e objetivos para famílias em Portugal.",
  applicationName: "MAFIL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
