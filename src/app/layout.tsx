import type { ReactNode } from "react";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>{children}</body>
    </html>
  );
}
