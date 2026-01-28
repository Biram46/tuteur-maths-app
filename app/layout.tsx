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
  title: "Tuteur Maths | Intelligence Artificielle & Pédagogie",
  description: "Plateforme de tutorat mathématique avancée propulsée par l'IA",
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
