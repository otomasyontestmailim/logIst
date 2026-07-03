import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gönderi Takibi — Lojistik CRM",
};

/**
 * /track, [locale] dışında yaşayan halka açık bir bölüm — kendi kök
 * layout'u olmadan <html>/<body> render edilemiyor ve globals.css
 * yüklenmiyordu. Tema: hep aydınlık (alıcıya giden nötr sayfa).
 */
export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={routing.defaultLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
