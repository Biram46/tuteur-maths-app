'use client';

import { useState, useRef, useCallback } from 'react';

const PREAMBLE = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{amsmath,amssymb,amsthm,mathtools}
\\usepackage{geometry}
\\usepackage[most]{tcolorbox}
\\usepackage{array,booktabs,multirow}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\geometry{margin=2cm}

\\begin{document}
`;

async function pdfToImages(file: File): Promise<{ base64: string; mimeType: string }[]> {
    const pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsModule.getDocument({ data: arrayBuffer }).promise;
    const images: { base64: string; mimeType: string }[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 8); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        images.push({
            base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1],
            mimeType: 'image/jpeg',
        });
    }
    return images;
}

async function imageFileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

type Phase = 'idle' | 'preparing' | 'processing' | 'done' | 'error';

interface Status {
    phase: Phase;
    currentPage: number;
    totalPages: number;
    pass: 1 | 2;
    message: string;
}

export default function PdfToLatex() {
    const [status, setStatus] = useState<Status>({ phase: 'idle', currentPage: 0, totalPages: 0, pass: 1, message: '' });
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    const reset = useCallback(() => {
        abortRef.current = true;
        setStatus({ phase: 'idle', currentPage: 0, totalPages: 0, pass: 1, message: '' });
        setResult(null);
        setError(null);
        setCopied(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => { abortRef.current = false; }, 100);
    }, []);

    const handleFile = useCallback(async (file: File) => {
        abortRef.current = false;
        setError(null);
        setResult(null);

        try {
            // Étape 1 — conversion PDF → images
            setStatus({ phase: 'preparing', currentPage: 0, totalPages: 0, pass: 1, message: 'Conversion du PDF en images…' });
            const isPdf = file.type === 'application/pdf';
            const images = isPdf ? await pdfToImages(file) : [await imageFileToBase64(file)];

            const pageLatex: string[] = [];

            // Étape 2 — traitement page par page (1 requête API par page)
            for (let i = 0; i < images.length; i++) {
                if (abortRef.current) return;

                setStatus({
                    phase: 'processing',
                    currentPage: i + 1,
                    totalPages: images.length,
                    pass: 1,
                    message: `Page ${i + 1}/${images.length} — passe 1 (extraction)…`,
                });

                const response = await fetch('/api/pdf-to-latex', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: images[i] }),
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({ error: `Erreur ${response.status}` }));
                    throw new Error(err.error || `Erreur ${response.status}`);
                }

                // Mise à jour pendant le traitement côté serveur
                setStatus(s => ({ ...s, pass: 2, message: `Page ${i + 1}/${images.length} — passe 2 (vérification)…` }));

                const data = await response.json();
                pageLatex.push(data.latex);
            }

            if (abortRef.current) return;

            const body = pageLatex.join('\n\n\\newpage\n\n');
            const latex = `${PREAMBLE}\n${body}\n\n\\end{document}`;
            setResult(latex);
            setStatus({ phase: 'done', currentPage: images.length, totalPages: images.length, pass: 2, message: '' });
        } catch (e: any) {
            if (abortRef.current) return;
            setError(e.message);
            setStatus(s => ({ ...s, phase: 'error' }));
        }
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [result]);

    const handleDownload = useCallback(() => {
        if (!result) return;
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cours.tex';
        a.click();
        URL.revokeObjectURL(url);
    }, [result]);

    const isProcessing = status.phase === 'preparing' || status.phase === 'processing';
    const progress = status.totalPages > 0 ? ((status.currentPage - 1) / status.totalPages) * 100 : 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-white">Convertisseur PDF → LaTeX</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    2 passes par page : extraction fidèle puis vérification. Maximum 8 pages.
                </p>
            </div>

            {/* Drop zone */}
            {status.phase === 'idle' && (
                <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-14 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
                >
                    <div className="text-4xl opacity-40 group-hover:opacity-70 transition-opacity">📄</div>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        Glissez un <strong>PDF</strong> ou une <strong>image</strong> ici
                    </p>
                    <p className="text-xs text-slate-600">PDF, PNG, JPG, WEBP · max 8 pages</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={handleInputChange}
                        className="hidden"
                    />
                </div>
            )}

            {/* Progress */}
            {isProcessing && (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5">
                    <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-sm text-slate-300 font-medium text-center">{status.message}</p>

                    {status.totalPages > 0 && (
                        <div className="w-full max-w-xs space-y-1.5">
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-slate-600">
                                Page {status.currentPage}/{status.totalPages}
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-slate-600">~20–30 secondes par page</p>
                    <button
                        onClick={reset}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline"
                    >
                        Annuler
                    </button>
                </div>
            )}

            {/* Error */}
            {status.phase === 'error' && error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-red-400 mt-0.5">⚠</span>
                    <div className="flex-1">
                        <p className="text-sm text-red-300">{error}</p>
                        <button onClick={reset} className="mt-2 text-xs text-slate-400 hover:text-white transition-colors underline">
                            Réessayer
                        </button>
                    </div>
                </div>
            )}

            {/* Result */}
            {status.phase === 'done' && result && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-green-400 font-medium flex items-center gap-1.5">
                            <span>✓</span>
                            {status.totalPages} page{status.totalPages > 1 ? 's' : ''} converties
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={reset}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                Nouveau fichier
                            </button>
                            <button
                                onClick={handleCopy}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
                            >
                                {copied ? '✓ Copié' : 'Copier'}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                            >
                                ↓ Télécharger .tex
                            </button>
                        </div>
                    </div>
                    <pre className="bg-slate-950 border border-white/10 rounded-xl p-4 text-xs text-slate-300 font-mono overflow-auto max-h-[60vh] leading-relaxed whitespace-pre-wrap">
                        {result}
                    </pre>
                </div>
            )}
        </div>
    );
}
