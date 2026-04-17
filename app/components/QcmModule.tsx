'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QcmQuestion, generateRandomQcmSession } from '@/lib/qcm-data';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import { katexSanitizeSchema } from '@/lib/rehype-sanitize-katex';
import 'katex/dist/katex.min.css';
import { useRouter } from 'next/navigation';
import MathTable from './MathTable';
import MathGraph from './MathGraph';
import { fixLatexContent } from '@/lib/latex-fixer';

const CLASS_OPTIONS = ['1ère SPE MATHS', '1ère STMG', '1ère Maths Spécifique'];

export default function QcmModule() {
    const router = useRouter();
    const correctionRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (!correctionRef.current) return;
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        const el = correctionRef.current;
        const canvas = await html2canvas(el, {
            scale: 2,
            backgroundColor: '#0f172a',
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 10;

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);

        while (heightLeft > 0) {
            position = -(pageHeight - 20 - 10) + position;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20);
        }

        pdf.save(`correction_qcm_${studentName.replace(/\s+/g, '_')}.pdf`);
    };

    const [studentName, setStudentName] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [started, setStarted] = useState(false);

    const [questions, setQuestions] = useState<QcmQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Initialisation & Load depuis LocalStorage
    useEffect(() => {
        const storedSession = localStorage.getItem('qcm_session');
        if (storedSession) {
            try {
                const parsed = JSON.parse(storedSession);
                if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0
                    && parsed.questions.every((q: any) => q && q.id && Array.isArray(q.options)
                        && typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length)
                ) {
                    const safeIndex = Math.min(
                        Math.max(0, parsed.currentIndex || 0),
                        parsed.questions.length - 1
                    );
                    setQuestions(parsed.questions);
                    setAnswers(parsed.answers || {});
                    setCurrentIndex(safeIndex);
                    setIsFinished(parsed.isFinished || false);
                    setScore(parsed.score ?? null);
                    setIsSaved(parsed.isSaved || false);
                    if (parsed.studentName) setStudentName(parsed.studentName);
                    if (parsed.studentClass) setStudentClass(parsed.studentClass);
                    if (parsed.started) setStarted(true);
                    return;
                }
            } catch (e) {
                console.error("Erreur lecture session QCM — réinitialisation", e);
                localStorage.removeItem('qcm_session');
            }
        }

        startNewSession();
    }, []);

    const startNewSession = () => {
        const newQuestions = generateRandomQcmSession(12);
        setQuestions(newQuestions);
        setAnswers({});
        setCurrentIndex(0);
        setIsFinished(false);
        setScore(null);
        setIsSaved(false);
        saveSession(newQuestions, {}, 0, false, null, false);
    };

    const saveSession = (
        qs = questions,
        ans = answers,
        idx = currentIndex,
        fin = isFinished,
        scr = score,
        saved = isSaved
    ) => {
        try {
            localStorage.setItem('qcm_session', JSON.stringify({
                questions: qs,
                answers: ans,
                currentIndex: idx,
                isFinished: fin,
                score: scr,
                isSaved: saved,
                studentName,
                studentClass,
                started,
            }));
        } catch (e) {
            console.warn('QCM: impossible de sauvegarder la session (quota dépassé ?)', e);
        }
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
        let total = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswerIndex) {
                total += 1;
            }
        });
        const finalScoreSur20 = Math.round((total / questions.length) * 20 * 10) / 10;

        setScore(finalScoreSur20);
        setIsFinished(true);
        setIsSaved(false);
        saveSession(questions, answers, currentIndex, true, finalScoreSur20, false);
        setIsSubmitting(false);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await fetch('/api/submit-qcm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName,
                    studentClass,
                    score,
                    scoreBase: questions.filter(q => answers[q.id] === q.correctAnswerIndex).length,
                    totalQuestions: questions.length,
                    date: new Date().toISOString()
                })
            });
            setIsSaved(true);
            saveSession(questions, answers, currentIndex, true, score, true);
        } catch (e) {
            console.error("Erreur enregistrement QCM:", e);
        }
        setIsSubmitting(false);
    };

    if (questions.length === 0) {
        return <div className="p-8 text-center text-slate-400">Génération du test en cours...</div>;
    }

    // ── Écran d'accueil : prénom + classe ──
    if (!started) {
        return (
            <div className="max-w-lg mx-auto p-4 md:p-8">
                <GlobalStyles />
                <div className="p-8 bg-slate-900/80 border border-slate-700 rounded-3xl backdrop-blur-md text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                        ?
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">QCM Entraîne-toi</h2>
                    <p className="text-slate-400 mb-8 text-sm">Épreuve anticipée de maths — 1ère</p>

                    <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Ton prénom</label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Entre ton prénom"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                maxLength={30}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Ta classe</label>
                            <select
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="" disabled>Sélectionne ta classe</option>
                                {CLASS_OPTIONS.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setStarted(true);
                            saveSession(questions, answers, 0, false, null, false);
                        }}
                        disabled={!studentName.trim() || !studentClass}
                        className="mt-8 w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all uppercase tracking-widest text-sm"
                    >
                        Commencer le QCM
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    
    // Protection: si la question courante est invalide, reset la session
    if (!currentQuestion || !currentQuestion.id || !Array.isArray(currentQuestion.options)) {
        startNewSession();
        return <div className="p-8 text-center text-slate-400">Réinitialisation du QCM…</div>;
    }
    
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
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">QCM Terminé !</h2>
                    <p className="text-slate-400 mb-2 max-w-lg mx-auto">
                        {studentName} — {studentClass}
                    </p>
                    <p className="text-slate-500 mb-8 max-w-lg mx-auto text-sm">
                        {isSaved ? 'Tes résultats ont été enregistrés et transmis à ton professeur.' : 'Sauvegarde tes résultats pour les transmettre à ton professeur.'}
                    </p>

                    <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 w-full max-w-sm shrink-0 mb-8">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Note sur 20</div>
                        <div className="text-5xl font-black text-green-400 drop-shadow-md">
                            {score} / 20
                        </div>
                    </div>

                    {!isSaved ? (
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="mb-4 px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
                        >
                            {isSubmitting ? 'Enregistrement...' : 'Sauvegarder ma note'}
                        </button>
                    ) : (
                        <div className="mb-4 px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold">
                            Note sauvegardée
                        </div>
                    )}

                    {isSaved && (
                        <button
                            onClick={startNewSession}
                            className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-xs"
                        >
                            Refaire un entraînement
                        </button>
                    )}

                    <div ref={correctionRef} className="w-full text-left pt-12 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-3 flex-1">
                                <span>🔍</span> Correction détaillée — {score}/20
                            </h3>
                            {isSaved && (
                                <button
                                    onClick={handleDownloadPdf}
                                    className="shrink-0 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all uppercase tracking-widest text-xs font-bold"
                                >
                                    PDF
                                </button>
                            )}
                        </div>
                        <div className="space-y-12">
                            {questions.map((q, idx) => {
                                const userAnswerIdx = answers[q.id];
                                const isCorrect = userAnswerIdx === q.correctAnswerIndex;
                                const hasUserAnswered = userAnswerIdx !== undefined;

                                return (
                                    <div key={q.id} className={`p-6 md:p-8 rounded-2xl border-2 ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {isCorrect ? '✓' : '✗'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Question {idx + 1}</div>
                                                <div className="text-lg text-white font-medium prose prose-invert max-w-none math-prose">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}>{fixLatexContent(q.question).content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>

                                        {q.questionTableData && (
                                            <div className="mb-6 w-full overflow-x-auto bg-slate-50 p-2 sm:p-4 rounded-xl border border-slate-200 qcm-table-scroll">
                                                <MathTable data={q.questionTableData} />
                                            </div>
                                        )}
                                        {q.questionGraphData && (
                                            <div className="mb-6 w-full max-w-full overflow-x-auto">
                                                <MathGraph {...q.questionGraphData} />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                                <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-2">Ton Choix</div>
                                                <div className="text-slate-50 prose prose-invert math-prose">
                                                    {hasUserAnswered ? (
                                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}>{fixLatexContent(q.options[userAnswerIdx]).content}</ReactMarkdown>
                                                    ) : <span className="text-slate-500 italic">Aucune réponse</span>}
                                                </div>
                                            </div>

                                            <div className="bg-green-900/10 p-4 rounded-xl border border-green-500/20">
                                                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Bonne Réponse</div>
                                                <div className="text-emerald-200 prose prose-invert math-prose">
                                                    {q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length ? (
                                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}>{fixLatexContent(q.options[q.correctAnswerIndex]).content}</ReactMarkdown>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Réponse non disponible</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tableaux d'options en pleine largeur (hors grille) */}
                                        {(hasUserAnswered && (q.optionsTableData?.[userAnswerIdx] || q.optionsGraphData?.[userAnswerIdx])) ||
                                         (q.optionsTableData?.[q.correctAnswerIndex] || q.optionsGraphData?.[q.correctAnswerIndex]) ? (
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {hasUserAnswered && (q.optionsTableData?.[userAnswerIdx] || q.optionsGraphData?.[userAnswerIdx]) && (
                                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-2">Ton Choix — Tableau</div>
                                                        {q.optionsTableData?.[userAnswerIdx] && (
                                                            <div className="w-full overflow-x-auto bg-slate-50 p-2 rounded-xl qcm-table-scroll"><MathTable data={q.optionsTableData[userAnswerIdx]} /></div>
                                                        )}
                                                        {q.optionsGraphData?.[userAnswerIdx] && (
                                                            <div className="mt-2 w-full overflow-x-auto"><MathGraph {...q.optionsGraphData[userAnswerIdx]} /></div>
                                                        )}
                                                    </div>
                                                )}
                                                {(q.optionsTableData?.[q.correctAnswerIndex] || q.optionsGraphData?.[q.correctAnswerIndex]) && (
                                                    <div className="bg-green-900/10 p-4 rounded-xl border border-green-500/20">
                                                        <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Bonne Réponse — Tableau</div>
                                                        {q.optionsTableData?.[q.correctAnswerIndex] && (
                                                            <div className="w-full overflow-x-auto bg-slate-50 p-2 rounded-xl qcm-table-scroll"><MathTable data={q.optionsTableData[q.correctAnswerIndex]} /></div>
                                                        )}
                                                        {q.optionsGraphData?.[q.correctAnswerIndex] && (
                                                            <div className="mt-2 w-full overflow-x-auto"><MathGraph {...q.optionsGraphData[q.correctAnswerIndex]} /></div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {q.explanation && (
                                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sky-200 prose prose-invert math-prose text-sm">
                                                <span className="font-bold text-sky-300 block mb-1">Explication :</span>
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}>{fixLatexContent(q.explanation).content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isSaved && (
                        <div className="mt-12 pt-8 border-t border-slate-700/50 w-full flex justify-center">
                            <button
                                onClick={startNewSession}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                Refaire un Entraînement
                            </button>
                        </div>
                    )}
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
                                    rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
                                >
                                    {fixLatexContent(currentQuestion.question).content}
                                </ReactMarkdown>
                            </div>

                            {currentQuestion.questionTableData && (
                                <div className="mt-6 w-full max-w-full overflow-x-auto bg-slate-50 p-2 sm:p-4 rounded-xl border border-slate-200">
                                    <MathTable data={currentQuestion.questionTableData} />
                                </div>
                            )}

                            {currentQuestion.questionGraphData && (
                                <div className="mt-6 w-full max-w-full overflow-x-auto">
                                    <MathGraph {...currentQuestion.questionGraphData} />
                                </div>
                            )}

                            <div className={`mt-10 grid gap-4 ${currentQuestion.optionsTableData ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                {currentQuestion.options.map((opt, idx) => {
                                    const isSelected = answers[currentQuestion.id] === idx;
                                    const hasTable = currentQuestion.optionsTableData?.[idx];
                                    const hasGraph = currentQuestion.optionsGraphData?.[idx];

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
                                                    rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
                                                >
                                                    {fixLatexContent(opt).content}
                                                </ReactMarkdown>
                                                
                                                {hasTable && (
                                                    <div className="mt-4 w-full overflow-x-auto bg-slate-50 p-2 rounded-xl qcm-table-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
                                                        <MathTable data={hasTable} />
                                                    </div>
                                                )}
                                                
                                                {hasGraph && (
                                                    <div className="mt-4 w-full max-w-full overflow-x-auto">
                                                        <MathGraph {...hasGraph} />
                                                    </div>
                                                )}
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
        .math-prose table {
            display: block;
            width: 100%;
            overflow-x: auto;
            white-space: nowrap;
        }
        /* KaTeX hérite de la couleur du parent pour être lisible en correction */
        .math-prose .katex,
        .math-prose .katex * {
            color: inherit !important;
        }
        .qcm-table-scroll {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #475569 transparent;
        }
        .qcm-table-scroll::-webkit-scrollbar {
            height: 6px;
        }
        .qcm-table-scroll::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 3px;
        }
        .qcm-table-scroll::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 3px;
        }
        .qcm-table-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }
    `}</style>
)
