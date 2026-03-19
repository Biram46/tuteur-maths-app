'use client';

import React, { useState, useEffect } from 'react';
import { QcmQuestion, generateRandomQcmSession } from '@/lib/qcm-data';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useRouter } from 'next/navigation';

export default function QcmModule({ userName }: { userName: string }) {
    const router = useRouter();

    const [questions, setQuestions] = useState<QcmQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialisation & Load depuis LocalStorage
    useEffect(() => {
        const storedSession = localStorage.getItem('qcm_session');
        if (storedSession) {
            try {
                const parsed = JSON.parse(storedSession);
                // Valider au moins que ça contient bien 12 questions existantes si possible,
                // ou redémarrer.
                if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                    setQuestions(parsed.questions);
                    setAnswers(parsed.answers || {});
                    setCurrentIndex(parsed.currentIndex || 0);
                    setIsFinished(parsed.isFinished || false);
                    setScore(parsed.score ?? null);
                    return;
                }
            } catch (e) {
                console.error("Erreur lecture session QCM", e);
            }
        }
        
        // Nouvelle session
        startNewSession();
    }, []);

    const startNewSession = () => {
        const newQuestions = generateRandomQcmSession(12);
        setQuestions(newQuestions);
        setAnswers({});
        setCurrentIndex(0);
        setIsFinished(false);
        setScore(null);
        saveSession(newQuestions, {}, 0, false, null);
    };

    const saveSession = (
        qs = questions,
        ans = answers,
        idx = currentIndex,
        fin = isFinished,
        scr = score
    ) => {
        localStorage.setItem('qcm_session', JSON.stringify({
            questions: qs,
            answers: ans,
            currentIndex: idx,
            isFinished: fin,
            score: scr
        }));
    };

    const handleSelectOption = (idx: number) => {
        if (isFinished) return;
        const newAns = { ...answers, [questions[currentIndex].id]: idx };
        setAnswers(newAns);
        saveSession(questions, newAns, currentIndex, isFinished, score);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            saveSession(questions, answers, currentIndex + 1, isFinished, score);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            saveSession(questions, answers, currentIndex - 1, isFinished, score);
        }
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        // Calcul du score (chaque bonne réponse = 1 point)
        let total = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswerIndex) {
                total += 1;
            }
        });
        
        // Ramené sur 20 : (points / nb_questions) * 20
        const finalScoreSur20 = Math.round((total / questions.length) * 20 * 10) / 10;
        
        setScore(finalScoreSur20);
        setIsFinished(true);
        saveSession(questions, answers, currentIndex, true, finalScoreSur20);

        // Appel d'une API pour envoyer le résultat
        try {
            await fetch('/api/submit-qcm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName,
                    score: finalScoreSur20,
                    scoreBase: total,
                    totalQuestions: questions.length,
                    date: new Date().toISOString()
                })
            });
        } catch (e) {
            console.error("Erreur enregistrement QCM:", e);
        }
        
        setIsSubmitting(false);
    };

    if (questions.length === 0) {
        return <div className="p-8 text-center text-slate-400">Génération du test en cours...</div>;
    }

    const currentQuestion = questions[currentIndex];
    const isAnswered = answers[currentQuestion.id] !== undefined;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 shrink-0">
            <GlobalStyles />
            {/* Header progress */}
            <div className="mb-8 p-6 bg-slate-900/50 border border-slate-700 rounded-3xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white mb-2 md:mb-0">
                        {isFinished ? 'Bilan d\'entraînement' : 'Module Entraîne-toi (QCM Épreuve anticipée de maths 1ère)'}
                    </h2>
                    <div className="text-sm font-medium px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                        {isFinished ? 'Terminé' : `Question ${currentIndex + 1} sur ${questions.length}`}
                    </div>
                </div>

                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${Math.max(5, ((currentIndex + (isFinished ? 1 : 0)) / questions.length) * 100)}%` }}
                    />
                </div>
            </div>

            {isFinished ? (
                /* RESULTATS */
                <div className="p-8 bg-slate-900 border border-slate-700/50 rounded-3xl text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(16,185,129,0.3)] mb-6 text-white">
                        ✓
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">QCM Validé !</h2>
                    <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                        Tes résultats ont été enregistrés et transmis à ton professeur. Poursuis tes efforts !
                    </p>

                    <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 w-full max-w-sm shrink-0 mb-8">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Note sur 20</div>
                        <div className="text-5xl font-black text-green-400 drop-shadow-md">
                            {score} / 20
                        </div>
                    </div>

                    <button 
                        onClick={startNewSession}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        Refaire un Enraînement
                    </button>
                </div>
            ) : (
                /* QUESTION ACTUELLE */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Colonne QUESTION */}
                    <div className="lg:col-span-12 shrink-0">
                        <div className="bg-slate-900/40 border border-slate-700 rounded-[2rem] p-6 lg:p-10 min-h-[400px] flex flex-col relative">
                            <span className="absolute top-6 left-6 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                {currentQuestion.category}
                            </span>

                            <div className="mt-12 text-lg lg:text-xl text-slate-100 font-medium leading-relaxed prose prose-invert prose-p:my-2 bg-transparent max-w-none math-prose">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {currentQuestion.question}
                                </ReactMarkdown>
                            </div>

                            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options.map((opt, idx) => {
                                    const isSelected = answers[currentQuestion.id] === idx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectOption(idx)}
                                            className={`p-4 rounded-2xl border-2 transition-all flex items-start text-left gap-4 ${
                                                isSelected 
                                                    ? 'bg-blue-600/20 border-blue-500 border-2' 
                                                    : 'bg-slate-800 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/80 shadow-md'
                                            }`}
                                        >
                                            <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-500'
                                            }`}>
                                                {isSelected && <span className="w-2 h-2 bg-white rounded-full"></span>}
                                            </div>
                                            <div className="flex-1 overflow-x-auto custom-scrollbar math-prose text-slate-200">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {opt}
                                                </ReactMarkdown>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-10 flex flex-wrap gap-4 items-center justify-between border-t border-slate-700/50">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-medium disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    ← Précédent
                                </button>
                                
                                {currentIndex === questions.length - 1 ? (
                                    <button
                                        onClick={handleFinish}
                                        disabled={!isAnswered || isSubmitting}
                                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 shadow-lg shadow-green-500/20 text-white font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                                    >
                                        {isSubmitting ? 'Validation...' : 'Valider mon QCM'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        disabled={!isAnswered}
                                        className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-white font-bold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                                    >
                                        Suivant →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Juste un peu de CSS personnalisé pour forcer le wrap de math block
const GlobalStyles = () => (
    <style jsx global>{`
        .math-prose .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 0.5rem;
            margin: 0;
        }
    `}</style>
)
