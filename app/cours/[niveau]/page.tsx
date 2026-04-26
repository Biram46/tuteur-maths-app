import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

export const revalidate = 3600;

type Props = { params: Promise<{ niveau: string }> };

export async function generateStaticParams() {
    const { data: levels } = await supabaseServer
        .from('levels')
        .select('code');
    return ((levels as { code: string }[]) || []).map((l) => ({
        niveau: l.code.toLowerCase(),
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { niveau } = await params;

    const { data: level } = await supabaseServer
        .from('levels')
        .select('label, code')
        .ilike('code', niveau)
        .single();

    if (!level) return { title: 'Niveau introuvable' };

    const label = level.label as string;
    const title = `Cours de Maths ${label} | Exercices Corrigés - Tuteur Maths`;
    const description = `Tous les cours et exercices de mathématiques pour la classe de ${label}. Chapitres complets avec définitions, méthodes et exercices corrigés. Préparation au Bac.`;

    return {
        title,
        description,
        keywords: [
            `cours maths ${label.toLowerCase()}`,
            `exercices maths ${label.toLowerCase()}`,
            `révision maths ${label.toLowerCase()}`,
            `programme maths ${label.toLowerCase()}`,
            'exercices corrigés mathématiques',
            'cours maths lycée',
            'bac maths',
        ],
        alternates: { canonical: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}` },
        openGraph: {
            title: `Cours Maths ${label} | Tuteur Maths`,
            description,
            url: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}`,
            type: 'website',
        },
    };
}

export default async function NiveauPage({ params }: Props) {
    const { niveau } = await params;

    const { data: level } = await supabaseServer
        .from('levels')
        .select('id, label, code')
        .ilike('code', niveau)
        .single();

    if (!level) notFound();

    const { data: chapters } = await supabaseServer
        .from('chapters')
        .select('id, code, title, position')
        .eq('level_id', (level as { id: string }).id)
        .eq('published', true)
        .order('position', { ascending: true });

    const chapterList = (chapters as { id: string; code: string; title: string; position: number }[]) || [];
    const levelData = level as { id: string; label: string; code: string };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Cours de Mathématiques ${levelData.label}`,
        description: `Chapitres de mathématiques pour la classe de ${levelData.label}`,
        url: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}`,
        numberOfItems: chapterList.length,
        itemListElement: chapterList.map((ch, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: ch.title,
            url: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}/${ch.code}`,
        })),
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Nav */}
            <header className="border-b border-slate-800/60 bg-[#020617]/95 backdrop-blur sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                    <Link href="/" className="font-['Orbitron'] text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                        Tuteur Maths
                    </Link>
                    <Link
                        href="/login"
                        className="text-sm px-4 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                        Se connecter
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">

                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-slate-500">
                    <Link href="/cours" className="hover:text-slate-300 transition-colors">Cours</Link>
                    <span>/</span>
                    <span className="text-slate-300">{levelData.label}</span>
                </nav>

                {/* Header */}
                <div className="mb-10 space-y-3">
                    <span className="text-xs tracking-[0.3em] text-cyan-500 uppercase font-medium">
                        Mathématiques
                    </span>
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                        {levelData.label}
                    </h1>
                    <p className="text-slate-400 max-w-lg">
                        {chapterList.length} chapitre{chapterList.length > 1 ? 's' : ''} — cours complets, exercices corrigés et quiz interactifs.
                    </p>
                </div>

                {/* Chapters grid */}
                {chapterList.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 mb-16">
                        {chapterList.map((chapter) => (
                            <article key={chapter.id} className="group rounded-xl border border-slate-700/60 bg-slate-900/40 p-5 hover:border-cyan-500/40 hover:bg-slate-800/50 transition-all duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-semibold text-slate-100 leading-snug mb-1">
                                            {chapter.title}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Cours · Exercices · Quiz
                                        </p>
                                    </div>
                                    <Link
                                        href="/login"
                                        className="shrink-0 text-xs text-cyan-500/70 group-hover:text-cyan-400 transition-colors whitespace-nowrap"
                                        aria-label={`Accéder au chapitre ${chapter.title}`}
                                    >
                                        Accéder →
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 mb-16">Aucun chapitre publié pour ce niveau.</p>
                )}

                {/* CTA */}
                <section className="text-center space-y-4 py-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                    <p className="text-base font-semibold text-white">
                        Accédez à tous les chapitres de {levelData.label}
                    </p>
                    <p className="text-sm text-slate-400">
                        Exercices corrigés, quiz interactifs et assistant IA mimimaths@i — gratuit.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
                    >
                        Créer un compte gratuit
                    </Link>
                    <p className="text-xs text-slate-600">
                        Déjà inscrit ?{' '}
                        <Link href="/login" className="text-cyan-600 hover:text-cyan-400 transition-colors">
                            Se connecter
                        </Link>
                    </p>
                </section>
            </main>

            <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-600 space-x-4">
                <Link href="/cours" className="hover:text-slate-400 transition-colors">← Tous les niveaux</Link>
                <Link href="/" className="hover:text-slate-400 transition-colors">Accueil</Link>
                <Link href="/confidentialite" className="hover:text-slate-400 transition-colors">Confidentialité</Link>
            </footer>
        </div>
    );
}
