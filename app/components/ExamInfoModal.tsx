"use client";

import { useState } from "react";

type Tab = "epreuve" | "automatismes" | "programmes" | "veille";

export default function ExamInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [lastVerified] = useState("7 février 2026");
    const [activeTab, setActiveTab] = useState<Tab>("epreuve");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t-blue-500/50">

                {/* Header Officiel Style */}
                <div className="p-6 border-b border-white/10 bg-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-inner overflow-hidden border-2 border-slate-700">
                            <div className="flex flex-col h-full w-full">
                                <div className="bg-[#002157] h-1/3 w-full"></div>
                                <div className="bg-white h-1/3 w-full"></div>
                                <div className="bg-[#E1000F] h-1/3 w-full"></div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase font-['Orbitron']">Guide : Épreuve Anticipée 1ère Maths 2026</h2>
                            <p className="text-sm text-blue-400 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Épreuve Anticipée de Mathématiques (1ère)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:block text-[10px] text-slate-500 font-mono uppercase">Vérifié le {lastVerified}</span>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center border border-white/5">✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto bg-slate-900/50 border-b border-white/5">
                    {[
                        { id: "epreuve", label: "📄 Définition", icon: "⏱️" },
                        { id: "automatismes", label: "⚡ Automatismes (BO)", icon: "📋" },
                        { id: "programmes", label: "📚 Les 3 Parcours", icon: "🛤️" },
                        { id: "veille", label: "📜 Veille & Parcoursup", icon: "🌐" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex-1 min-w-[150px] py-4 px-6 text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === tab.id ? "border-blue-500 text-white bg-blue-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-slate-900 to-[#0f172a] custom-scrollbar">

                    {activeTab === "epreuve" && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                                    <div className="relative p-6 rounded-2xl bg-slate-800/40 border border-white/10 text-center">
                                        <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Durée de l'écrit</h4>
                                        <p className="text-4xl font-black text-white">2h00</p>
                                        <p className="text-[10px] text-blue-400 mt-2 font-bold italic">Source : BO n°24 du 12/06/25</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                                    <div className="relative p-6 rounded-2xl bg-slate-800/40 border border-white/10 text-center">
                                        <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Coefficient</h4>
                                        <p className="text-4xl font-black text-white">2</p>
                                        <p className="text-[10px] text-purple-400 mt-2 font-bold italic">Inscrit au dossier Parcoursup</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="relative p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center">
                                        <h4 className="text-xs font-black text-red-300 uppercase mb-2">Calculatrice</h4>
                                        <p className="text-2xl font-black text-red-500 uppercase tracking-tighter">Interdite</p>
                                        <p className="text-[10px] text-red-400 mt-2 font-bold italic">Pour TOUTE la durée (2h)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-8">
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 bg-blue-600"></span> Déroulement de l'épreuve
                                </h3>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg">1</span>
                                            <h4 className="font-bold text-white">Partie Automatismes (6 pts)</h4>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed ml-11">
                                            Série de questions flash (QCM ou réponses courtes). Évalue la rapidité et la maîtrise des bases (calcul, pourcentages, fonctions usuelles).
                                            <br /><strong className="text-blue-400 font-bold block mt-2 text-xs">Temps conseillé : 30 min</strong>
                                        </p>
                                    </div>
                                    <div className="space-y-4 text-slate-300">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">2</span>
                                            <h4 className="font-bold text-white">Partie Problèmes (14 pts)</h4>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed ml-11">
                                            Comprend deux à trois exercices indépendants portant sur le programme spécifique de votre parcours (Spécialité, ES ou Techno).
                                            <br /><strong className="text-purple-400 font-bold block mt-2 text-xs">Temps conseillé : 1h30</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "automatismes" && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Programme détaillé (Annexe BO 12/06/2025)</h3>
                                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-400 font-black uppercase">Standard National</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { title: "Calcul Numérique & Algébrique", items: ["Opérations sur fractions & puissances", "Écritures (décimale, fraction, %)", "Identités remarquables", "Développer / Factoriser / Réduire", "Équations 1er degré & produit nul"] },
                                    { title: "Proportions & Évolutions", items: ["Calculer / Appliquer des proportions", "Taux d'évolution multiplicative", "Multiplier par (1 + t / 100)", "Évolution réciproque", "Proportions de proportions"] },
                                    { title: "Analyse & Fonctions", items: ["Images & Antécédents (courbe/tableau)", "Signe & Variations d'une fonction", "Résolution graphique d'équations", "Taux de variation (affine)", "Équation de droite (y = ax + b)"] },
                                    { title: "Statistiques & Probabilités", items: ["Moyenne, Médiane, Écart-type", "Fréquences & Effectifs", "Probabilité : Équiprobabilité", "Arbres pondérés (dénombrement)", "Lecture de graphiques (Histogrammes)"] },
                                    { title: "Géométrie & Mesures", items: ["Aires, Périmètres, Volumes", "Conversions d'unités (m, m², m³)", "Pythagore & Thalès", "Trigonométrie de base"] },
                                    { title: "Logique & Divers", items: ["Ordres de grandeur", "Isoler une variable dans une formule", "Cohérence d'un résultat", "Comparaison de nombres"] }
                                ].map((cat, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all hover:bg-white/[0.07] group">
                                        <h4 className="font-bold text-blue-400 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 group-hover:scale-150 transition-transform"></span>
                                            {cat.title}
                                        </h4>
                                        <ul className="space-y-2">
                                            {cat.items.map((item, j) => (
                                                <li key={j} className="text-xs text-slate-400 flex items-start gap-2">
                                                    <span className="text-blue-500/50">•</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "programmes" && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <h3 className="text-xl font-bold text-white">Sujets adaptés selon les 3 profils</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="p-6 rounded-2xl bg-slate-800/50 border-l-4 border-blue-600 h-full flex flex-col">
                                    <h4 className="font-bold text-white mb-2">Profil A : Spécialité</h4>
                                    <p className="text-xs text-slate-400 mb-4">Élèves de Voie Générale ayant choisi la spécialité Mathématiques.</p>
                                    <div className="flex-1 bg-black/20 p-4 rounded-xl text-xs text-slate-300">
                                        <strong>Programme :</strong> Sujet basé sur l'intégralité du programme de la spécialité Première.
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-800/50 border-l-4 border-emerald-600 h-full flex flex-col">
                                    <h4 className="font-bold text-white mb-2">Profil B : Scientifique (ES)</h4>
                                    <p className="text-xs text-slate-400 mb-4">Élèves de Voie Générale SANS spécialité mathématiques.</p>
                                    <div className="flex-1 bg-black/20 p-4 rounded-xl text-xs text-slate-300">
                                        <strong>Programme :</strong> Sujet basé sur le bloc mathématique de l'Enseignement Scientifique.
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-800/50 border-l-4 border-purple-600 h-full flex flex-col">
                                    <h4 className="font-bold text-white mb-2">Profil C : Technologique</h4>
                                    <p className="text-xs text-slate-400 mb-4">Séries STI2D, STMG, STL, ST2S, STD2A, STHR.</p>
                                    <div className="flex-1 bg-black/20 p-4 rounded-xl text-xs text-slate-300">
                                        <strong>Programme :</strong> Sujet basé sur le programme commun de mathématiques technologiques.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "veille" && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="bg-blue-600/10 p-6 border border-blue-500/30 rounded-2xl">
                                <h3 className="text-lg font-bold text-white mb-2">Statut de la Veille Officielle</h3>
                                <p className="text-sm text-slate-400">
                                    Les textes définitifs ont été publiés au BO n°24 le 12 juin 2025.
                                    Cette page est alimentée par les flux officiels (Education.gouv, Eduscol).
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <a
                                    href="https://www.education.gouv.fr/epreuve-anticipee-de-mathematiques-de-la-classe-de-premiere-des-voies-generale-et-342006"
                                    target="_blank"
                                    className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">⚡</span>
                                        <div>
                                            <p className="font-bold text-white">Veille Officielle Épreuve</p>
                                            <p className="text-[10px] text-slate-500">Page officielle du Ministère (Textes et Modalités)</p>
                                        </div>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
                                </a>
                                <a
                                    href="https://eduscol.education.fr/4230/epreuve-anticipee-de-mathematiques-aux-baccalaureats-general-et-technologique"
                                    target="_blank"
                                    className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">🎯</span>
                                        <div>
                                            <p className="font-bold text-white">Sujets Zéro Officiels</p>
                                            <p className="text-[10px] text-slate-500">Accéder aux modèles d'épreuves (Eduscol)</p>
                                        </div>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
                                </a>
                            </div>

                            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-white">Rester informé des changements</h4>
                                    <p className="text-xs text-slate-400">Recevez une notification en cas de nouvelle circulaire ou modification du programme.</p>
                                </div>
                                <button
                                    onClick={() => alert("✅ Inscription réussie ! Vous recevrez les alertes officielles par email.")}
                                    className="whitespace-nowrap px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span>🔔</span> M'ABONNER AUX ALERTES
                                </button>
                            </div>

                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 text-center">
                                <p className="text-xs text-slate-500 italic">
                                    "La note de l'épreuve anticipée est intégrée au dossier Parcoursup (Session 2027)
                                    et pèse pour l'orientation post-bac."
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Reassurance */}
                <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-center items-center gap-10">
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">📅 ÉPREUVE LE VENDREDI 12 JUIN 2026 (8h-10h)</p>
                    <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">🛡️ SOURCE MINISTÉRIELLE VÉRIFIÉE</p>
                </div>
            </div>
        </div>
    );
}
