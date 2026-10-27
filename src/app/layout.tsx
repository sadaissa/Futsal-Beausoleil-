import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Beausoleil Ultimate Team", template: "%s · Beausoleil Ultimate Team" },
  description: "Le foot en salle du lundi : votez pour le Top 5 et le Boulet de la semaine, découvrez la Team of the Week.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#07090a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="container-app flex-1 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
