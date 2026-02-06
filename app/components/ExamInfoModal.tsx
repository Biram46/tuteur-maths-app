"use client";

import { useState } from "react";

type Tab = "epreuve" | "programme" | "automatismes" | "officiel";

export default function ExamInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<Tab>("epreuve");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
                            🎓
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Épreuve Anticipée de Mathématiques</h2>
                            <p className="text-xs text-blue-300 font-medium uppercase tracking-widest">Première Générale & Technologique</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/5 bg-white/5">
                    <button
                        onClick={() => setActiveTab("epreuve")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "epreuve" ? "border-blue-500 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                    >
                        ⏱️ L'Épreuve
                    </button>
                    <button
                        onClick={() => setActiveTab("programme")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "programme" ? "border-blue-500 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                    >
                        📚 Programme
                    </button>
                    <button
                        onClick={() => setActiveTab("automatismes")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "automatismes" ? "border-blue-500 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                    >
                        ⚡ Automatismes
                    </button>
                    <button
                        onClick={() => setActiveTab("officiel")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "officiel" ? "border-blue-500 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                    >
                        🏛️ Officiel & Dates
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-900/50">

                    {activeTab === "epreuve" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <h3 className="text-blue-400 text-sm font-bold uppercase mb-1">Durée Totale</h3>
                                    <p className="text-3xl font-bold text-white">1h30</p>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                    <h3 className="text-purple-400 text-sm font-bold uppercase mb-1">Coefficient</h3>
                                    <p className="text-3xl font-bold text-white">3</p>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <h3 className="text-emerald-400 text-sm font-bold uppercase mb-1">Format</h3>
                                    <p className="text-sm font-bold text-white mt-2">2 Parties Distinctes</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <span className="bg-blue-600 text-xs px-2 py-1 rounded">Partie 1</span>
                                        Automatismes (20 min)
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm">
                                        <li><strong>Note :</strong> Sur 7 points (généralement).</li>
                                        <li><strong>Sans calculatrice :</strong> La calculatrice est interdite pour cette partie.</li>
                                        <li><strong>Contenu :</strong> Questions flash, calcul mental, résolutions simples, graphiques.</li>
                                        <li><strong>Déroulement :</strong> Sujet distribué au début, ramassé au bout de 20 minutes.</li>
                                    </ul>
                                </div>

                                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <span className="bg-purple-600 text-xs px-2 py-1 rounded">Partie 2</span>
                                        Problèmes (1h10)
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm">
                                        <li><strong>Note :</strong> Sur 13 points.</li>
                                        <li><strong>Avec calculatrice :</strong> Mode examen activé requis.</li>
                                        <li><strong>Contenu :</strong> 2 ou 3 exercices de résolution de problèmes basés sur le programme de 1ère (Tronc Commun).</li>
                                        <li><strong>Compétences :</strong> Modéliser, Raisonner, Calculer, Communiquer.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "programme" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                                <p className="text-amber-200 text-sm">
                                    ⚠️ <strong>Attention :</strong> Ce programme concerne l'enseignement de <em>Tronc Commun</em> (1ère Générale) et non la Spécialité Maths.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Analyse</h3>
                                    <ul className="space-y-2 text-slate-300 text-sm">
                                        <li className="flex items-start gap-2"><span className="text-blue-500">▸</span> Fonctions usuelles (carré, inverse, cube, racine)</li>
                                        <li className="flex items-start gap-2"><span className="text-blue-500">▸</span> Polynômes du second degré (variations, racines)</li>
                                        <li className="flex items-start gap-2"><span className="text-blue-500">▸</span> Dérivation (point de vue local et global)</li>
                                        <li className="flex items-start gap-2"><span className="text-blue-500">▸</span> Exponentielle (propriétés de base, croissance)</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Statistiques & Probas</h3>
                                    <ul className="space-y-2 text-slate-300 text-sm">
                                        <li className="flex items-start gap-2"><span className="text-purple-500">▸</span> Informations chiffrées (taux d'évolution, indices)</li>
                                        <li className="flex items-start gap-2"><span className="text-purple-500">▸</span> Probabilités conditionnelles</li>
                                        <li className="flex items-start gap-2"><span className="text-purple-500">▸</span> Variables aléatoires</li>
                                        <li className="flex items-start gap-2"><span className="text-purple-500">▸</span> Tableaux croisés et arbres pondérés</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Géométrie (Techno)</h3>
                                    <p className="text-xs text-slate-500 mb-2">Spécifique aux séries technologiques (STI2D, STL...)</p>
                                    <ul className="space-y-2 text-slate-300 text-sm">
                                        <li className="flex items-start gap-2"><span className="text-emerald-500">▸</span> Trigonométrie (cercle trigo)</li>
                                        <li className="flex items-start gap-2"><span className="text-emerald-500">▸</span> Produit scalaire (selon série)</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === "automatismes" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-6 rounded-xl border border-blue-500/20">
                                <h3 className="text-xl font-bold text-white mb-2">L'enjeu des Automatismes</h3>
                                <p className="text-slate-300 text-sm">
                                    Cette partie vise à évaluer la maîtrise des calculs élémentaires indispensables.
                                    Les questions sont rapides (moins de 2 min par question) et demandent de la dextérité.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-white mb-2">Calcul Numérique</h4>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>• Fractions (addition, simplification)</li>
                                        <li>• Puissances (règles de calcul)</li>
                                        <li>• Racines carrées</li>
                                        <li>• Pourcentages et évolutions</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-white mb-2">Algèbre</h4>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>• Développement / Factorisation simple</li>
                                        <li>• Équations du premier degré</li>
                                        <li>• Inéquations simples</li>
                                        <li>• Identités remarquables</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-white mb-2">Fonctions</h4>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>• Image / Antécédent (lecture graphique)</li>
                                        <li>• Signe d'une fonction affine</li>
                                        <li>• Coefficient directeur</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-white mb-2">Géométrie</h4>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>• Pythagore / Thalès</li>
                                        <li>• Aires et volumes usuels</li>
                                        <li>• Conversion d'unités</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "officiel" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">📅 Calendrier Prévisionnel 2026</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 text-center">
                                            <span className="block text-xs text-slate-500 uppercase">MOIS</span>
                                            <span className="font-bold text-white">JUIN</span>
                                        </div>
                                        <div className="flex-1 bg-white/5 p-3 rounded-lg border-l-4 border-blue-500">
                                            <p className="text-sm font-medium text-white">Épreuve Écrite</p>
                                            <p className="text-xs text-slate-400">Date nationale à confirmer par le Ministère (généralement mi-juin).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">🌐 Sources Officielles (Mises à jour)</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <a href="https://eduscol.education.fr/2405/mathematiques-au-lycee-general-et-technologique" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🏛️</span>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Eduscol - Mathématiques Lycée</p>
                                                <p className="text-xs text-slate-500">Programmes, ressources et aménagements officiels.</p>
                                            </div>
                                        </div>
                                        <span className="text-slate-500 group-hover:text-white">↗</span>
                                    </a>
                                    <a href="https://www.education.gouv.fr/bo" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">📜</span>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Bulletin Officiel (BO)</p>
                                                <p className="text-xs text-slate-500">Dernières circulaires et textes réglementaires.</p>
                                            </div>
                                        </div>
                                        <span className="text-slate-500 group-hover:text-white">↗</span>
                                    </a>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">🤖</div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Besoin de la dernière info ?</h4>
                                        <p className="text-xs text-slate-300 mt-1">
                                            Les dates exactes et circulaires peuvent changer. Demandez à l'Assistant IA dans le panneau de droite :
                                            <em className="block mt-1 text-blue-200">"Quelles sont les dernières nouvelles du BO concernant les maths en première ?"</em>
                                            Il vérifiera le web pour vous en temps réel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
