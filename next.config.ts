import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // En production, afficher les erreurs TypeScript
    ignoreBuildErrors: false,
  },
  eslint: {
    // En production, afficher les erreurs ESLint
    ignoreDuringBuilds: false,
  },
  // Configuration pour Vercel et les Workers
  experimental: {
    // Optimisation pour les serverless functions
    serverComponentsExternalPackages: ['tesseract.js'],
  },
};

export default nextConfig;
