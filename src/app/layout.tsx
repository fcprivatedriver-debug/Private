import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BRAND_META, BRAND_NAME } from "@/config/brand";
import Link from "next/link";

const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: BRAND_META.titleDefault,
    template: BRAND_META.titleTemplate,
  },
  description: BRAND_META.description,
  applicationName: BRAND_NAME,
  icons: {
    icon: [{ url: "/brand/zelu-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/zelu-mark.svg", type: "image/svg+xml" }],
  },
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
          <footer className="site-footer">
            <div className="container site-footer-inner">
              <span>
                © {new Date().getFullYear()} {BRAND_NAME}
              </span>
              <nav className="nav-links">
                <Link href="/termos">Termos</Link>
                <Link href="/privacidade">Privacidade</Link>
                <Link href="/como-funciona">Como funciona</Link>
              </nav>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
