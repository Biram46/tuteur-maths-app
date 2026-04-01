import { createClient } from '@/lib/supabaseAction';
import Link from 'next/link';
import { EAMSujet, EAM_NIVEAUX } from '@/lib/eam-types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Sujets et Annales Bac | Mathématiques Première Terminale",
    description: "Annales du Bac de mathématiques, sujets corrigés et bac blancs pour la Première et Terminale. Préparez l'épreuve finale avec des sujets conformes au programme officiel.",
    keywords: [
        "annales bac maths",
        "sujets bac mathématiques",
        "bac blanc maths",
        "corrigés bac maths",
        "sujets première maths",
        "sujets terminale maths",
        "préparation bac",
        "épreuve maths bac",
    ],
    openGraph: {
        title: "Sujets et Annales Bac Maths | Tuteur Maths",
        description: "Retrouvez tous les sujets et corrigés du Bac de mathématiques. Première et Terminale.",
        url: 'https://aimaths.fr/sujets',
    },
};

export const dynamic = 'force-dynamic';

export default async function SujetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Récupérer les sujets EAM depuis Supabase
    const { data: sujets, error } = await supabase
        .from('eam_sujets')
        .select('*')
        .order('date_sujet', { ascending: false });

    // Si la table n'existe pas encore, utiliser des données de démo
    const demoSujets: EAMSujet[] = [
        {
            id: 'demo-1',
            titre: 'Bac Blanc n°1',
            description: 'Sujet complet avec automatismes et problèmes',
            date_sujet: '2026-03-31',
            niveau: '1ere_specialite',
            sujet_pdf_url: '/eam/sujets/bac_blanc_1_sujet.pdf',
            sujet_latex_url: '/eam/sujets/bac_blanc_1_sujet.tex',
            corrige_pdf_url: '/eam/sujets/bac_blanc_1_corrige.pdf',
            corrige_latex_url: '/eam/sujets/bac_blanc_1_corrige.tex',
            corrige_disponible: true,
            created_at: '2026-03-31',
            updated_at: '2026-03-31'
        },
        {
            id: 'demo-2',
            titre: 'Bac Blanc n°2',
            description: 'Sujet complet avec automatismes et problèmes',
            date_sujet: '2026-03-31',
            niveau: '1ere_specialite',
            sujet_pdf_url: '/eam/sujets/bac_blanc_2_sujet.pdf',
            sujet_latex_url: '/eam/sujets/bac_blanc_2_sujet.tex',
            corrige_pdf_url: '/eam/sujets/bac_blanc_2_corrige.pdf',
            corrige_latex_url: '/eam/sujets/bac_blanc_2_corrige.tex',
            corrige_disponible: true,
            created_at: '2026-03-31',
            updated_at: '2026-03-31'
        },
        {
            id: 'demo-3',
            titre: 'Bac Blanc n°3',
            description: 'Sujet complet avec automatismes et problèmes',
            date_sujet: '2026-03-31',
            niveau: '1ere_specialite',
            sujet_pdf_url: '/eam/sujets/bac_blanc_3_sujet.pdf',
            sujet_latex_url: '/eam/sujets/bac_blanc_3_sujet.tex',
            corrige_pdf_url: '/eam/sujets/bac_blanc_3_corrige.pdf',
            corrige_latex_url: '/eam/sujets/bac_blanc_3_corrige.tex',
            corrige_disponible: true,
            created_at: '2026-03-31',
            updated_at: '2026-03-31'
        },
        {
            id: 'demo-4',
            titre: 'Bac Blanc n°4',
            description: 'Sujet complet avec automatismes et problèmes',
            date_sujet: '2026-03-31',
            niveau: '1ere_specialite',
            sujet_pdf_url: '/eam/sujets/bac_blanc_4_sujet.pdf',
            sujet_latex_url: '/eam/sujets/bac_blanc_4_sujet.tex',
            corrige_pdf_url: '/eam/sujets/bac_blanc_4_corrige.pdf',
            corrige_latex_url: '/eam/sujets/bac_blanc_4_corrige.tex',
            corrige_disponible: true,
            created_at: '2026-03-31',
            updated_at: '2026-03-31'
        },
        {
            id: 'demo-5',
            titre: 'Bac Blanc n°5',
            description: 'Sujet complet avec automatismes et problèmes',
            date_sujet: '2026-03-31',
            niveau: '1ere_specialite',
            sujet_pdf_url: '/eam/sujets/bac_blanc_5_sujet.pdf',
            sujet_latex_url: '/eam/sujets/bac_blanc_5_sujet.tex',
            corrige_pdf_url: '/eam/sujets/bac_blanc_5_corrige.pdf',
            corrige_latex_url: '/eam/sujets/bac_blanc_5_corrige.tex',
            corrige_disponible: true,
            created_at: '2026-03-31',
            updated_at: '2026-03-31'
        }
    ];

    const displaySujets = error ? demoSujets : (sujets as EAMSujet[]) || demoSujets;

    const getNiveauLabel = (niveau: string) => {
        const found = EAM_NIVEAUX.find(n => n.value === niveau);
        return found?.label || niveau;
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Grouper les sujets par niveau
    const sujetsByNiveau = displaySujets.reduce((acc, sujet) => {
        const niveau = sujet.niveau || '1ere_specialite';
        if (!acc[niveau]) acc[niveau] = [];
        acc[niveau].push(sujet);
        return acc;
    }, {} as Record<string, EAMSujet[]>);

    // Ordre d'affichage des niveaux
    const niveauOrder = ['1ere_specialite', '1ere_gt', '1ere_techno'];

    // Couleurs par niveau
    const niveauColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
        '1ere_specialite': {
            bg: 'from-blue-600/20 to-cyan-600/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400',
            badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        },
        '1ere_gt': {
            bg: 'from-emerald-600/20 to-green-600/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        },
        '1ere_techno': {
            bg: 'from-amber-600/20 to-orange-600/10',
            border: 'border-amber-500/30',
            text: 'text-amber-400',
            badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100">
            {/* Header Mobile-Friendly */}
            <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            aria-label="Retour à l'accueil"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xl md:text-2xl">📐</span>
                            <h1 className="text-base md:text-xl font-bold text-white">Tuteur Maths</h1>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center gap-2">
                        <Link href="/" className="nav-tab">Espace élèves</Link>
                        <Link href="/assistant" className="nav-tab">Module Assistant</Link>
                        <Link href="/admin" className="nav-tab">Espace prof</Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        {user && (
                            <span className="hidden sm:inline text-sm text-slate-400">{user.email}</span>
                        )}
                    </div>
                </div>
            </header>

            {/* Contenu principal */}
            <main className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Titre */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="text-3xl md:text-4xl">📄</span>
                        Sujets et Corrigés EAM
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm md:text-base">
                        Épreuve Anticipée de Mathématiques 1ère - Session 2026
                    </p>
                </div>

                {/* Légende */}
                <div className="flex flex-wrap gap-4 mb-8 p-4 rounded-xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-slate-400">Sujet PDF</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                        <span className="text-slate-400">Source LaTeX</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-400">Corrigé PDF</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                        <span className="text-slate-400">Corrigé à venir</span>
                    </div>
                </div>

                {/* Sujets groupés par niveau */}
                <div className="space-y-10">
                    {niveauOrder.map((niveau) => {
                        const sujetsDuNiveau = sujetsByNiveau[niveau];
                        if (!sujetsDuNiveau || sujetsDuNiveau.length === 0) return null;

                        const colors = niveauColors[niveau] || niveauColors['1ere_specialite'];

                        return (
                            <div key={niveau} className="space-y-4">
                                {/* Header du niveau */}
                                <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${colors.bg} border ${colors.border}`}>
                                    <div className={`w-10 h-10 rounded-lg ${colors.badge} flex items-center justify-center font-bold text-lg`}>
                                        {niveau === '1ere_specialite' ? 'S' : niveau === '1ere_gt' ? 'G' : 'T'}
                                    </div>
                                    <div>
                                        <h2 className={`text-lg font-bold ${colors.text}`}>
                                            {getNiveauLabel(niveau)}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {sujetsDuNiveau.length} sujet{sujetsDuNiveau.length > 1 ? 's' : ''} disponible{sujetsDuNiveau.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Liste des sujets de ce niveau */}
                                <div className="space-y-4 pl-4 border-l-2 border-slate-800">
                                    {sujetsDuNiveau.map((sujet) => (
                                        <div
                                            key={sujet.id}
                                            className="p-5 rounded-xl bg-slate-800/50 border border-white/10 hover:border-white/20 transition-all group"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                                                <div>
                                                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {sujet.titre}
                                                    </h3>
                                                    {sujet.description && (
                                                        <p className="text-sm text-slate-400 mt-1">
                                                            {sujet.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                                                    {formatDate(sujet.date_sujet)}
                                                </span>
                                            </div>

                                            {/* Boutons de téléchargement */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {/* Sujet PDF */}
                                                {sujet.sujet_pdf_url ? (
                                                    <a
                                                        href={sujet.sujet_pdf_url}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold text-sm transition-all min-h-[40px]"
                                                    >
                                                        <span>📄</span> Sujet PDF
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700/30 text-slate-500 text-sm min-h-[40px]">
                                                        <span>📄</span> Sujet PDF
                                                    </div>
                                                )}

                                                {/* Sujet LaTeX */}
                                                {sujet.sujet_latex_url ? (
                                                    <a
                                                        href={sujet.sujet_latex_url}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white font-bold text-sm transition-all min-h-[40px]"
                                                    >
                                                        <span>📝</span> .tex
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700/30 text-slate-500 text-sm min-h-[40px]">
                                                        <span>📝</span> .tex
                                                    </div>
                                                )}

                                                {/* Corrigé PDF */}
                                                {sujet.corrige_disponible && sujet.corrige_pdf_url ? (
                                                    <a
                                                        href={sujet.corrige_pdf_url}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-sm transition-all min-h-[40px]"
                                                    >
                                                        <span>✅</span> Corrigé PDF
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700/30 text-slate-500 text-sm min-h-[40px]">
                                                        <span>⏳</span> À venir
                                                    </div>
                                                )}

                                                {/* Corrigé LaTeX */}
                                                {sujet.corrige_disponible && sujet.corrige_latex_url ? (
                                                    <a
                                                        href={sujet.corrige_latex_url}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white font-bold text-sm transition-all min-h-[40px]"
                                                    >
                                                        <span>📝</span> .tex
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700/30 text-slate-500 text-sm min-h-[40px]">
                                                        <span>📝</span> .tex
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
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

                {/* Info Admin */}
                {error && (
                    <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                        ⚠️ Mode démo activé. Créez la table <code className="bg-black/30 px-1 rounded">eam_sujets</code> dans Supabase pour activer le stockage des sujets.
                    </div>
                )}

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
