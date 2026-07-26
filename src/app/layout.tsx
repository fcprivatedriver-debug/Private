import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { PwaSplashHide } from "@/components/pwa/PwaSplashHide";
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
  title: {
    default: "Nina",
    template: "%s · Nina",
  },
  description:
    "A vida é para ser vivida. A Nina trata das contas. Assistente financeira inteligente com IA — voz, texto e fotografia.",
  applicationName: "Nina",
  appleWebApp: {
    capable: true,
    title: "Nina",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1c2e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <meta name="apple-mobile-web-app-title" content="Nina" />
      </head>
      <body className={`${display.variable} ${body.variable}`}>
        <PwaSplashHide />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
