import { getEducationalData } from "@/lib/data";
import { createClient } from "@/lib/supabaseAction";
import StudentClientView from "./components/StudentClientView";
import Link from "next/link";
import { Level, Chapter, Resource } from "@/lib/data";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

const FEATURES = [
    { icon: '📚', title: 'Cours complets', desc: 'Tous les chapitres du programme officiel Lycée, rédigés avec définitions, théorèmes et exemples.' },
    { icon: '✏️', title: 'Exercices corrigés', desc: 'Des centaines d\'exercices classés par chapitre avec corrections détaillées étape par étape.' },
    { icon: '🎯', title: 'Quiz interactifs', desc: 'Testez vos connaissances avec des QCM chronométrés. Score et correction instantanés.' },
    { icon: '🤖', title: 'Assistant IA mimimaths@i', desc: 'Posez vos questions de maths 24h/24. Tracé de figures géométriques et graphes de fonctions.' },
];

export default async function Home() {
    let user = null;
    let levels: Level[] = [];
    let chapters: Chapter[] = [];
    let resources: Resource[] = [];
    let errorDetails = null;

    try {
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError?.message === "Missing Supabase Environment Variables") {
            throw new Error(userError.message);
        }

        if (userData?.user) {
            user = userData.user;
            const data = await getEducationalData();
            levels = data.levels;
            chapters = data.chapters;
            resources = data.resources;
        }
    } catch (e: any) {
        console.error("HOME PAGE CRITICAL ERROR:", e);
        errorDetails = e.message || "Erreur inconnue";
    }

    if (errorDetails) {
        return (
            <div className="min-h-screen p-12 bg-[#020617] text-white font-mono flex flex-col items-center justify-center">
                <h1 className="text-2xl text-red-500 mb-4">Maintenance en cours</h1>
                <p className="mb-4 text-center">L'application ne parvient pas à démarrer correctement.</p>
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg mb-8 max-w-md">
                    <code className="block bg-black p-4 rounded text-red-300 text-xs break-all">{errorDetails}</code>
                </div>
            </div>
        );
    }

    // Utilisateur connecté → espace élève habituel
    if (user) {
        return (
            <StudentClientView
                levels={levels}
                chapters={chapters}
                resources={resources}
            />
        );
    }

    // Visiteur non connecté → landing page publique (indexable par Google)
    const { data: levelData } = await supabaseServer
        .from('levels')
        .select('id, code, label, position')
        .order('position', { ascending: true });

    const { data: chaptersCount } = await supabaseServer
        .from('chapters')
        .select('level_id')
        .eq('published', true);

    const countByLevel = ((chaptersCount as { level_id: string }[]) || []).reduce(
        (acc, ch) => { acc[ch.level_id] = (acc[ch.level_id] || 0) + 1; return acc; },
        {} as Record<string, number>
    );

    const lvList = (levelData as { id: string; code: string; label: string; position: number }[]) || [];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">

            {/* Nav */}
            <header className="border-b border-slate-800/60 bg-[#020617]/95 backdrop-blur sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                    <span className="font-['Orbitron'] text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                        Tuteur Maths
                    </span>
                    <div className="flex items-center gap-3">
                        <Link href="/cours" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
                            Cours
                        </Link>
                        <Link
                            href="/login"
                            className="text-sm px-4 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        >
                            Se connecter
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
                    <p className="text-xs tracking-[0.35em] text-cyan-500 uppercase font-medium">
                        Lycée · Première · Terminale · STMG
                    </p>
                    <h1 className="text-3xl sm:text-5xl font-bold font-['Orbitron'] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-slate-300 uppercase leading-tight">
                        Réussissez vos<br />maths au lycée
                    </h1>
                    <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
                        Cours complets, exercices corrigés, quiz interactifs et assistant IA pour préparer votre Bac de mathématiques.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link
                            href="/login"
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all w-full sm:w-auto text-center"
                        >
                            Commencer gratuitement
                        </Link>
                        <Link
                            href="/cours"
                            className="px-8 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-slate-400 hover:text-white transition-all w-full sm:w-auto text-center"
                        >
                            Voir les cours →
                        </Link>
                    </div>
                </section>

                {/* Features */}
                <section aria-label="Fonctionnalités" className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-800">
                    <h2 className="text-xl font-semibold text-center text-white mb-10">
                        Tout ce qu'il vous faut pour progresser
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map(({ icon, title, desc }) => (
                            <div key={title} className="text-center space-y-2 px-2">
                                <div className="text-3xl">{icon}</div>
                                <h3 className="text-sm font-semibold text-white">{title}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Niveaux */}
                <section aria-label="Niveaux disponibles" className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-800">
                    <h2 className="text-xl font-semibold text-center text-white mb-2">
                        Cours disponibles par niveau
                    </h2>
                    <p className="text-center text-sm text-slate-500 mb-8">
                        Cliquez sur un niveau pour voir tous les chapitres disponibles
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                        {lvList.map((level) => (
                            <Link
                                key={level.id}
                                href={`/cours/${encodeURIComponent(level.code.toLowerCase())}`}
                                className="group flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-5 py-4 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">{level.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{countByLevel[level.id] || 0} chapitres</p>
                                </div>
                                <span className="text-cyan-500/60 group-hover:text-cyan-400 transition-colors text-sm">→</span>
                            </Link>
                        ))}
                    </div>
                    <div className="text-center">
                        <Link href="/cours" className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors">
                            Voir tous les cours →
                        </Link>
                    </div>
                </section>

                {/* CTA final */}
                <section className="max-w-5xl mx-auto px-6 py-12">
                    <div className="text-center space-y-4 py-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                        <p className="text-lg font-semibold text-white">Prêt à progresser en maths ?</p>
                        <p className="text-sm text-slate-400">Accès gratuit — Exercices, quiz et assistant IA inclus.</p>
                        <Link
                            href="/login"
                            className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
                        >
                            Créer un compte gratuit
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-600 space-x-4">
                <Link href="/cours" className="hover:text-slate-400 transition-colors">Cours</Link>
                <Link href="/entraine-toi" className="hover:text-slate-400 transition-colors">Quiz</Link>
                <Link href="/sujets" className="hover:text-slate-400 transition-colors">Annales</Link>
                <Link href="/login" className="hover:text-slate-400 transition-colors">Connexion</Link>
                <Link href="/confidentialite" className="hover:text-slate-400 transition-colors">Confidentialité</Link>
            </footer>
        </div>
    );
}
