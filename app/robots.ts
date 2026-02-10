import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/login', '/admin/login', '/forgot-password'],
            disallow: ['/admin/', '/api/', '/assistant/', '/auth/'],
        },
        sitemap: 'https://aimaths.fr/sitemap.xml',
    };
}
