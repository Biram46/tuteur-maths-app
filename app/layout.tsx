import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron, Inter, Exo_2 } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css'; // ← GLOBAL : garantit le rendu KaTeX sur toutes les pages


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

  // Titre et description optimisés pour le marché français
  title: {
    default: "Tuteur Maths | Cours et Exercices de Mathématiques Lycée - Première & Terminale",
    template: "%s | Tuteur Maths - Cours Maths Lycée"
  },
  description: "Plateforme de mathématiques pour le lycée français. Cours complets, exercices corrigés, quiz interactifs et assistant IA pour la Première et Terminale. Préparation au Bac de maths avec méthodes et annales.",

  // Mots-clés optimisés pour le marché français
  keywords: [
    // Mots-clés principaux
    "cours maths lycée",
    "exercices maths corrigés",
    "mathématiques première",
    "mathématiques terminale",
    "préparation bac maths",
    // Spécificités programmes français
    "maths première générale",
    "maths terminale générale",
    "maths première technologique",
    "spécialité maths",
    "maths complémentaires",
    // Thèmes du programme
    "suites numériques",
    "fonctions dérivées",
    "nombres complexes",
    "probabilités",
    "statistiques",
    "géométrie plane",
    "équations différentielles",
    "primitives intégrales",
    // Types de ressources
    "cours maths pdf",
    "exercices corrigés maths",
    "annales bac maths",
    "quiz maths interactif",
    "tuteur maths en ligne",
    // Intentions de recherche
    "réviser maths bac",
    "aide devoirs maths",
    "comprendre maths lycée",
    "méthode maths",
  ],

  authors: [{ name: "Tuteur Maths", url: "https://aimaths.fr" }],
  creator: "Tuteur Maths",
  publisher: "Tuteur Maths",

  // Open Graph pour partage social
  openGraph: {
    title: "Tuteur Maths | Cours et Exercices de Mathématiques Lycée",
    description: "Réussissez vos maths au lycée avec nos cours complets, exercices corrigés et assistant IA. Première et Terminale - Préparation au Bac.",
    url: 'https://aimaths.fr',
    siteName: 'Tuteur Maths',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tuteur Maths - Plateforme de mathématiques pour le lycée',
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'Tuteur Maths | Cours Maths Lycée - Première & Terminale',
    description: 'Cours complets, exercices corrigés et assistant IA pour réussir en maths au lycée.',
    images: ['/og-image.png'],
    creator: '@tuteurmaths',
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Alternates pour i18n (si applicable)
  alternates: {
    canonical: 'https://aimaths.fr',
  },

  // Autres métadonnées
  category: 'Education',
  classification: 'Educational Platform',

  // Verification (à configurer avec Google Search Console)
  verification: {
    google: 'Fft0fkKbrGC59nLFPzOGTHmwxel_6AISTAy95sIkWJc',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

// JSON-LD Structured Data pour l'éducation
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Tuteur Maths",
  "url": "https://aimaths.fr",
  "logo": "https://aimaths.fr/logo.png",
  "description": "Plateforme de mathématiques pour le lycée français. Cours, exercices corrigés et assistant IA pour la Première et Terminale.",
  "slogan": "Réussissez vos maths au lycée",
  "foundingDate": "2025",
  "inLanguage": "fr-FR",
  "audience": {
    "@type": "Audience",
    "audienceType": ["High school students", "Lycéens"]
  },
  "educationalLevel": [
    {
      "@type": "EducationalLevel",
      "name": "Première",
      "description": "Classe de Première - Lycée français"
    },
    {
      "@type": "EducationalLevel",
      "name": "Terminale",
      "description": "Classe de Terminale - Lycée français"
    }
  ],
  "subject": [
    {
      "@type": "Thing",
      "name": "Mathématiques",
      "sameAs": "https://fr.wikipedia.org/wiki/Mathématiques"
    }
  ],
  "offers": {
    "@type": "Offer",
    "category": "Educational",
    "price": "0",
    "priceCurrency": "EUR",
    "description": "Accès gratuit aux cours et exercices"
  },
  "sameAs": [
    "https://twitter.com/tuteurmaths",
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://aimaths.fr/recherche?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${inter.variable} ${exo2.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
