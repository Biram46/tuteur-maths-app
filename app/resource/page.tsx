"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Link from "next/link";

function ResourceContent() {
    const searchParams = useSearchParams();
    const url = searchParams?.get("url");
    const type = searchParams?.get("type"); // 'cours', 'exercice', 'interactif'
    const title = searchParams?.get("title");
    const level = searchParams?.get("level");

    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const lowerUrl = url ? url.toLowerCase() : "";

    useEffect(() => {
        if (!url) return;

        // Skip fetch for binary/iframe formats OR download-only formats (.tex)
        if (type === 'interactif' || lowerUrl.endsWith('.html') || lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.tex')) {
            setLoading(false);
            return;
        }

        // For text-based content (Markdown)
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Impossible de charger la ressource");
                return res.text();
            })
            .then(text => setContent(text))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));

    }, [url, type, lowerUrl]);

    if (!url) return <div className="p-8 text-center text-white">URL manquante</div>;

    const isInteractive = type === 'interactif' || lowerUrl.endsWith('.html');
    const isPdf = lowerUrl.endsWith('.pdf');
    const isDocx = lowerUrl.endsWith('.docx');
    const isTex = lowerUrl.endsWith('.tex');

    // Utiliser le proxy pour le contenu interactif HTML pour forcer le bon Content-Type
    // sauf si l'URL est locale (commence par /)
    const displayUrl = isInteractive && url.startsWith('http')
        ? `/api/view-resource?url=${encodeURIComponent(url)}`
        : url;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header / Navbar */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            ← Retour au tableau de bord
                        </Link>
                        <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                        <div>
                            {level && <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">{level}</span>}
                            <h1 className="text-lg font-bold truncate max-w-md" title={title || "Ressource"}>
                                {title || "Ressource Pédagogique"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* Download Button */}
                        <a
                            href={url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600 flex items-center gap-2"
                        >
                            <span>Télécharger</span>
                            <span className="text-xs opacity-50">⬇</span>
                        </a>
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hidden sm:block"
                        >
                            Imprimer / PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center text-red-200">
                        {error}
                    </div>
                ) : isInteractive ? (
                    <div className="w-full h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <iframe
                            src={displayUrl}
                            className="w-full h-full border-0"
                            title={title || "Exercice Interactif"}
                            allowFullScreen
                        />
                    </div>
                ) : isPdf ? (
                    <div className="w-full h-[85vh] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <iframe
                            src={url}
                            className="w-full h-full border-0"
                            title={title || "Document PDF"}
                        />
                    </div>
                ) : isDocx ? (
                    <div className="w-full h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
                        <div className="bg-slate-100 py-2 px-4 text-center text-slate-600 text-sm border-b border-slate-200">
                            Si le document ne s'affiche pas, <a href={url} download className="text-blue-600 font-bold hover:underline">cliquez ici pour le télécharger</a>.
                        </div>
                        <iframe
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                            className="w-full flex-1 border-0"
                            title={title || "Document Word"}
                        />
                    </div>
                ) : isTex ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center backdrop-blur-sm">
                        <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl mb-6 shadow-xl text-slate-300">
                            ∑
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Fichier Source LaTeX</h2>
                        <p className="text-slate-400 mb-8 max-w-sm text-sm">
                            Ce fichier contient le code source mathématique (.tex). Téléchargez-le pour l'ouvrir dans votre éditeur LaTeX habituel.
                        </p>
                        <a
                            href={url}
                            download
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 flex items-center gap-2 group"
                        >
                            <span>Télécharger le .tex</span>
                            <span className="group-hover:translate-y-0.5 transition-transform">⬇</span>
                        </a>
                    </div>
                ) : (
                    <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 prose prose-slate max-w-none print:shadow-none print:p-0">
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
                            {content || ""}
                        </ReactMarkdown>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ResourceViewer() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Chargement...</div>}>
            <ResourceContent />
        </Suspense>
    );
}
