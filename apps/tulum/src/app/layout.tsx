import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Marcellus, Sora } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});
const sora = Sora({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tulum Coin — El Jaguar Despierta · tulum.flowme.one",
  description:
    "Una moneda comunitaria que hace circular el valor dentro de Tulum y convierte cada acción restaurativa en fondo regenerativo — propuesto y votado por la misma comunidad.",
};

export const viewport: Viewport = { themeColor: "#132A1A" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${marcellus.variable} ${sora.variable}`}>
      <body>
        {/* hero/intro coin is a CSS background (--coin) — preload or the LCP starts late */}
        <link rel="preload" as="image" href="/tulum-coin-sm.webp" media="(max-width:900px)" fetchPriority="high" />
        <link rel="preload" as="image" href="/tulum-coin.webp" media="(min-width:901px)" fetchPriority="high" />
        {children}
      </body>
    </html>
  );
}
