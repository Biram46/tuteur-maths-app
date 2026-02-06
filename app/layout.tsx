import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, Inter, Exo_2 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://aimaths.fr'),
  title: "Tuteur Maths | Intelligence Artificielle & Pédagogie",
  description: "Plateforme de tutorat mathématique avancée pour lycée, propulsée par l'Intelligence Artificielle. Cours, exercices corrigés et quiz interactifs.",
  keywords: ["maths", "lycée", "tutorat", "IA", "intelligence artificielle", "cours", "exercices", "première", "terminale"],
  authors: [{ name: "Tuteur Maths Team" }],
  openGraph: {
    title: "Tuteur Maths | Intelligence Artificielle & Pédagogie",
    description: "Améliorez vos notes en maths grâce à notre assistant IA.",
    url: 'https://aimaths.fr',
    siteName: 'Tuteur Maths',
    locale: 'fr_FR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${inter.variable} ${exo2.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
