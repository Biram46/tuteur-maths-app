import { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://aimaths.fr';
    const today = new Date().toISOString();

    // Pages statiques principales
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: today,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: today,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/entraine-toi`,
            lastModified: today,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/sujets`,
            lastModified: today,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/graph`,
            lastModified: today,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/geometre`,
            lastModified: today,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/assistant`,
            lastModified: today,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/forgot-password`,
            lastModified: today,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    // Récupérer les niveaux et chapitres dynamiquement
    try {
        const supabase = supabaseServer;

        // Fetch levels
        const { data: levels } = await supabase
            .from('levels')
            .select('id, code, label, updated_at')
            .order('position', { ascending: true });

        // Fetch chapters with published status
        const { data: chapters } = await supabase
            .from('chapters')
            .select('id, code, title, level_id, published, updated_at')
            .eq('published', true)
            .order('position', { ascending: true });

        // /cours pages (public, indexables)
        const coursIndexPage: MetadataRoute.Sitemap = [{
            url: `${baseUrl}/cours`,
            lastModified: today,
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        }];

        const levelPages: MetadataRoute.Sitemap = (levels || []).map((level: { id: string; code: string; label: string; updated_at?: string }) => ({
            url: `${baseUrl}/cours/${encodeURIComponent(level.code.toLowerCase())}`,
            lastModified: level.updated_at || today,
            changeFrequency: 'weekly' as const,
            priority: 0.85,
        }));

        // Fetch resources for additional URLs
        const { data: resources } = await supabase
            .from('resources')
            .select('id, chapter_id, kind, created_at, chapters!inner(code, level_id, published)')
            .eq('chapters.published', true);

        // Generate resource pages
        const resourcePages: MetadataRoute.Sitemap = (resources || [])
            .filter((r: { chapter_id: string }) => r.chapter_id)
            .map((resource: { chapter_id: string; kind: string; created_at?: string; chapters: { code: string; level_id: string } }) => {
                const chapter = resource.chapters;
                const level = levels?.find((l: { id: string }) => l.id === chapter?.level_id);
                return {
                    url: `${baseUrl}/resource?type=${resource.kind}&chapter=${chapter?.code}&level=${level?.code}`,
                    lastModified: resource.created_at || today,
                    changeFrequency: 'monthly' as const,
                    priority: 0.5,
                };
            });

        // /cours/[niveau]/[chapitre] pages
        const chapterPages: MetadataRoute.Sitemap = (chapters || [])
            .map((chapter: { id: string; code: string; title: string; level_id: string; published: boolean; updated_at?: string }) => {
                const level = levels?.find((l: { id: string; code: string }) => l.id === chapter.level_id);
                if (!level) return null;
                return {
                    url: `${baseUrl}/cours/${encodeURIComponent(level.code.toLowerCase())}/${encodeURIComponent(chapter.code.toLowerCase())}`,
                    lastModified: chapter.updated_at || today,
                    changeFrequency: 'monthly' as const,
                    priority: 0.75,
                };
            })
            .filter(Boolean) as MetadataRoute.Sitemap;

        return [...staticPages, ...coursIndexPage, ...levelPages, ...chapterPages, ...resourcePages];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static pages if database fails
        return staticPages;
    }
}
