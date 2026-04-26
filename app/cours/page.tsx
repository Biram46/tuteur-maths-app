import { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Cours de Mathématiques Lycée | Première, Terminale, STMG - Tuteur Maths',
    description: 'Cours et exercices corrigés de mathématiques pour tous les niveaux du lycée. Première spécialité, Terminale générale, STMG, Seconde. Préparez votre Bac de maths avec méthodes, exercices et quiz interactifs.',
    keywords: [
        'cours maths lycée', 'exercices maths corrigés', 'maths première spécialité',
        'maths terminale spécialité', 'cours maths STMG', 'bac maths', 'révision maths lycée',
        'exercices bac maths', 'cours maths seconde', 'spécialité mathématiques',
    ],
    alternates: { canonical: 'https://aimaths.fr/cours' },
    openGraph: {
        title: 'Cours de Mathématiques Lycée | Tuteur Maths',
        description: 'Cours, exercices corrigés et quiz de maths pour tous les niveaux du lycée. Accès gratuit.',
        url: 'https://aimaths.fr/cours',
        type: 'website',
    },
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
    '2nde': 'Fonctions, géométrie, statistiques et probabilités — programme complet de Seconde.',
    '1spe': 'Suites numériques, dérivées, trigonométrie et probabilités — Première spécialité.',
    '1ere': 'Suites numériques, dérivées, trigonométrie et probabilités — Première spécialité.',
    '1stmg': 'Fonctions, suites, statistiques et probabilités — Première STMG.',
    'tspe': 'Intégrales, logarithmes, complexes, géométrie dans l\'espace — Terminale spécialité.',
    'texp': 'Approfondissement en algèbre, analyse et géométrie — maths expertes.',
    'tcomp': 'Raisonnement, probabilités et matrices — maths complémentaires.',
    'tstmg': 'Matrices, probabilités, statistiques — Terminale STMG.',
    'terminale': 'Intégrales, logarithmes, complexes, géométrie dans l\'espace — Terminale spécialité.',
};

function getLevelDescription(code: string, label: string): string {
    const desc = LEVEL_DESCRIPTIONS[code.toLowerCase()];
    if (desc) return desc;
    return `Cours complets et exercices corrigés pour la classe de ${label}.`;
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cours de Mathématiques Lycée',
    description: 'Cours et exercices de maths pour tous les niveaux du lycée français',
    url: 'https://aimaths.fr/cours',
};

export default async function CoursIndexPage() {
    const { data: levels } = await supabaseServer
        .from('levels')
        .select('id, code, label, position')
        .order('position', { ascending: true });

    const { data: chaptersRaw } = await supabaseServer
        .from('chapters')
        .select('id, level_id')
        .eq('published', true);

    const countByLevel = ((chaptersRaw as { id: string; level_id: string }[]) || []).reduce(
        (acc, ch) => { acc[ch.level_id] = (acc[ch.level_id] || 0) + 1; return acc; },
        {} as Record<string, number>
    );

    const levelList = (levels as { id: string; code: string; label: string; position: number }[]) || [];

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

            <main className="max-w-5xl mx-auto px-6 py-16">

                {/* Hero */}
                <div className="text-center space-y-4 mb-16">
                    <p className="text-xs tracking-[0.3em] text-cyan-500 uppercase font-medium">Lycée — Bac général & technologique</p>
                    <h1 className="text-3xl sm:text-4xl font-bold font-['Orbitron'] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-slate-300 uppercase leading-tight">
                        Cours de Mathématiques
                    </h1>
                    <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
                        Cours complets, exercices corrigés et quiz interactifs pour réussir en maths au lycée.
                        Tous les chapitres du programme officiel.
                    </p>
                </div>

                {/* Level grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-20">
                    {levelList.map((level) => {
                        const count = countByLevel[level.id] || 0;
                        return (
                            <Link
                                key={level.id}
                                href={`/cours/${encodeURIComponent(level.code.toLowerCase())}`}
                                className="group block rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold tracking-wider text-cyan-500 uppercase bg-cyan-500/10 px-2 py-0.5 rounded">
                                        {level.label}
                                    </span>
                                    <span className="text-xs text-slate-500">{count} chapitres</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {getLevelDescription(level.code, level.label)}
                                </p>
                                <p className="mt-4 text-sm text-cyan-400 group-hover:text-cyan-300 transition-colors">
                                    Voir les chapitres →
                                </p>
                            </Link>
                        );
                    })}
                </div>

                {/* Features */}
                <section aria-label="Fonctionnalités" className="border-t border-slate-800 pt-16 mb-16">
                    <h2 className="text-xl font-semibold text-center text-white mb-10">
                        Tout ce qu'il vous faut pour réussir en maths
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                icon: '📚',
                                title: 'Cours & Méthodes',
                                desc: 'Cours rédigés selon le programme officiel, avec définitions, théorèmes et exemples illustrés.',
                            },
                            {
                                icon: '✏️',
                                title: 'Exercices Corrigés',
                                desc: 'Des centaines d\'exercices avec corrections détaillées, classés par chapitre et difficulté.',
                            },
                            {
                                icon: '🤖',
                                title: 'Assistant IA (mimimaths@i)',
                                desc: 'Un assistant spécialisé en maths lycée qui répond à vos questions 24h/24 et trace des figures.',
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="text-center space-y-2 px-4">
                                <div className="text-3xl">{icon}</div>
                                <h3 className="text-sm font-semibold text-white">{title}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="text-center space-y-4 py-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                    <p className="text-lg font-semibold text-white">Prêt à progresser en maths&nbsp;?</p>
                    <p className="text-sm text-slate-400">Accès gratuit — Exercices, quiz interactifs et assistant IA inclus.</p>
                    <Link
                        href="/login"
                        className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
                    >
                        Commencer gratuitement
                    </Link>
                </section>
            </main>

            <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-600 space-x-4">
                <Link href="/" className="hover:text-slate-400 transition-colors">Accueil</Link>
                <Link href="/login" className="hover:text-slate-400 transition-colors">Connexion</Link>
                <Link href="/confidentialite" className="hover:text-slate-400 transition-colors">Confidentialité</Link>
            </footer>
        </div>
    );
}
