import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

export const revalidate = 3600;

type Props = { params: Promise<{ niveau: string; chapitre: string }> };

const KIND_INFO: Record<string, { icon: string; label: string; desc: string }> = {
    'cours':           { icon: '📖', label: 'Cours complet',      desc: 'Définitions, théorèmes et exemples rédigés.' },
    'cours-pdf':       { icon: '📄', label: 'Cours PDF',          desc: 'Cours à télécharger et imprimer.' },
    'cours-latex':     { icon: '📄', label: 'Cours LaTeX',        desc: 'Cours typographié en haute qualité.' },
    'exercices-pdf':   { icon: '✏️', label: 'Exercices corrigés', desc: 'Exercices avec corrections détaillées.' },
    'exercices-latex': { icon: '✏️', label: 'Exercices corrigés', desc: 'Exercices typographiés avec corrigé.' },
    'interactif':      { icon: '🎯', label: 'Quiz interactif',    desc: 'Questions à choix multiples avec score.' },
};

export async function generateStaticParams() {
    const { data: levels } = await supabaseServer
        .from('levels')
        .select('id, code');

    const { data: chapters } = await supabaseServer
        .from('chapters')
        .select('code, level_id')
        .eq('published', true);

    const levelMap = Object.fromEntries(
        ((levels as { id: string; code: string }[]) || []).map((l) => [l.id, l.code.toLowerCase()])
    );

    return ((chapters as { code: string; level_id: string }[]) || [])
        .map((ch) => ({
            niveau: levelMap[ch.level_id] || '',
            chapitre: ch.code.toLowerCase(),
        }))
        .filter((p) => p.niveau);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { niveau, chapitre } = await params;

    const { data: level } = await supabaseServer
        .from('levels')
        .select('id, label')
        .ilike('code', niveau)
        .single();

    if (!level) return { title: 'Chapitre introuvable' };

    const { data: chapter } = await supabaseServer
        .from('chapters')
        .select('title')
        .eq('level_id', (level as { id: string }).id)
        .ilike('code', chapitre)
        .single();

    if (!chapter) return { title: 'Chapitre introuvable' };

    const chTitle = (chapter as { title: string }).title;
    const lvLabel = (level as { label: string }).label;

    return {
        title: `${chTitle} — ${lvLabel} | Cours & Exercices Corrigés - Tuteur Maths`,
        description: `Cours complet sur ${chTitle} en ${lvLabel}. Définitions, théorèmes, exercices corrigés et quiz interactif. Préparez votre Bac de maths avec méthodes et exemples détaillés.`,
        keywords: [
            `cours ${chTitle.toLowerCase()}`,
            `exercices ${chTitle.toLowerCase()}`,
            `${chTitle.toLowerCase()} ${lvLabel.toLowerCase()}`,
            `révision ${chTitle.toLowerCase()} bac`,
            'exercices corrigés maths',
            'cours maths lycée',
            `maths ${lvLabel.toLowerCase()}`,
        ],
        alternates: { canonical: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}/${encodeURIComponent(chapitre)}` },
        openGraph: {
            title: `${chTitle} — ${lvLabel} | Tuteur Maths`,
            description: `Cours, exercices corrigés et quiz sur ${chTitle} en ${lvLabel}.`,
            url: `https://aimaths.fr/cours/${encodeURIComponent(niveau)}/${encodeURIComponent(chapitre)}`,
            type: 'website',
        },
    };
}

export default async function ChapitreePage({ params }: Props) {
    const { niveau, chapitre } = await params;

    const { data: level } = await supabaseServer
        .from('levels')
        .select('id, label, code')
        .ilike('code', niveau)
        .single();

    if (!level) notFound();

    const lvData = level as { id: string; label: string; code: string };

    const { data: chapter } = await supabaseServer
        .from('chapters')
        .select('id, title, code')
        .eq('level_id', lvData.id)
        .ilike('code', chapitre)
        .single();

    if (!chapter) notFound();

    const chData = chapter as { id: string; title: string; code: string };

    const { data: resources } = await supabaseServer
        .from('resources')
        .select('id, kind')
        .eq('chapter_id', chData.id)
        .eq('status', 'published');

    const resourceList = (resources as { id: string; kind: string }[]) || [];

    // Siblings for internal linking
    const { data: siblings } = await supabaseServer
        .from('chapters')
        .select('code, title')
        .eq('level_id', lvData.id)
        .eq('published', true)
        .neq('id', chData.id)
        .order('position', { ascending: true })
        .limit(6);

    const siblingList = (siblings as { code: string; title: string }[]) || [];

    const niveauEncoded = encodeURIComponent(niveau);
    const chapEncoded = encodeURIComponent(chapitre);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: chData.title,
        description: `Cours complet sur ${chData.title} en ${lvData.label}. Exercices corrigés et quiz interactif.`,
        url: `https://aimaths.fr/cours/${niveauEncoded}/${chapEncoded}`,
        provider: {
            '@type': 'Organization',
            name: 'Tuteur Maths',
            url: 'https://aimaths.fr',
        },
        educationalLevel: lvData.label,
        inLanguage: 'fr-FR',
        isAccessibleForFree: true,
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
                <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <Link href="/cours" className="hover:text-slate-300 transition-colors">Cours</Link>
                    <span>/</span>
                    <Link href={`/cours/${niveauEncoded}`} className="hover:text-slate-300 transition-colors">{lvData.label}</Link>
                    <span>/</span>
                    <span className="text-slate-300">{chData.title}</span>
                </nav>

                {/* Header */}
                <div className="mb-10 space-y-3">
                    <span className="text-xs tracking-[0.3em] text-cyan-500 uppercase font-medium">
                        {lvData.label}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron'] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase leading-tight">
                        {chData.title}
                    </h1>
                    <p className="text-slate-400 max-w-lg text-sm leading-relaxed">
                        Cours complet, exercices corrigés et quiz interactif sur{' '}
                        <strong className="text-slate-300">{chData.title}</strong> en {lvData.label}.
                        Préparez votre Bac de maths avec méthodes et exemples détaillés.
                    </p>
                </div>

                {/* Resources */}
                {resourceList.length > 0 ? (
                    <section aria-label="Ressources disponibles" className="mb-14">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
                            Ressources disponibles
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {resourceList.map((res) => {
                                const info = KIND_INFO[res.kind] ?? { icon: '📁', label: res.kind, desc: 'Ressource pédagogique.' };
                                return (
                                    <Link
                                        key={res.id}
                                        href="/login"
                                        className="group flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 hover:border-cyan-500/40 hover:bg-slate-800/50 transition-all"
                                        aria-label={`Accéder : ${info.label}`}
                                    >
                                        <span className="text-xl shrink-0 mt-0.5">{info.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-100">{info.label}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{info.desc}</p>
                                        </div>
                                        <span className="text-xs text-cyan-500/60 group-hover:text-cyan-400 transition-colors shrink-0 mt-1">
                                            →
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ) : (
                    <p className="text-slate-500 mb-14 text-sm">Ressources en cours de préparation.</p>
                )}

                {/* CTA */}
                <section className="text-center space-y-4 py-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 mb-14">
                    <p className="text-base font-semibold text-white">
                        Accédez à tout le contenu sur {chData.title}
                    </p>
                    <p className="text-sm text-slate-400">
                        Compte gratuit — exercices corrigés, quiz et assistant IA mimimaths@i inclus.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
                    >
                        Créer un compte gratuit
                    </Link>
                </section>

                {/* Siblings */}
                {siblingList.length > 0 && (
                    <section aria-label="Autres chapitres">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
                            Autres chapitres — {lvData.label}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {siblingList.map((sib) => (
                                <Link
                                    key={sib.code}
                                    href={`/cours/${niveauEncoded}/${encodeURIComponent(sib.code.toLowerCase())}`}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                                >
                                    {sib.title}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-600 space-x-4">
                <Link href={`/cours/${niveauEncoded}`} className="hover:text-slate-400 transition-colors">← {lvData.label}</Link>
                <Link href="/cours" className="hover:text-slate-400 transition-colors">Tous les niveaux</Link>
                <Link href="/confidentialite" className="hover:text-slate-400 transition-colors">Confidentialité</Link>
            </footer>
        </div>
    );
}
