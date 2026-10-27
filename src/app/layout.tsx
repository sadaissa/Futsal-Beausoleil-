import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Adresse publique du site (fournie automatiquement par Vercel), utilisée pour les liens
// absolus des aperçus de partage (WhatsApp, iMessage…).
const siteUrl = process.env.AUTH_URL
  ? process.env.AUTH_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

const description =
  "Le foot en salle du lundi : votez pour le Top 5 et le Boulet de la semaine, découvrez la Team of the Week.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Beausoleil Ultimate Team", template: "%s · Beausoleil Ultimate Team" },
  description,
  applicationName: "Beausoleil Ultimate Team",
  appleWebApp: { capable: true, title: "Beausoleil UT", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Beausoleil Ultimate Team",
    title: "Beausoleil Ultimate Team",
    description,
  },
  twitter: { card: "summary_large_image", title: "Beausoleil Ultimate Team", description },
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
