export const dynamic = 'force-dynamic';
import MathAssistant from '@/app/components/MathAssistant';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';

/**
 * Page de l'assistant mathématique mimimaths@i
 * Structure optimisée pour la visibilité de l'input.
 */
export default async function AssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }
    return (
        <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
            {/* Header - Plus compact */}
            <header className="shrink-0 bg-white border-b border-slate-200 z-50">
                <div className="max-w-[1900px] mx-auto px-6 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="text-lg">📐</span>
                            </div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                mimimaths@i
                            </h1>
                        </div>
                        <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">IA active</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Force strictly inside viewport */}
            <main className="flex-1 overflow-hidden p-4">
                <div className="max-w-[1900px] mx-auto h-full grid grid-cols-12 gap-4">

                    {/* Colonne GAUCHE - 2 col */}
                    <div className="col-span-2 h-full">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-xl p-6 text-white h-full flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-6">🚀</div>
                            <h3 className="text-xs font-bold mb-6 text-center uppercase tracking-[0.2em] border-b border-white/20 pb-3 w-full">
                                IA Maths
                            </h3>
                            <ul className="space-y-6 text-[13px] opacity-90 leading-tight">
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-cyan-300">✓</span>
                                    <span>Réponses en temps réel</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-cyan-300">✓</span>
                                    <span>Explications de niveau</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-cyan-300">✓</span>
                                    <span>Pas à pas détaillé</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Colonne MILIEU - 8 col - L'assistant prend toute la place verticale restante */}
                    <div className="col-span-8 h-full overflow-hidden">
                        <MathAssistant baseContext={`L'utilisateur se nomme ${user.email?.split('@')[0] || 'élève'}.`} />
                    </div>

                    {/* Colonne DROITE - 2 col */}
                    <div className="col-span-2 h-full">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-[2rem] shadow-xl p-6 text-white h-full flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-6">📊</div>
                            <h3 className="text-xs font-bold mb-6 text-center uppercase tracking-[0.2em] border-b border-white/20 pb-3 w-full">
                                Avantages
                            </h3>
                            <ul className="space-y-6 text-[13px] opacity-90 leading-tight">
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-fuchsia-300">✓</span>
                                    <span>Disponible 24/7</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-fuchsia-300">✓</span>
                                    <span>Pas de jugement</span>
                                </li>
                                <li className="flex flex-col items-center text-center gap-2">
                                    <span className="text-xl text-fuchsia-300">✓</span>
                                    <span>Votre propre rythme</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
