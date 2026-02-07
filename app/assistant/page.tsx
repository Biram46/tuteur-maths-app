export const dynamic = 'force-dynamic';
import MathAssistant from '@/app/components/MathAssistant';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';

/**
 * Page de l'assistant mathématique mimimaths@i
 * Structure en 3 colonnes ajustées : Sidebars plus larges, Assistant Full Height.
 */
export default async function AssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }
    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Header - Plus compact */}
            <header className="shrink-0 bg-white border-b border-slate-200 z-50">
                <div className="max-w-[1900px] mx-auto px-8 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="text-lg">📐</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                                    mimimaths@i
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-green-50 border border-green-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Moteur IA Actif</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Full Height Flex Container */}
            <main className="flex-1 max-w-[1900px] w-full mx-auto px-6 py-4 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">

                    {/* Colonne GAUCHE - Élargie (2/12) */}
                    <div className="lg:col-span-2 h-full">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2.5rem] shadow-2xl p-8 text-white h-full flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-inner">🚀</div>
                            <h3 className="text-sm font-bold mb-10 text-center uppercase tracking-[0.3em] border-b border-white/20 pb-4 w-full">
                                IA Maths
                            </h3>
                            <ul className="space-y-8 text-[15px] opacity-95 leading-relaxed font-semibold">
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-cyan-300 drop-shadow-md">✓</span>
                                    <span>Réponses en temps réel avec sources citées</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-cyan-300 drop-shadow-md">✓</span>
                                    <span>Explications adaptées à votre niveau</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-cyan-300 drop-shadow-md">✓</span>
                                    <span>Résolution étape par étape</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-cyan-300 drop-shadow-md">✓</span>
                                    <span>Génération d'exercices similaires</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Colonne MILIEU - Assistant (8/12) - Pleine Hauteur */}
                    <div className="lg:col-span-8 h-full">
                        <MathAssistant baseContext={`L'utilisateur se nomme ${user.email?.split('@')[0] || 'élève'}.`} />
                    </div>

                    {/* Colonne DROITE - Élargie (2/12) */}
                    <div className="lg:col-span-2 h-full">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-[2.5rem] shadow-2xl p-8 text-white h-full flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-inner">📊</div>
                            <h3 className="text-sm font-bold mb-10 text-center uppercase tracking-[0.3em] border-b border-white/20 pb-4 w-full">
                                Avantages
                            </h3>
                            <ul className="space-y-8 text-[15px] opacity-95 leading-relaxed font-semibold">
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-fuchsia-300 drop-shadow-md">✓</span>
                                    <span>Disponible 24/7 pour vous aider</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-fuchsia-300 drop-shadow-md">✓</span>
                                    <span>Pas de jugement, posez toutes vos questions</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-fuchsia-300 drop-shadow-md">✓</span>
                                    <span>Apprentissage à votre rythme</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-4">
                                    <span className="text-3xl text-fuchsia-300 drop-shadow-md">✓</span>
                                    <span>Complément parfait à vos cours</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
