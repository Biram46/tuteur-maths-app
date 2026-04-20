'use client';

import MathTable from '@/app/components/MathTable';

/**
 * Page de test pour les tableaux de variations
 * Accessible via /test-variations
 */
export default function TestVariationsPage() {
    // Test 1: Polynôme du second degré (Première spé - forme canonique)
    // f(x) = -x² + 4x - 3 = -(x-2)² + 1, maximum en x=2, f(2)=1
    // Format : flèche, valeur du sommet, flèche (SANS double barre, SANS valeurs aux infinies)
    const test1 = {
        xValues: ['-inf', '2', '+inf'],
        rows: [
            {
                label: 'f(x)',
                type: 'variation' as const,
                content: ['nearrow', '1', 'searrow']
            }
        ]
    };

    // Test 2: Fonction cube avec 2 extremums (Première spé)
    // f(x) = x³ - 3x, dérivée f'(x) = 3x² - 3
    // Format : flèche, f(-1), flèche, f(1), flèche (SANS valeurs aux infinis)
    const test2 = {
        xValues: ['-inf', '-1', '1', '+inf'],
        rows: [
            {
                label: "f'(x)",
                type: 'sign' as const,
                content: ['+', '0', '-', '0', '+']
            },
            {
                label: 'f(x)',
                type: 'variation' as const,
                // Format Première spé : valeurs aux extremums uniquement
                content: ['nearrow', '2', 'searrow', '-2', 'nearrow']
            }
        ]
    };

    // Test 3: Variation avec valeur interdite (fonction homographique)
    // f(x) = (x-1)/(x+4), interdit en x=-4
    // En Première spé: PAS de limites, UNIQUEMENT les flèches
    const test3 = {
        xValues: ['-inf', '-4', '+inf'],
        rows: [
            {
                label: "f'(x)",
                type: 'sign' as const,
                content: ['+', '||', '+']
            },
            {
                label: 'f(x)',
                type: 'variation' as const,
                // Format Première spé: flèches uniquement, pas de valeurs aux bornes
                content: ['nearrow', '||', 'nearrow']
            }
        ]
    };

    // Test 3-terminale: Variation avec valeur interdite (Terminale - avec limites calculées)
    // f(x) = (x-1)/(x+4), interdit en x=-4
    // Format étendu 2N+1 : 7 éléments pour afficher les limites gauche et droite
    const test3Terminale = {
        xValues: ['-inf', '-4', '+inf'],
        rows: [
            {
                label: "f'(x)",
                type: 'sign' as const,
                content: ['+', '||', '+']
            },
            {
                label: 'f(x)',
                type: 'variation' as const,
                // Format Terminale: 7 éléments avec limites calculées
                // lim(x→-∞) = 1, lim(x→-4^-) = +∞, lim(x→-4^+) = -∞, lim(x→+∞) = 1
                content: ['1', 'nearrow', '+inf', '||', '-inf', 'nearrow', '1']
            }
        ]
    };

    // Test 3b: Autre fonction avec valeur interdite
    // f(x) = (x+2)/(x-1), interdit en x=1
    const test3b = {
        xValues: ['-inf', '-2', '1', '+inf'],
        rows: [
            {
                label: "f'(x)",
                type: 'sign' as const,
                content: ['-', '0', '-', '||', '-']
            },
            {
                label: 'f(x)',
                type: 'variation' as const,
                content: ['1', 'searrow', '0', 'searrow', '||', 'searrow', '1']
            }
        ]
    };

    // Test 4: Variation croissante puis décroissante simple
    const test4 = {
        xValues: ['0', '3', '6'],
        rows: [
            {
                label: 'f(x)',
                type: 'variation' as const,
                content: ['0', 'nearrow', '9', 'searrow', '0']
            }
        ]
    };

    // Test 5: Variation décroissante puis croissante
    const test5 = {
        xValues: ['-2', '0', '2'],
        rows: [
            {
                label: 'f(x)',
                type: 'variation' as const,
                content: ['4', 'searrow', '0', 'nearrow', '4']
            }
        ]
    };

    // Test 6: Parabole positive (minimum)
    const test6 = {
        xValues: ['-inf', '1', '+inf'],
        rows: [
            {
                label: 'f(x)',
                type: 'variation' as const,
                content: ['+inf', 'searrow', '-2', 'nearrow', '+inf']
            }
        ]
    };

    // ==========================================
    // TESTS TABLEAUX DE SIGNES POUR QUOTIENTS
    // ==========================================

    // Test Signe 1: Tableau de signes pour quotient f(x) = (e^x - 1)/x
    // Facteur e^x - 1 : négatif avant 0, nul en 0, positif après
    // Facteur x (dénominateur) : négatif avant 0, interdit en 0, positif après
    // Quotient : positif partout (valeur interdite en 0)
    const testSigne1 = {
        xValues: ['-inf', '0', '+inf'],
        rows: [
            {
                label: 'e^x - 1',
                type: 'sign' as const,
                content: ['-', '0', '+']
            },
            {
                label: 'x',
                type: 'sign' as const,
                content: ['-', '||', '+']
            },
            {
                label: 'f(x)',
                type: 'sign' as const,
                content: ['+', '||', '+']
            }
        ]
    };

    // Test Signe 2: Tableau de signes pour produit f(x) = -2(x+1)(x-4)
    // Format: une ligne par facteur
    const testSigne2 = {
        xValues: ['-inf', '-1', '4', '+inf'],
        rows: [
            {
                label: 'x + 1',
                type: 'sign' as const,
                content: ['-', '0', '+', '+']
            },
            {
                label: 'x - 4',
                type: 'sign' as const,
                content: ['-', '-', '-', '0', '+']
            },
            {
                label: '-2',
                type: 'sign' as const,
                content: ['-', '-', '-', '-']
            },
            {
                label: 'f(x)',
                type: 'sign' as const,
                content: ['-', '0', '+', '0', '-']
            }
        ]
    };

    // Test Signe 3: Tableau de signes pour quotient f(x) = (x-1)(x+3)/(x+2)
    // Chaque facteur sur une ligne séparée
    // (x-1) : racine en 1
    // (x+3) : racine en -3
    // (x+2) au dénominateur : valeur interdite en -2
    const testSigne3 = {
        xValues: ['-inf', '-3', '-2', '1', '+inf'],
        rows: [
            {
                label: 'x - 1',
                type: 'sign' as const,
                content: ['-', '-', '-', '0', '+']
            },
            {
                label: 'x + 3',
                type: 'sign' as const,
                content: ['-', '0', '+', '+', '+']
            },
            {
                label: 'x + 2',
                type: 'sign' as const,
                content: ['-', '-', '||', '+', '+']
            },
            {
                label: 'f(x)',
                type: 'sign' as const,
                // Signes combinés: (-)(-)(-)=-, puis 0, puis (-)(+)(-)=+, puis ||, puis (-)(+)(+)=-, puis 0, puis +++
                content: ['-', '0', '+', '||', '-', '0', '+']
            }
        ]
    };

    // Test Signe 4: f(x) = (x+3)(x-2)/(x-1) - fraction avec valeur interdite
    // Valeur interdite en x=1, zéros en x=-3 et x=2
    // Format 2N-3: 7 éléments pour N=5 x-values
    // Positions: 1=]-inf,-3[, 2=x=-3, 3=]-3,1[, 4=x=1, 5=]1,2[, 6=x=2, 7=]2,+inf[
    const testSigne4 = {
        xValues: ['-inf', '-3', '1', '2', '+inf'],
        rows: [
            {
                label: 'x + 3',
                type: 'sign' as const,
                // Zéro en x=-3 (position 2), négatif avant, positif après
                content: ['-', '0', '+', '+', '+', '+', '+']
            },
            {
                label: 'x - 2',
                type: 'sign' as const,
                // Zéro en x=2 (position 6), négatif avant, positif après
                content: ['-', '-', '-', '-', '-', '0', '+']
            },
            {
                label: 'x - 1',
                type: 'sign' as const,
                // Valeur interdite en x=1 (position 4), négatif avant, positif après
                content: ['-', '-', '-', '||', '+', '+', '+']
            },
            {
                label: 'f(x)',
                type: 'sign' as const,
                // Combinaison: (-)(-)/(-)=-, 0, (+)(-)/(-)=+, ||, (+)(-)/(+)=-, 0, (+)(+)/(+)=+
                content: ['-', '0', '+', '||', '-', '0', '+']
            }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">
                    📊 Tests des Tableaux de Variations
                </h1>

                <div className="space-y-12">
                    {/* Test 1 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 1 : Polynôme du second degré (Première spé - forme canonique)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = -x² + 4x - 3 = -(x-2)² + 1. Maximum en x=2, f(2)=1.
                            <br />
                            <strong>Format :</strong> flèche, valeur du sommet, flèche (SANS double barre, SANS valeurs aux infinis)
                        </p>
                        <MathTable data={test1} title="Tableau de Variations - Polynôme 2nd degré" />
                    </div>

                    {/* Test 2 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 2 : Fonction cube avec 2 extremums (Première spé)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = x³ - 3x, f&apos;(x) = 3x² - 3.
                            <br />
                            <strong>Format :</strong> flèche, f(-1)=2, flèche, f(1)=-2, flèche (SANS valeurs aux infinis)
                            <br />
                            <strong>⚠️ PAS de double barre, PAS de pointillés sur la ligne variation</strong>
                        </p>
                        <MathTable data={test2} title="Tableau de Variations - Fonction avec 2 extremums" />
                    </div>

                    {/* Test 3 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 3 : Fonction rationnelle avec valeur interdite (Première spé)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = (x-1)/(x+4), f&apos;(x) = 5/(x+4)² &gt; 0. Format court : uniquement flèches, sans valeurs aux bornes.
                        </p>
                        <MathTable data={test3} title="Tableau Première spé (sans limites)" />
                    </div>

                    {/* Test 3 Terminale */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 3 Terminale : Fonction rationnelle avec limites calculées
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = (x-1)/(x+4), lim(x→-∞) = 1, lim(x→-4⁻) = +∞, lim(x→-4⁺) = -∞, lim(x→+∞) = 1
                        </p>
                        <MathTable data={test3Terminale} title="Tableau Terminale avec limites" />
                    </div>

                    {/* Test 3b */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 3b : Autre fonction rationnelle avec valeur interdite
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = (x+2)/(x-1), valeur interdite en x=1
                        </p>
                        <MathTable data={test3b} title="Tableau avec valeur interdite et extremum" />
                    </div>

                    {/* Test 4 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 4 : Croissant puis décroissant (valeurs finies)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f croissante de 0 à 9, puis décroissante de 9 à 0
                        </p>
                        <MathTable data={test4} title="Variations simples" />
                    </div>

                    {/* Test 5 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 5 : Décroissant puis croissant (minimum)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f décroissante de 4 à 0, puis croissante de 0 à 4
                        </p>
                        <MathTable data={test5} title="Variations avec minimum" />
                    </div>

                    {/* Test 6 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test 6 : Parabole positive (minimum centré)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            f(x) = (x-1)² - 2, minimum en x=1, f(1)=-2
                        </p>
                        <MathTable data={test6} title="Parabole avec minimum" />
                    </div>

                    {/* Séparateur */}
                    <div className="border-t-4 border-indigo-300 my-8">
                        <h2 className="text-2xl font-bold text-indigo-700 mt-4 mb-6 text-center">
                            📋 Tests Tableaux de Signes (Quotients)
                        </h2>
                    </div>

                    {/* Test Signe 1 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test Signe 1 : Quotient f(x) = (e^x - 1)/x
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            <strong>Vérifier :</strong>
                            <br />• Ligne pointillée sous x=0 pour le numérateur (0) → va jusqu&apos;en bas
                            <br />• Ligne pointillée sous x=0 pour le dénominateur (||) → s&apos;arrête avant la dernière ligne
                            <br />• Double barre rouge sur la dernière ligne pour la valeur interdite
                        </p>
                        <MathTable data={testSigne1} title="Tableau de signes - Quotient simple" />
                    </div>

                    {/* Test Signe 2 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test Signe 2 : Produit f(x) = -2(x+1)(x-4)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            <strong>Format général : une ligne par facteur</strong>
                            <br />• (x+1) : racine en -1 → ligne pointillée jusqu&apos;en bas
                            <br />• (x-4) : racine en 4 → ligne pointillée jusqu&apos;en bas
                            <br />• -2 : constante négative
                            <br />• f(x) : produit des signes
                        </p>
                        <MathTable data={testSigne2} title="Tableau de signes - Produit avec 3 facteurs" />
                    </div>

                    {/* Test Signe 3 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test Signe 3 : Quotient f(x) = (x-1)(x+3)/(x+2)
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            <strong>Format général : une ligne par facteur</strong>
                            <br />• (x-1) : racine en 1 → ligne pointillée jusqu&apos;en bas
                            <br />• (x+3) : racine en -3 → ligne pointillée jusqu&apos;en bas
                            <br />• (x+2) au dénominateur : valeur interdite en -2 → ligne pointillée s&apos;arrête avant dernière ligne + double barre
                            <br />• f(x) : combinaison des signes
                        </p>
                        <MathTable data={testSigne3} title="Tableau de signes - Quotient avec 3 facteurs" />
                    </div>

                    {/* Test Signe 4 - fraction avec valeur interdite */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-400">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">
                            Test Signe 4 : f(x) = (x+3)(x-2)/(x-1) — valeur interdite en x=1
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            <strong>C'est le cas signalé dans les bugs !</strong>
                            <br />• x+3 : racine en -3
                            <br />• x-2 : racine en 2
                            <br />• x-1 au dénominateur : valeur interdite en 1
                            <br />• <strong>Vérifier :</strong> Double barre || en x=1 sur la ligne f(x)
                            <br />• <strong>Vérifier :</strong> Lignes pointillées en x=-3 et x=2
                        </p>
                        <MathTable data={testSigne4} title="Tableau de signes - f(x) = (x+3)(x-2)/(x-1)" />
                    </div>
                </div>

                <div className="mt-12 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                    <h3 className="font-bold text-amber-800 mb-2">⚠️ Points à vérifier :</h3>
                    <ul className="list-disc list-inside text-amber-700 space-y-1 text-sm">
                        <li>Les flèches traversent bien les intervalles (d&apos;une valeur x à l&apos;autre)</li>
                        <li>Les valeurs sont positionnées correctement (haut pour maxima, bas pour minima)</li>
                        <li>Les doubles barres || s&apos;affichent correctement pour les valeurs interdites</li>
                        <li>Les signes + et - s&apos;affichent sur les intervalles (positions impaires)</li>
                        <li>Les infinis s&apos;affichent avec le symbole ∞</li>
                        <li><strong>Tableaux de signes :</strong></li>
                        <li className="ml-4">• Lignes pointillées sous les 0 (racines) → vont jusqu&apos;en bas du tableau</li>
                        <li className="ml-4">• Lignes pointillées sous les || (valeurs interdites) → s&apos;arrêtent avant la dernière ligne</li>
                        <li className="ml-4">• Doubles barres rouges sur la dernière ligne aux positions interdites</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
