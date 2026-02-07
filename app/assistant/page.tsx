export const dynamic = 'force-dynamic';
import MathAssistant from '@/app/components/MathAssistant';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';

/**
 * Page de l'assistant mathématique mimimaths@i
 * Structure en 3 colonnes avec l'assistant au centre (4/5)
 */
export default async function AssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="text-xl">📐</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                    mimimaths@i
                                </h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    Tuteur de Mathématiques IA
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-1.5 rounded-full bg-green-50 border border-green-100 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Moteur IA Opérationnel</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Structure en 3 colonnes optimisée */}
            <main className="max-w-[1850px] mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">

                    {/* Colonne GAUCHE - IA Maths (1/10) */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-2xl p-8 text-white min-h-[500px] flex flex-col items-center">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-8">🚀</div>
                            <h3 className="text-sm font-bold mb-10 text-center uppercase tracking-[0.2em] border-b border-white/20 pb-4 w-full">
                                IA Maths
                            </h3>
                            <ul className="space-y-8 text-[14px] opacity-90 leading-relaxed font-medium">
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-cyan-300">✓</span>
                                    <span>Réponses en temps réel avec sources citées</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-cyan-300">✓</span>
                                    <span>Explications adaptées à votre niveau</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-cyan-300">✓</span>
                                    <span>Résolution étape par étape</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-cyan-300">✓</span>
                                    <span>Génération d'exercices similaires</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Colonne MILIEU - Assistant (8/10) - Représente 4/5 de la page */}
                    <div className="lg:col-span-8">
                        <MathAssistant baseContext={`L'utilisateur se nomme ${user.email?.split('@')[0] || 'élève'}.`} />
                    </div>

                    {/* Colonne DROITE - Avantages (1/10) */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-[2rem] shadow-2xl p-8 text-white min-h-[500px] flex flex-col items-center">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-8">📊</div>
                            <h3 className="text-sm font-bold mb-10 text-center uppercase tracking-[0.2em] border-b border-white/20 pb-4 w-full">
                                Avantages
                            </h3>
                            <ul className="space-y-8 text-[14px] opacity-90 leading-relaxed font-medium">
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-fuchsia-300">✓</span>
                                    <span>Disponible 24/7 pour vous aider</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-fuchsia-300">✓</span>
                                    <span>Pas de jugement, posez toutes vos questions</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-fuchsia-300">✓</span>
                                    <span>Apprentissage à votre rythme</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-3">
                                    <span className="text-2xl text-fuchsia-300">✓</span>
                                    <span>Complément parfait à vos cours</span>
                                </li>
                            </ul>
                        </div>

                        <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-200 text-center shadow-lg transform transition-transform hover:scale-105">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                                mimimaths@i
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-12 py-10">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm text-slate-500">
                        Propulsé par <span className="font-bold text-blue-600 tracking-tight">mimimaths@i</span> • 2026 Espace Éducation
                    </p>
                </div>
            </footer>
        </div>
    );
}
