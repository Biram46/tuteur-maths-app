import { createClient } from '@/lib/supabaseAction';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SujetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Sujets disponibles (à enrichir avec Supabase plus tard)
    const sujets = [
        {
            id: 1,
            titre: "Bac Blanc n°1 - Épreuve Anticipée",
            date: "Mars 2026",
            description: "Sujet complet avec automatismes et problèmes",
            corrige: true,
            niveau: "1ère Spécialité"
        },
        {
            id: 2,
            titre: "Sujet A - Épreuve Anticipée",
            date: "Avril 2026",
            description: "12 questions d'automatismes + exercices",
            corrige: true,
            niveau: "1ère GT"
        },
        {
            id: 3,
            titre: "Sujet B - Épreuve Anticipée",
            date: "Mai 2026",
            description: "Sujet type bac avec corrections détaillées",
            corrige: false,
            niveau: "1ère Spécialité"
        },
        {
            id: 4,
            titre: "QCM Probabilités - Pablo Picasso",
            date: "2026",
            description: "10 questions sur les probabilités",
            corrige: true,
            niveau: "1ère GT"
        }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100">
            {/* Header */}
            <header className="main-header">
                <div className="logo flex items-center gap-2">
                    <span className="text-2xl">📐</span>
                    <h1 className="text-xl font-bold">Tuteur Maths</h1>
                </div>
                <nav className="main-nav">
                    <Link href="/" className="nav-tab">Espace élèves</Link>
                    <Link href="/assistant" className="nav-tab">Module Assistant</Link>
                    <Link href="/admin" className="nav-tab">Espace prof</Link>
                </nav>
                <div className="header-actions">
                    {user && <span className="text-sm text-slate-400">{user.email}</span>}
                </div>
            </header>

            {/* Contenu principal */}
            <main className="max-w-6xl mx-auto p-6 md:p-8">
                {/* Titre */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-4"
                    >
                        ← Retour à l'accueil
                    </Link>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="text-4xl">📄</span>
                        Sujets et Corrigés
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Épreuve Anticipée de Mathématiques 1ère - Session 2026
                    </p>
                </div>

                {/* Grille des sujets */}
                <div className="grid gap-6 md:grid-cols-2">
                    {sujets.map((sujet) => (
                        <div
                            key={sujet.id}
                            className="p-6 rounded-2xl bg-slate-800/50 border border-white/10 hover:border-blue-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                        {sujet.niveau}
                                    </span>
                                    <h3 className="text-lg font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">
                                        {sujet.titre}
                                    </h3>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">
                                    {sujet.date}
                                </span>
                            </div>

                            <p className="text-sm text-slate-400 mb-4">
                                {sujet.description}
                            </p>

                            <div className="flex gap-3">
                                <button className="flex-1 py-2 px-4 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                                    <span>👁️</span> Voir le sujet
                                </button>
                                {sujet.corrige ? (
                                    <button className="flex-1 py-2 px-4 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                                        <span>✅</span> Corrigé
                                    </button>
                                ) : (
                                    <button className="flex-1 py-2 px-4 rounded-lg bg-slate-700/50 text-slate-500 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
                                        <span>⏳</span> Corrigé à venir
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Section Entraîne-toi */}
                <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                🏋️ Prépare-toi avec les QCM
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Entraîne-toi sur les automatismes avec plus de 40 questions couvrant toutes les catégories du programme.
                            </p>
                        </div>
                        <Link
                            href="/entraine-toi"
                            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <span>🏋️</span> Entraîne-toi maintenant
                        </Link>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-8 p-6 rounded-2xl bg-slate-800/30 border border-white/5 text-center">
                    <p className="text-xs text-slate-500">
                        📚 D'autres sujets seront ajoutés régulièrement. Revenez consulter cette page pour de nouveaux contenus.
                    </p>
                </div>
            </main>
        </div>
    );
}
