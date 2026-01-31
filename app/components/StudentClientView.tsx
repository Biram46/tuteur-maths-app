"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import MathAssistant from "./MathAssistant";
import { Level, Chapter, Resource } from "@/lib/data";
import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Props = {
    levels: Level[];
    chapters: Chapter[];
    resources: Resource[];
};

type RawQuizResultMessage = {
    type: string;
    [key: string]: any;
};

export default function StudentClientView({ levels, chapters, resources }: Props) {
    // États pour la navigation
    const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
        levels.length > 0 ? levels[0].id : null
    );
    // On sélectionne le premier chapitre du niveau actif par défaut
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // Mettre à jour le chapitre sélectionné quand on change de niveau
    useEffect(() => {
        if (selectedLevelId) {
            const firstChapter = chapters.find(
                (c) => c.level_id === selectedLevelId && c.published
            );
            setSelectedChapterId(firstChapter ? firstChapter.id : null);
        }
    }, [selectedLevelId, chapters]);

    // État pour le contenu du cours Markdown
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const [loadingMD, setLoadingMD] = useState(false);

    const activeLevel = levels.find((l) => l.id === selectedLevelId);
    const activeChapter = chapters.find((c) => c.id === selectedChapterId);

    // Filtrer les chapitres du niveau actif
    const visibleChapters = chapters.filter(
        (c) => c.level_id === selectedLevelId && c.published
    );

    // Filtrer les ressources du chapitre actif
    const activeResources = resources.filter(
        (r) => r.chapter_id === selectedChapterId
    );

    const [loadingPDF, setLoadingPDF] = useState(false);
    const [loadingDocx, setLoadingDocx] = useState(false);

    // Ref pour l'export PDF
    const courseRef = useRef<HTMLDivElement>(null);

    // Fonction d'impression (Moteur natif - 100% fiable pour PDF)
    const handlePrint = () => {
        window.print();
    };

    // Fonction d'export PDF à la volée (Méthode 2 de secours)
    const handleDownloadPDF = async () => {
        if (!courseRef.current) {
            alert("Contenu du cours non trouvé.");
            return;
        }

        setLoadingPDF(true);
        try {
            const canvas = await html2canvas(courseRef.current, {
                scale: 1,
                useCORS: true,
                backgroundColor: "#ffffff",
                windowWidth: 1024,
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`${activeChapter?.title || 'cours'}.pdf`);
        } catch (err) {
            console.error("Erreur PDF Rapide:", err);
            alert("Veuillez utiliser le bouton '🖨️ PDF (Imprimer / Pro)' pour un résultat parfait.");
        } finally {
            setLoadingPDF(false);
        }
    };

    // Fonction d'export DOCX (Améliorée avec rendu HTML)
    const handleDownloadDocx = () => {
        if (!courseRef.current) return;
        setLoadingDocx(true);
        try {
            // On capture le HTML déjà rendu par le navigateur (inclut les structures mathématiques)
            const renderedHtml = courseRef.current.innerHTML;

            const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${activeChapter?.title || 'Cours'}</title>
                <style>
                    body { font-family: Calibri, 'Segoe UI', serif; line-height: 1.5; padding: 20px; }
                    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8fafc; font-bold; }
                    .katex { font-family: serif; font-size: 1.25em; }
                    .katex-display { margin: 1em 0; text-align: center; }
                    img { max-width: 100%; }
                </style>
            </head>
            <body>
                <h4 style="color: #64748b; text-transform: uppercase;">${activeLevel?.label || ''}</h4>
                <h1>${activeChapter?.title || 'Cours'}</h1>
                <hr>
                ${renderedHtml}
                <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; font-size: 0.8em; color: #94a3b8;">
                    Document généré automatiquement par l'Assistant Maths. 
                    Pour une mise en page mathématique parfaite, téléchargez au format PDF.
                </div>
            </body>
            </html>`;

            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeChapter?.title || 'cours'}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Erreur Word:", err);
            alert("Erreur d'export Word.");
        } finally {
            setLoadingDocx(false);
        }
    };

    // Logique Quiz
    const [lastScore, setLastScore] = useState<string>("non disponible");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function mapMessage(msg: RawQuizResultMessage) {
        const rawNote = msg.note_finale ?? msg.noteFinale ?? msg.note ?? msg.score ?? 20;
        const noteNumber = typeof rawNote === "number" ? rawNote : Number(rawNote) || 0;
        return {
            quiz_id: msg.quiz_id || msg.quizId || "quiz-inconnu",
            niveau: msg.niveau || msg.level || "NIVEAU_INCONNU",
            chapitre: msg.chapitre || msg.chapter || "CHAPITRE_INCONNU",
            note_finale: noteNumber,
            details: msg.details || msg.answers || null,
        };
    }

    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            const data = event.data as RawQuizResultMessage;
            if (!data || data.type !== "quiz-result") return;
            const payload = mapMessage(data);
            setLastScore(`${payload.note_finale.toFixed(1)} / 20`);
            setError(null);
            setSending(true);
            fetch("/api/quiz-results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
                .then(res => { if (!res.ok) throw new Error(); })
                .catch(() => setError("Erreur synchro"))
                .finally(() => setSending(false));
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Charger le markdown quand le chapitre change
    useEffect(() => {
        if (coursUrls.md) {
            setLoadingMD(true);
            fetch(coursUrls.md)
                .then(res => res.text())
                .then(text => setMarkdownContent(text))
                .catch(() => setMarkdownContent("Erreur de chargement."))
                .finally(() => setLoadingMD(false));
        } else {
            setMarkdownContent(null);
        }
    }, [selectedChapterId, resources]);

    // Helpers
    const activeResources = resources.filter(r => r.chapter_id === selectedChapterId);
    const coursResources = activeResources.filter(r => r.kind.toLowerCase().includes('cours'));
    const coursUrls = {
        pdf: coursResources.find(r => r.pdf_url)?.pdf_url || "placeholder", // On force le flag car on génère à la volée
        docx: coursResources.find(r => r.docx_url)?.docx_url || "placeholder",
        latex: coursResources.find(r => r.latex_url)?.latex_url || null,
        md: coursResources.find(r => r.html_url?.endsWith('.md'))?.html_url || null,
    };
    const exosResources = activeResources.filter(r => r.kind.toLowerCase().includes('exer') || r.kind.toLowerCase().includes('exo'));
    const exosUrls = {
        pdf: exosResources.find(r => r.pdf_url)?.pdf_url || "placeholder",
        docx: exosResources.find(r => r.docx_url)?.docx_url || "placeholder",
        latex: exosResources.find(r => r.latex_url)?.latex_url || null,
    };
    const interactif = activeResources.find(r => r.kind === 'interactif' || r.html_url?.endsWith('.html'));

    return (
        <main className="layout">
            <aside className="sidebar-left">
                <section className="card">
                    <h2>📚 Niveaux</h2>
                    <ul className="simple-list">
                        {levels.map((level) => (
                            <li key={level.id} className={selectedLevelId === level.id ? "active" : ""} onClick={() => setSelectedLevelId(level.id)}>
                                🎓 {level.label}
                            </li>
                        ))}
                    </ul>
                </section>
                <section className="card">
                    <h2>📖 Chapitres</h2>
                    <ul className="simple-list">
                        {visibleChapters.map((chapter) => (
                            <li key={chapter.id} className={selectedChapterId === chapter.id ? "active" : ""} onClick={() => setSelectedChapterId(chapter.id)}>
                                🔹 {chapter.title}
                            </li>
                        ))}
                    </ul>
                </section>
            </aside>

            <section className="content-center">
                {activeChapter ? (
                    <div className="chapter-content">
                        <header>
                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{activeLevel?.label}</span>
                            <h2 className="chapter-title">{activeChapter.title}</h2>
                        </header>

                        <div className="card card-block">
                            <div className="flex items-center gap-2 mb-4 no-print">
                                <span className="text-2xl">📝</span>
                                <h3 className="m-0">Cours du jour</h3>
                            </div>

                            {loadingMD ? (
                                <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
                            ) : markdownContent ? (
                                <div className="space-y-6">
                                    <div className="prose prose-invert max-w-none bg-slate-900/50 p-1 sm:p-6 rounded-2xl border border-slate-800 shadow-inner">
                                        <div ref={courseRef} id="printable-area" className="bg-white text-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 printable-area overflow-x-auto">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath, remarkGfm]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    table: ({ node, ...props }) => (
                                                        <div className="my-6 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                            <table className="min-w-full divide-y divide-slate-200" {...props} />
                                                        </div>
                                                    ),
                                                    th: ({ node, ...props }) => <th className="px-4 py-2 bg-slate-50 font-bold text-left border-b" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-4 py-2 border-b" {...props} />,
                                                }}
                                            >
                                                {markdownContent}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 no-print">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Documents & Exports :</span>
                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={handlePrint} className="btn btn-primary gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform">
                                                <span>🖨️</span> PDF (Imprimer / Pro)
                                            </button>
                                            <button onClick={handleDownloadPDF} disabled={loadingPDF} className="btn btn-outline gap-2">
                                                <span>📄</span> {loadingPDF ? 'Génération...' : 'PDF Direct'}
                                            </button>
                                            <button onClick={handleDownloadDocx} disabled={loadingDocx} className="btn btn-outline gap-2">
                                                <span>📥</span> {loadingDocx ? 'Export...' : 'Exporter Word'}
                                            </button>
                                            {coursUrls.latex && (
                                                <a href={coursUrls.latex} download className="btn btn-outline gap-2"><span>⚛️</span> LaTeX</a>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic m-0">* PDF Pro est recommandé pour conserver les traits verticaux des tableaux et les formules mathématiques.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                    <p className="text-slate-450 italic m-0">Support non disponible pour ce chapitre.</p>
                                </div>
                            )}
                        </div>

                        <div className="card card-block no-print">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">⚡</span>
                                <h3 className="m-0">Exercices Interactifs</h3>
                            </div>

                            {interactif?.html_url ? (
                                <div className="space-y-4">
                                    <div className="interactive-wrapper">
                                        <iframe id="interactive-frame" className="interactive-frame" src={interactif.html_url} title="Exercices"></iframe>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="font-semibold text-slate-700 m-0">Dernier score : <span className="text-blue-600">{lastScore}</span></p>
                                        {sending && <span className="text-xs font-bold text-blue-600 animate-pulse">SYNCHRO...</span>}
                                    </div>
                                    <div className="flex flex-col gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 mt-4">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Fiches d'exercices statiques :</span>
                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={handlePrint} className="btn btn-primary btn-sm gap-2"><span>🖨️</span> PDF Pro</button>
                                            <button onClick={handleDownloadDocx} className="btn btn-outline btn-sm gap-2"><span>📥</span> Word</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                    <p className="text-slate-450 italic m-0">Pas d'exercices disponibles.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="text-6xl mb-6 opacity-20">📚</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Prêt à réviser ?</h2>
                        <p className="text-slate-500">Sélectionnez un chapitre à gauche.</p>
                    </div>
                )}
            </section>

            <aside className="sidebar-right no-print">
                <div className="sticky top-[100px]">
                    <MathAssistant />
                    <div className="mt-4 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Assistant IA de Mathématiques</p>
                    </div>
                </div>
            </aside>
        </main>
    );
}
