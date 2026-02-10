import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://aimaths.fr';
    // Format ISO sans millisecondes : YYYY-MM-DDTHH:mm:ssZ
    const lastModified = new Date().toISOString().split('.')[0] + 'Z';

    return [
        {
            url: baseUrl,
            lastModified: lastModified,
            changeFrequency: 'yearly',
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/admin/login`,
            lastModified: lastModified,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/forgot-password`,
            lastModified: lastModified,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];
}
