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
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simon The Barber",
  description:
    "Prémiový pánsky barbershop — Simon The Barber. Rezervuj si termín online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      className={`${inter.variable} ${anton.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
