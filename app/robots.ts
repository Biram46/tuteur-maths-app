import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/'], // On évite d'indexer la partie admin et API
        },
        sitemap: 'https://aimaths.fr/sitemap.xml',
    };
}
