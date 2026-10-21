import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { googleFontsHref } from "@/lib/generator/styles";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PackAI Designer — designs d'emballages alimentaires par IA", template: "%s · PackAI Designer" },
  description:
    "Importez votre tracé de découpe, répondez à 10 questions et obtenez 5 designs d'emballage prêts pour la grande distribution, en vue à plat et en 3D.",
};

export const viewport: Viewport = { themeColor: "#5a2ef5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" />
        {/* Polices utilisées dans les designs d'emballage */}
        <link rel="stylesheet" href={googleFontsHref()} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
