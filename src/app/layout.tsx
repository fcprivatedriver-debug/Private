import type { Metadata } from "next";
import { Syne, Figtree } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthProvider } from "@/components/providers/AuthProvider";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Movio — Motoristas privados sob proposta",
    template: "%s · Movio",
  },
  description:
    "Marketplace de motoristas privados. Publica o teu pedido, recebe propostas e escolhe a melhor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
