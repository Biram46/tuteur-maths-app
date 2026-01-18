import MathAssistant from '@/app/components/MathAssistant';

/**
 * Page de démonstration de l'assistant mathématique Perplexity AI
 */
export default function AssistantPage() {
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
                                Propulsé par Perplexity AI Pro
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

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center mb-3">
                            <span className="text-2xl mr-3">💡</span>
                            <h3 className="font-semibold text-gray-900">Questions</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Posez n'importe quelle question mathématique et obtenez une réponse détaillée
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center mb-3">
                            <span className="text-2xl mr-3">📚</span>
                            <h3 className="font-semibold text-gray-900">Concepts</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Demandez l'explication de concepts mathématiques complexes
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-center mb-3">
                            <span className="text-2xl mr-3">✏️</span>
                            <h3 className="font-semibold text-gray-900">Exercices</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Obtenez de l'aide pour résoudre vos exercices étape par étape
                        </p>
                    </div>
                </div>

                {/* Assistant Component */}
                <MathAssistant />

                {/* Examples Section */}
                <div className="mt-12 bg-white rounded-lg shadow-md p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        💡 Exemples de questions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Questions générales
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="pl-4">• Comment résoudre une équation du second degré ?</li>
                                <li className="pl-4">• Quelle est la différence entre une fonction affine et linéaire ?</li>
                                <li className="pl-4">• Comment calculer une limite en l'infini ?</li>
                                <li className="pl-4">• Qu'est-ce qu'une suite géométrique ?</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Concepts à expliquer
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="pl-4">• Les dérivées</li>
                                <li className="pl-4">• Les nombres complexes</li>
                                <li className="pl-4">• Le théorème de Pythagore</li>
                                <li className="pl-4">• Les probabilités conditionnelles</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                Exercices
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="pl-4">• Résoudre : 2x² + 5x - 3 = 0</li>
                                <li className="pl-4">• Calculer la dérivée de f(x) = x³ + 2x</li>
                                <li className="pl-4">• Trouver la limite de (x²-1)/(x-1) quand x→1</li>
                                <li className="pl-4">• Développer (x+2)³</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                Astuces
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="pl-4">✓ Soyez précis dans vos questions</li>
                                <li className="pl-4">✓ Indiquez votre niveau si nécessaire</li>
                                <li className="pl-4">✓ Demandez des exemples concrets</li>
                                <li className="pl-4">✓ N'hésitez pas à poser des questions de suivi</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
                        <h3 className="text-xl font-bold mb-4">🚀 Fonctionnalités IA</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Réponses en temps réel avec sources citées</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Explications adaptées à votre niveau</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Résolution étape par étape</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Génération d'exercices similaires</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                        <h3 className="text-xl font-bold mb-4">📊 Avantages</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Disponible 24/7 pour vous aider</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Pas de jugement, posez toutes vos questions</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Apprentissage à votre rythme</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✓</span>
                                <span>Complément parfait à vos cours</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-sm text-gray-600">
                        <p>
                            Propulsé par{' '}
                            <a
                                href="https://www.perplexity.ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Perplexity AI
                            </a>
                            {' '}et{' '}
                            <a
                                href="https://supabase.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 font-medium"
                            >
                                Supabase
                            </a>
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
