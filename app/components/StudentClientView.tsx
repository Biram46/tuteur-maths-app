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

    // Fonction d'export PDF à la volée (pour pallier les liens vides)
    const handleDownloadPDF = async () => {
        if (!courseRef.current) {
            alert("Contenu du cours non trouvé.");
            return;
        }

        setLoadingPDF(true);
        try {
            // Un petit délai pour s'assurer que les polices KaTeX sont bien rendues
            await new Promise(r => setTimeout(r, 1000));

            const canvas = await html2canvas(courseRef.current, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: "#ffffff",
                windowWidth: 1024,
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeChapter?.title || 'cours'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Erreur PDF:", err);
            alert("Erreur de génération. Solution : Ctrl+P > Enregistrer en PDF.");
        } finally {
            setLoadingPDF(false);
        }
    };

    // Fonction d'export DOCX améliorée (via HTML compatible Word)
    const handleDownloadDocx = () => {
        if (!markdownContent) return;
        setLoadingDocx(true);
        try {
            const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${activeChapter?.title || 'Cours'}</title>
                <style>
                    body { font-family: 'Times New Roman', serif; line-height: 1.5; padding: 1in; }
                    h1 { color: #2c3e50; border-bottom: 1px solid #eee; }
                    h2 { color: #34495e; margin-top: 20px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .formula { font-family: 'Courier New', monospace; color: #000; background: #f9f9f9; padding: 5px; }
                </style>
            </head>
            <body>
                <h1>${activeChapter?.title || 'Cours'} - ${activeLevel?.label || ''}</h1>
                ${markdownContent.replace(/\n\n/g, '<p>').replace(/\n/g, '<br>')}
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
        } finally {
            setLoadingDocx(false);
        }
    };

    // Logique Quiz (gardée de l'ancien page.tsx)
    const [lastScore, setLastScore] = useState<string>("non disponible");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function mapMessage(msg: RawQuizResultMessage) {
        const rawNote =
            msg.note_finale ??
            msg.noteFinale ??
            msg.note ??
            msg.score ??
            20; // Default fallback to avoid 0 if missing

        const noteNumber =
            typeof rawNote === "number" ? rawNote : Number(rawNote) || 0;

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
            console.log("[eleve] Message quiz-result reçu :", payload);

            setLastScore(`${payload.note_finale.toFixed(1)} / 20`);
            setError(null);
            setSending(true);

            fetch("/api/quiz-results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error("Erreur API");
                    console.log("[eleve] Note enregistrée");
                })
                .catch(() => setError("Erreur enregistrement"))
                .finally(() => setSending(false));
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Helper pour trouver une ressource d'un type donné
    const getResource = (kind: string) => activeResources.find((r) => r.kind === kind);
    const getResources = (kind: string) => activeResources.filter((r) => r.kind === kind);

    // Récupération agrégée des URLs (Cours)
    const coursResources = activeResources.filter(r => r.kind.toLowerCase().includes('cours'));
    const coursUrls = {
        pdf: coursResources.find(r => r.pdf_url)?.pdf_url || null,
        docx: coursResources.find(r => r.docx_url)?.docx_url || null,
        latex: coursResources.find(r => r.latex_url)?.latex_url || null,
        md: coursResources.find(r => r.html_url?.endsWith('.md'))?.html_url || null,
    };

    // Récupération agrégée des URLs (Exercices)
    const exosResources = activeResources.filter(r => r.kind.toLowerCase().includes('exer') || r.kind.toLowerCase().includes('exo'));
    const exosUrls = {
        pdf: exosResources.find(r => r.pdf_url)?.pdf_url || null,
        docx: exosResources.find(r => r.docx_url)?.docx_url || null,
        latex: exosResources.find(r => r.latex_url)?.latex_url || null,
    };

    // Charger le markdown quand le chapitre change
    useEffect(() => {
        if (coursUrls.md) {
            setLoadingMD(true);
            fetch(coursUrls.md)
                .then(res => res.text())
                .then(text => setMarkdownContent(text))
                .catch(() => setMarkdownContent("Erreur lors du chargement du cours."))
                .finally(() => setLoadingMD(false));
        } else {
            setMarkdownContent(null);
        }
    }, [selectedChapterId, resources]);

    // Ressources interactives
    const interactif = activeResources.find(r => r.kind === 'interactif' || r.html_url?.endsWith('.html'));

    return (
        <main className="layout">
            {/* Colonne gauche : Navigation */}
            <aside className="sidebar-left">
                <section className="card">
                    <h2>📚 Niveaux</h2>
                    <ul className="simple-list">
                        {levels.map((level) => (
                            <li
                                key={level.id}
                                className={selectedLevelId === level.id ? "active" : ""}
                                onClick={() => setSelectedLevelId(level.id)}
                            >
                                <span className="opacity-70">🎓</span> {level.label}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="card">
                    <h2>📖 Chapitres</h2>
                    {visibleChapters.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-slate-400 italic">Aucun chapitre disponible.</p>
                        </div>
                    ) : (
                        <ul className="simple-list">
                            {visibleChapters.map((chapter) => (
                                <li
                                    key={chapter.id}
                                    className={selectedChapterId === chapter.id ? "active" : ""}
                                    onClick={() => setSelectedChapterId(chapter.id)}
                                >
                                    <span className="opacity-70">🔹</span> {chapter.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </aside>

            {/* Colonne centrale : Contenu */}
            <section className="content-center">
                {activeChapter ? (
                    <div className="chapter-content">
                        <header>
                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{activeLevel?.label}</span>
                            <h2 className="chapter-title">{activeChapter.title}</h2>
                        </header>

                        {/* Carte Cours */}
                        <div className="card card-block">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">📝</span>
                                <h3 className="m-0">Supports de Cours</h3>
                            </div>

                            {loadingMD ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-2 text-slate-400">Chargement du cours...</p>
                                </div>
                            ) : markdownContent ? (
                                <div className="space-y-6">
                                    <div className="prose prose-invert max-w-none bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-inner">
                                        <div ref={courseRef} className="bg-white text-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 printable-area overflow-x-auto">
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

                                    {/* Barre de téléchargement des formats obligatoires */}
                                    {(coursUrls.pdf || coursUrls.docx || coursUrls.latex) && (
                                        <div className="flex flex-col gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Formats disponibles :</span>
                                            <div className="flex flex-wrap gap-3">
                                                {coursUrls.pdf && (
                                                    <button
                                                        onClick={handleDownloadPDF}
                                                        disabled={loadingPDF}
                                                        className={`btn btn-primary btn-sm gap-2 ${loadingPDF ? 'loading' : ''}`}
                                                    >
                                                        <span>📄</span> {loadingPDF ? 'Génération...' : 'PDF'}
                                                    </button>
                                                )}
                                                {coursUrls.docx && (
                                                    <button
                                                        onClick={handleDownloadDocx}
                                                        disabled={loadingDocx}
                                                        className={`btn btn-outline btn-sm gap-2 ${loadingDocx ? 'loading' : ''}`}
                                                    >
                                                        <span>📥</span> {loadingDocx ? 'Export...' : 'Word (.doc)'}
                                                    </button>
                                                )}
                                                {coursUrls.latex && (
                                                    <a href={coursUrls.latex} download className="btn btn-outline btn-sm gap-2">
                                                        <span>⚛️</span> LaTeX (.tex)
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (coursUrls.pdf || coursUrls.docx || coursUrls.latex) ? (
                                <div className="space-y-4">
                                    <p>Téléchargez ou consultez les documents officiels pour ce chapitre.</p>
                                    <div className="flex flex-wrap gap-3">
                                        {coursUrls.pdf && (
                                            <button
                                                onClick={handleDownloadPDF}
                                                disabled={loadingPDF}
                                                className={`btn btn-primary gap-2 ${loadingPDF ? 'loading' : ''}`}
                                            >
                                                <span>📄</span> {loadingPDF ? 'Génération...' : 'Générer le PDF'}
                                            </button>
                                        )}
                                        {coursUrls.docx && (
                                            <button
                                                onClick={handleDownloadDocx}
                                                disabled={loadingDocx}
                                                className={`btn btn-outline gap-2 ${loadingDocx ? 'loading' : ''}`}
                                            >
                                                <span>📥</span> {loadingDocx ? 'Export...' : 'Exporter Word'}
                                            </button>
                                        )}
                                        {coursUrls.latex && (
                                            <a href={coursUrls.latex} download className="btn btn-outline gap-2">
                                                <span>⚛️</span> Source LaTeX
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-450 italic m-0">Aucun support de cours n'a été ajouté pour ce chapitre.</p>
                                </div>
                            )}
                        </div>

                        {/* Carte Exercices Interactifs */}
                        <div className="card card-block">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">⚡</span>
                                <h3 className="m-0">Exercices Interactifs</h3>
                            </div>

                            {interactif?.html_url ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="m-0">Testez vos connaissances en temps réel avec ces exercices auto-corrigés.</p>
                                        <a
                                            href={interactif.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                                        >
                                            🚀 Ouvrir en plein écran
                                        </a>
                                    </div>

                                    <div className="interactive-wrapper">
                                        <iframe
                                            id="interactive-frame"
                                            className="interactive-frame"
                                            src={interactif.html_url}
                                            title="Exercices interactifs"
                                        ></iframe>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <span className="text-xs uppercase font-bold text-slate-500 tracking-widest block mb-1">Status de progression</span>
                                            <p className="font-semibold text-slate-700 m-0">
                                                Dernière note : <span className="text-blue-600">{lastScore}</span>
                                            </p>
                                        </div>
                                        {sending && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                                                <span className="text-xs font-bold uppercase">Synchro...</span>
                                            </div>
                                        )}
                                        {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
                                    </div>

                                    {/* Barre de téléchargement des exercices (formats statiques) */}
                                    {(exosUrls.pdf || exosUrls.docx || exosUrls.latex) && (
                                        <div className="flex flex-col gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 mt-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Fiches d'exercices à télécharger :</span>
                                            <div className="flex flex-wrap gap-3">
                                                {exosUrls.pdf && (
                                                    <button onClick={handleDownloadPDF} className="btn btn-primary btn-sm gap-2">
                                                        <span>📄</span> PDF
                                                    </button>
                                                )}
                                                {exosUrls.docx && (
                                                    <button onClick={handleDownloadDocx} className="btn btn-outline btn-sm gap-2">
                                                        <span>📥</span> Word
                                                    </button>
                                                )}
                                                {exosUrls.latex && (
                                                    <a href={exosUrls.latex} download className="btn btn-outline btn-sm gap-2">
                                                        <span>⚛️</span> LaTeX
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-450 italic m-0">
                                        {interactif
                                            ? "Le lien vers cet exercice semble incorrect. Contactez votre professeur."
                                            : "Il n'y a pas encore d'exercices disponibles pour ce chapitre."}
                                    </p>
                                    {(exosUrls.pdf || exosUrls.docx || exosUrls.latex) && (
                                        <div className="flex flex-col gap-3 mt-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Fiches d'exercices disponibles :</span>
                                            <div className="flex flex-wrap gap-3">
                                                {exosUrls.pdf && <button onClick={handleDownloadPDF} className="btn btn-primary btn-sm">Générer PDF</button>}
                                                {exosUrls.docx && <button onClick={handleDownloadDocx} className="btn btn-outline btn-sm">Exporter Word</button>}
                                                {exosUrls.latex && <a href={exosUrls.latex} download className="btn btn-outline btn-sm">LaTeX</a>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="text-6xl mb-6 opacity-20">📚</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Prêt à réviser ?</h2>
                        <p className="text-slate-500 max-w-sm">
                            {levels.length === 0
                                ? "L'application est en cours de configuration par votre professeur. Revenez bientôt !"
                                : "Sélectionnez un niveau et un chapitre dans le menu de gauche pour afficher le contenu."}
                        </p>
                    </div>
                )}
            </section>

            {/* Colonne droite : Assistant IA */}
            <aside className="sidebar-right">
                <div className="sticky top-[100px]">
                    <MathAssistant />

                    <div className="mt-4 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Technologie de tutorat IA</p>
                    </div>
                </div>
            </aside>
        </main>
    );

}
