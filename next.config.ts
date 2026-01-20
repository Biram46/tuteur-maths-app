import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ne pas ignorer les erreurs TypeScript en production
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ne pas ignorer les erreurs ESLint en production
    ignoreDuringBuilds: false,
  },
  // Configuration pour optimiser Vercel
  experimental: {
    // Externaliser Tesseract.js pour éviter les problèmes de bundle
    serverComponentsExternalPackages: ['tesseract.js'],
  },
  // Optimisation des images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Configuration Webpack pour compatibilité
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ne pas inclure ces modules côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
