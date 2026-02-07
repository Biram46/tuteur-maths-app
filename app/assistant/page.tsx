export const dynamic = 'force-dynamic';
import MathAssistant from '@/app/components/MathAssistant';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';

/**
 * Page de démonstration de l'assistant mathématique Perplexity AI
 */
export default async function AssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Tuteur Maths
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Votre Assistant Personnel Intelligent
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                IA Active
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Structure en 3 colonnes */}
            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                    {/* Colonne GAUCHE - Exemples (1/5) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                💡 <span className="text-sm uppercase tracking-wider text-blue-600">Exemples</span>
                            </h2>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest text-blue-500">Questions</h3>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex gap-2"><span>•</span> <span>Comment résoudre une équation du second degré ?</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Quelle est la différence entre une fonction affine et linéaire ?</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Comment calculer une limite en l'infini ?</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Qu'est-ce qu'une suite géométrique ?</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest text-green-500">Concepts</h3>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex gap-2"><span>•</span> <span>Les dérivées</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Les nombres complexes</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Le théorème de Pythagore</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Les probabilités conditionnelles</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest text-purple-500">Exercices</h3>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex gap-2"><span>•</span> <span>Résoudre : 2x² + 5x - 3 = 0</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Calculer la dérivée de f(x) = x³ + 2x</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Trouver la limite de (x²-1)/(x-1) quand x→1</span></li>
                                        <li className="flex gap-2"><span>•</span> <span>Développer (x+2)³</span></li>
                                    </ul>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest text-orange-500">Astuces</h3>
                                    <ul className="space-y-2 text-xs text-gray-500 italic">
                                        <li>✓ Soyez précis dans vos questions</li>
                                        <li>✓ Indiquez votre niveau si nécessaire</li>
                                        <li>✓ Demandez des exemples concrets</li>
                                        <li>✓ N'hésitez pas à poser des questions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colonne MILIEU - Assistant (3/5) */}
                    <div className="lg:col-span-3">
                        <MathAssistant baseContext={`L'utilisateur se nomme ${user.email?.split('@')[0] || 'élève'}.`} />
                    </div>

                    {/* Colonne DROITE - Fonctionnalités & Avantages (1/5) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Fonctionnalités */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                🚀 <span className="text-sm uppercase tracking-widest">IA Maths</span>
                            </h3>
                            <ul className="space-y-4 text-sm opacity-90">
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Réponses en temps réel avec sources citées</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Explications adaptées à votre niveau</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Résolution étape par étape</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Génération d'exercices similaires</span>
                                </li>
                            </ul>
                        </div>

                        {/* Avantages */}
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                📊 <span className="text-sm uppercase tracking-widest">Avantages</span>
                            </h3>
                            <ul className="space-y-4 text-sm opacity-90">
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Disponible 24/7 pour vous aider</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Pas de jugement, posez toutes vos questions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Apprentissage à votre rythme</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>✓</span>
                                    <span>Complément parfait à vos cours</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                            <p className="text-xs text-blue-600 font-medium tracking-wide">
                                Propulsé par mimimaths@i
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-sm text-gray-600">
                        <p>
                            Propulsé par{' '}
                            <span className="text-blue-600 font-medium">
                                mimimaths@i
                            </span>
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            © 2026 Tuteur Maths App - Tous droits réservés
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
