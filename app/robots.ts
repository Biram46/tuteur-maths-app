import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/login',
                    '/cours',
                    '/entraine-toi',
                    '/sujets',
                    '/graph',
                    '/geometre',
                    '/resource',
                    '/confidentialite',
                ],
                disallow: [
                    '/admin/',
                    '/admin/login',
                    '/admin/security',
                    '/admin/verify-2fa',
                    '/api/',
                    '/assistant/',
                    '/auth/',
                    '/test',
                    '/test-variations',
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/admin/', '/api/', '/auth/'],
            },
            {
                userAgent: 'Bingbot',
                allow: '/',
                disallow: ['/admin/', '/api/', '/auth/'],
            },
        ],
        sitemap: 'https://aimaths.fr/sitemap.xml',
        host: 'https://aimaths.fr',
    };
}
