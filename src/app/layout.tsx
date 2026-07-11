import type { Metadata } from "next";
import { Inter, Anton, Space_Mono } from "next/font/google";
import "./globals.css";

// Inter = text. Anton = ťažký kondenzovaný street display (nadpisy, wordmark).
// Space Mono = technický akcent (čísla sekcií, badge, ticker).
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-anton",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simonsthebarber.sk"),
  title: {
    default: "Simon'S The Barber — Kuklov | Pánsky barbershop",
    template: "%s | Simon'S The Barber",
  },
  description:
    "Simon'S The Barber — prémiový pánsky barbershop v Kuklove. Precízne strihy, fade a úprava brady. Rezervuj si termín online.",
  keywords: ["barbershop", "Kuklov", "pánsky strih", "fade", "brada", "Simon"],
  openGraph: {
    title: "Simon'S The Barber — Kuklov",
    description:
      "Pánsky barbershop v Kuklove. Strihy, fade, úprava brady. Rezervuj si termín online.",
    type: "website",
    locale: "sk_SK",
    siteName: "Simon'S The Barber",
    // TODO: ideálne vlastný 1200×630 OG obrázok; zatiaľ fotka z galérie.
    images: [
      {
        url: "/galeria/strih-1.jpg",
        width: 1179,
        height: 1371,
        alt: "Simon'S The Barber — Kuklov",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${anton.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
