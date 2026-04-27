'use client';

import { useState, useRef, useCallback } from 'react';
import { pdfToImages, imageFileToBase64 } from '@/lib/pdf-utils';
import {
    createCorrectionSession,
    createCopyRow,
    updateCopyOcr,
    updateCopyAnalysis,
    updateCopyError,
    validateCopy,
    deleteCorrectionSession,
    getCorrectionSessions,
    getSessionWithCopies,
} from '../correction-actions';
import type {
    BaremeItem,
    CopyFile,
    CopyCorrection,
    CopyAnalysis,
    OcrResult,
    CorrectionSession,
} from '@/lib/correction-types';

type Step = 'sessions' | 'setup' | 'upload' | 'processing' | 'review';

const PROVIDER_LABELS: Record<string, string> = {
    claude: 'Claude',
    gpt4o: 'GPT-4o',
    gemini: 'Gemini',
};

function ConfidenceBadge({ value }: { value: number | null }) {
    if (value === null) return null;
    const pct = Math.round(value * 100);
    const color = pct >= 70 ? 'text-emerald-400' : pct >= 45 ? 'text-amber-400' : 'text-red-400';
    return <span className={`text-xs font-mono ${color}`}>{pct}%</span>;
}

export default function CopyCorrector({ teacherId }: { teacherId: string }) {
    const [step, setStep] = useState<Step>('sessions');

    // ── Sessions list ──────────────────────────────────────────────
    const [sessions, setSessions] = useState<CorrectionSession[]>([]);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);

    const loadSessions = useCallback(async () => {
        const data = await getCorrectionSessions(teacherId);
        setSessions(data);
        setSessionsLoaded(true);
    }, [teacherId]);

    // ── Step 1 : setup ────────────────────────────────────────────
    const [sessionTitle, setSessionTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [classLabel, setClassLabel] = useState('');
    const [bareme, setBareme] = useState<BaremeItem[]>([
        { id: 'q1', label: 'Question 1', max_points: 4 },
        { id: 'q2', label: 'Question 2', max_points: 4 },
        { id: 'q3', label: 'Question 3', max_points: 6 },
        { id: 'q4', label: 'Question 4', max_points: 6 },
    ]);
    const [totalPoints, setTotalPoints] = useState(20);
    const [extracting, setExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);
    const subjectFileRef = useRef<HTMLInputElement>(null);

    const baremeSum = bareme.reduce((s, b) => s + (Number(b.max_points) || 0), 0);

    const handleSubjectImport = useCallback(async (file: File) => {
        setExtracting(true);
        setExtractError(null);
        try {
            let body: { text?: string; images?: { base64: string; mimeType: string }[] };

            if (file.name.endsWith('.tex') || file.type === 'text/plain') {
                const text = await file.text();
                body = { text };
            } else if (file.type === 'application/pdf') {
                const images = await pdfToImages(file);
                body = { images };
            } else {
                throw new Error('Format non supporté. Utilisez un fichier .tex ou .pdf');
            }

            const res = await fetch('/api/prof/extract-bareme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

            setBareme(data.items);
            if (!sessionTitle) {
                setSessionTitle(file.name.replace(/\.[^.]+$/, ''));
            }
        } catch (err: unknown) {
            setExtractError(err instanceof Error ? err.message : 'Erreur lors de l\'extraction');
        } finally {
            setExtracting(false);
            if (subjectFileRef.current) subjectFileRef.current.value = '';
        }
    }, [sessionTitle]);

    const addBaremeItem = () => {
        const n = bareme.length + 1;
        setBareme(prev => [...prev, { id: `q${n}`, label: `Question ${n}`, max_points: 1 }]);
    };

    const updateBaremeItem = (idx: number, field: keyof BaremeItem, value: string | number) => {
        setBareme(prev => prev.map((item, i) =>
            i === idx ? { ...item, [field]: field === 'max_points' ? Number(value) : value } : item
        ));
    };

    const removeBaremeItem = (idx: number) => setBareme(prev => prev.filter((_, i) => i !== idx));

    // ── Step 2 : upload ───────────────────────────────────────────
    const [copyFiles, setCopyFiles] = useState<CopyFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileDrop = useCallback((files: FileList | File[]) => {
        const newCopies: CopyFile[] = [];
        for (const file of Array.from(files)) {
            if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
            newCopies.push({
                localId: crypto.randomUUID(),
                file,
                student_label: file.name.replace(/\.[^.]+$/, ''),
                pages: [],
                status: 'pending',
                dbId: null,
            });
        }
        setCopyFiles(prev => [...prev, ...newCopies]);
    }, []);

    // ── Step 3 : processing ───────────────────────────────────────
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [processingMsg, setProcessingMsg] = useState('');
    const [progressPct, setProgressPct] = useState(0);
    const abortRef = useRef(false);

    const startProcessing = useCallback(async () => {
        if (copyFiles.length === 0) return;
        abortRef.current = false;

        const { id: sessionId } = await createCorrectionSession(teacherId, {
            title: sessionTitle.trim() || 'Correction sans titre',
            subject: subject.trim() || undefined,
            class_label: classLabel.trim() || undefined,
            bareme,
            total_points: totalPoints,
        });
        setCurrentSessionId(sessionId);
        setStep('processing');

        const totalCopies = copyFiles.length;

        for (let ci = 0; ci < totalCopies; ci++) {
            if (abortRef.current) break;
            const copyFile = copyFiles[ci];

            setProcessingMsg(`Copie ${ci + 1}/${totalCopies} — extraction des pages…`);
            setProgressPct(Math.round((ci / totalCopies) * 100));

            let pages: { base64: string; mimeType: string }[];
            try {
                pages = copyFile.file.type === 'application/pdf'
                    ? await pdfToImages(copyFile.file)
                    : [await imageFileToBase64(copyFile.file)];
            } catch (err: unknown) {
                console.error('Extraction pages échouée:', err);
                continue;
            }

            const { id: copyDbId } = await createCopyRow(
                sessionId,
                copyFile.student_label || null,
                pages.length
            );

            const pageTranscriptions: string[] = [];
            let minConfidence = 1.0;
            let usedProvider = 'claude';

            for (let pi = 0; pi < pages.length; pi++) {
                if (abortRef.current) break;
                const pagePct = Math.round(((ci + (pi + 1) / pages.length) / totalCopies) * 100);
                setProgressPct(pagePct);
                setProcessingMsg(`Copie ${ci + 1}/${totalCopies}, page ${pi + 1}/${pages.length} — OCR…`);

                try {
                    const res = await fetch('/api/prof/ocr-copy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64: pages[pi].base64, mimeType: pages[pi].mimeType }),
                    });
                    const data: OcrResult & { error?: string } = await res.json();
                    if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
                    pageTranscriptions.push(data.transcription);
                    minConfidence = Math.min(minConfidence, data.confidence);
                    usedProvider = data.provider;
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    pageTranscriptions.push(`[Page ${pi + 1} — erreur OCR: ${msg}]`);
                    minConfidence = Math.min(minConfidence, 0.1);
                }
            }

            if (abortRef.current) break;

            const merged = pageTranscriptions.join('\n\n--- Page suivante ---\n\n');
            await updateCopyOcr(copyDbId, {
                transcription: merged,
                ocr_provider: usedProvider,
                ocr_confidence: minConfidence,
            });

            setProcessingMsg(`Copie ${ci + 1}/${totalCopies} — analyse par Claude…`);

            try {
                const res = await fetch('/api/prof/analyze-copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transcription: merged, bareme, total_points: totalPoints }),
                });
                const data: { analysis: CopyAnalysis; error?: string } = await res.json();
                if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
                await updateCopyAnalysis(copyDbId, data.analysis);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                await updateCopyError(copyDbId, msg);
            }
        }

        setProgressPct(100);
        setProcessingMsg('Traitement terminé.');
        // Navigate to review after short delay
        setTimeout(() => {
            setStep('review');
            loadReviewData(sessionId);
        }, 800);
    }, [copyFiles, teacherId, sessionTitle, subject, classLabel, bareme, totalPoints]);

    // ── Step 4 : review ───────────────────────────────────────────
    const [reviewSession, setReviewSession] = useState<CorrectionSession | null>(null);
    const [copies, setCopies] = useState<CopyCorrection[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editedItems, setEditedItems] = useState<Record<string, CopyAnalysis['items']>>({});
    const [validating, setValidating] = useState<string | null>(null);

    const loadReviewData = useCallback(async (sessionId: string) => {
        try {
            const result = await getSessionWithCopies(sessionId);
            setReviewSession(result.session);
            setCopies(result.copies);
        } catch (e) {
            console.error('Erreur chargement révision:', e);
        }
    }, []);

    const getEditedNote = (copyId: string, originalAnalysis: CopyAnalysis | null) => {
        const items = editedItems[copyId] ?? originalAnalysis?.items ?? [];
        return parseFloat(items.reduce((s, i) => s + (Number(i.awarded) || 0), 0).toFixed(2));
    };

    const handleValidate = async (copy: CopyCorrection) => {
        setValidating(copy.id);
        try {
            const items = editedItems[copy.id] ?? copy.analysis?.items;
            const note = getEditedNote(copy.id, copy.analysis);
            await validateCopy(copy.id, note, items);
            setCopies(prev => prev.map(c =>
                c.id === copy.id ? { ...c, validated: true, final_note: note, status: 'validated' } : c
            ));
        } finally {
            setValidating(null);
        }
    };

    const exportCsv = () => {
        const headers = ['Élève', 'Note /20', ...bareme.map(b => b.id)].join(',');
        const rows = copies
            .filter(c => c.status === 'ready' || c.status === 'validated')
            .map(c => {
                const note = c.final_note ?? '';
                const itemCols = bareme.map(b => {
                    const item = (editedItems[c.id] ?? c.analysis?.items ?? []).find(i => i.id === b.id);
                    return item != null ? item.awarded : '';
                });
                return [c.student_label ?? 'Anonyme', note, ...itemCols].join(',');
            });
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `corrections_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetToNew = () => {
        setStep('setup');
        setCopyFiles([]);
        setSessionTitle('');
        setSubject('');
        setClassLabel('');
        setCurrentSessionId(null);
        setReviewSession(null);
        setCopies([]);
        setEditedItems({});
        setExpandedId(null);
    };

    // ── Sessions list view ────────────────────────────────────────
    if (step === 'sessions') {
        if (!sessionsLoaded) loadSessions();
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Corrections de copies</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pré-correction automatique par OCR + Claude
                        </p>
                    </div>
                    <button
                        onClick={() => setStep('setup')}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        + Nouvelle session
                    </button>
                </div>

                {!sessionsLoaded ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4 opacity-20">📝</div>
                        <p className="text-slate-500 text-sm">Aucune session de correction</p>
                        <p className="text-slate-600 text-xs mt-1">Créez votre première session pour commencer</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessions.map(s => (
                            <div key={s.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{s.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {s.class_label && <span className="mr-2">{s.class_label}</span>}
                                        {new Date(s.created_at).toLocaleDateString('fr-FR')}
                                        {' · '}{(s.bareme as BaremeItem[]).length} items · /{s.total_points} pts
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={async () => {
                                            setCurrentSessionId(s.id);
                                            setBareme(s.bareme as BaremeItem[]);
                                            setTotalPoints(s.total_points);
                                            await loadReviewData(s.id);
                                            setStep('review');
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
                                    >
                                        Ouvrir
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Supprimer cette session et toutes les données associées ?')) return;
                                            await deleteCorrectionSession(s.id, teacherId);
                                            setSessions(prev => prev.filter(x => x.id !== s.id));
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
                                    >
                                        Suppr.
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Step 1: Setup ─────────────────────────────────────────────
    if (step === 'setup') {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep('sessions')} className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                        ← Retour
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white">Nouvelle session</h2>
                        <p className="text-xs text-slate-500">Définissez le barème avant d'uploader les copies</p>
                    </div>
                </div>

                {/* Infos session */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Titre *</label>
                        <input
                            value={sessionTitle}
                            onChange={e => setSessionTitle(e.target.value)}
                            placeholder="DS Chapitre 5 — Suites"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 outline-none focus:border-emerald-500/40 transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Classe</label>
                        <input
                            value={classLabel}
                            onChange={e => setClassLabel(e.target.value)}
                            placeholder="Terminale Spe A"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 outline-none focus:border-emerald-500/40 transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Barème total (pts)</label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={totalPoints}
                            onChange={e => setTotalPoints(Number(e.target.value))}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/40 transition-colors"
                        />
                    </div>
                </div>

                {/* Import sujet */}
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <p className="text-xs font-semibold text-slate-300">Importer le sujet pour extraire les questions</p>
                            <p className="text-xs text-slate-600 mt-0.5">Fichier .tex ou .pdf — les questions sont détectées automatiquement</p>
                        </div>
                        <button
                            type="button"
                            disabled={extracting}
                            onClick={() => subjectFileRef.current?.click()}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 text-indigo-300 transition-colors border border-indigo-500/20 flex items-center gap-2 shrink-0"
                        >
                            {extracting ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                    Extraction…
                                </>
                            ) : (
                                '📄 Importer le sujet'
                            )}
                        </button>
                        <input
                            ref={subjectFileRef}
                            type="file"
                            accept=".tex,.pdf,text/plain,application/pdf"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleSubjectImport(file);
                            }}
                        />
                    </div>
                    {extractError && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                            {extractError}
                        </p>
                    )}
                </div>

                {/* Barème */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Barème</h3>
                        {Math.abs(baremeSum - totalPoints) > 0.01 && (
                            <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                                Somme items : {baremeSum} pts ≠ {totalPoints} pts total
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {bareme.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input
                                    value={item.id}
                                    onChange={e => updateBaremeItem(idx, 'id', e.target.value)}
                                    placeholder="q1"
                                    className="w-16 bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-emerald-500/40 transition-colors"
                                />
                                <input
                                    value={item.label}
                                    onChange={e => updateBaremeItem(idx, 'label', e.target.value)}
                                    placeholder="Question 1"
                                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/40 transition-colors"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    value={item.max_points}
                                    onChange={e => updateBaremeItem(idx, 'max_points', e.target.value)}
                                    className="w-20 bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 text-right outline-none focus:border-emerald-500/40 transition-colors"
                                />
                                <span className="text-xs text-slate-600">pts</span>
                                <button
                                    onClick={() => removeBaremeItem(idx)}
                                    className="text-slate-600 hover:text-red-400 transition-colors text-sm w-5 text-center"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addBaremeItem}
                        className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                        + Ajouter un item
                    </button>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => setStep('upload')}
                        disabled={bareme.length === 0}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                    >
                        Suivant : déposer les copies →
                    </button>
                </div>
            </div>
        );
    }

    // ── Step 2: Upload ────────────────────────────────────────────
    if (step === 'upload') {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep('setup')} className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                        ← Barème
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white">Déposer les copies</h2>
                        <p className="text-xs text-slate-500">
                            PDF ou images (JPEG, PNG, WEBP) · max 8 pages par copie
                        </p>
                    </div>
                </div>

                {/* Drop zone */}
                <div
                    onDrop={e => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
                >
                    <div className="text-4xl opacity-40 group-hover:opacity-70 transition-opacity">📋</div>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        Glissez les copies ici ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-slate-600">Plusieurs fichiers acceptés</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        multiple
                        onChange={e => e.target.files && handleFileDrop(e.target.files)}
                        className="hidden"
                    />
                </div>

                {/* File list */}
                {copyFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium">{copyFiles.length} copie{copyFiles.length > 1 ? 's' : ''}</p>
                        {copyFiles.map((cf, idx) => (
                            <div key={cf.localId} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-slate-600 text-xs w-6 text-center">{idx + 1}</span>
                                <input
                                    value={cf.student_label}
                                    onChange={e => setCopyFiles(prev => prev.map(c =>
                                        c.localId === cf.localId ? { ...c, student_label: e.target.value } : c
                                    ))}
                                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none border-b border-transparent focus:border-white/20 transition-colors"
                                    placeholder="Nom de l'élève"
                                />
                                <span className="text-xs text-slate-600">{cf.file.name}</span>
                                <button
                                    onClick={() => setCopyFiles(prev => prev.filter(c => c.localId !== cf.localId))}
                                    className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={startProcessing}
                        disabled={copyFiles.length === 0}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                        <span>🚀</span>
                        Lancer la correction ({copyFiles.length} copie{copyFiles.length > 1 ? 's' : ''})
                    </button>
                </div>
            </div>
        );
    }

    // ── Step 3: Processing ────────────────────────────────────────
    if (step === 'processing') {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-white">Traitement en cours…</h2>
                    <p className="text-xs text-slate-500 mt-0.5">OCR puis analyse par Claude</p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                    <p className="text-sm text-slate-300 font-medium text-center">{processingMsg}</p>

                    <div className="w-full max-w-sm space-y-2">
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <p className="text-xs text-center text-slate-600">{progressPct}%</p>
                    </div>

                    <button
                        onClick={() => { abortRef.current = true; setStep('upload'); }}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        );
    }

    // ── Step 4: Review ────────────────────────────────────────────
    const validatedCount = copies.filter(c => c.validated).length;
    const readyCount = copies.filter(c => c.status === 'ready' || c.status === 'validated').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setStep('sessions'); loadSessions(); }} className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                            ← Sessions
                        </button>
                        <h2 className="text-lg font-bold text-white">
                            {reviewSession?.title ?? 'Révision des corrections'}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 ml-14">
                        {validatedCount}/{copies.length} validées · /{totalPoints} pts
                        {reviewSession?.class_label && ` · ${reviewSession.class_label}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetToNew}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-400 transition-colors border border-white/10"
                    >
                        + Nouvelle session
                    </button>
                    {readyCount > 0 && (
                        <button
                            onClick={exportCsv}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors border border-emerald-500/20"
                        >
                            ↓ Exporter CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Copies table */}
            {copies.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 text-sm mt-3">Chargement…</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {copies.map(copy => {
                        const isExpanded = expandedId === copy.id;
                        const items = editedItems[copy.id] ?? copy.analysis?.items ?? [];
                        const currentNote = getEditedNote(copy.id, copy.analysis);
                        const isError = copy.status === 'error';
                        const isValidated = copy.validated;

                        return (
                            <div key={copy.id} className={`border rounded-xl overflow-hidden transition-colors ${
                                isValidated ? 'bg-emerald-500/5 border-emerald-500/20' :
                                isError ? 'bg-red-500/5 border-red-500/20' :
                                'bg-white/[0.02] border-white/5'
                            }`}>
                                {/* Row header */}
                                <div
                                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : copy.id)}
                                >
                                    <span className="text-sm text-slate-200 font-medium min-w-0 flex-1 truncate">
                                        {copy.student_label ?? 'Anonyme'}
                                    </span>

                                    {isError ? (
                                        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20 shrink-0">
                                            Erreur OCR
                                        </span>
                                    ) : copy.analysis ? (
                                        <span className="text-sm font-bold text-white shrink-0">
                                            {currentNote}<span className="text-slate-500 font-normal text-xs">/{totalPoints}</span>
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-600 shrink-0">En cours…</span>
                                    )}

                                    <div className="flex items-center gap-2 shrink-0">
                                        {copy.ocr_provider && (
                                            <span className="text-xs text-slate-600">
                                                {PROVIDER_LABELS[copy.ocr_provider] ?? copy.ocr_provider}
                                            </span>
                                        )}
                                        <ConfidenceBadge value={copy.ocr_confidence} />
                                        {isValidated && <span className="text-emerald-400 text-xs">✓</span>}
                                        <span className={`text-slate-500 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                                    </div>
                                </div>

                                {/* Expanded accordion */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 px-4 py-4 space-y-4">
                                        {isError ? (
                                            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3">
                                                {copy.error_message ?? 'Erreur inconnue'}
                                            </div>
                                        ) : copy.analysis ? (
                                            <>
                                                {/* Items table */}
                                                <div className="space-y-1.5">
                                                    {items.map((item, idx) => (
                                                        <div key={item.id} className="flex items-start gap-3 text-xs">
                                                            <span className="text-slate-500 w-16 shrink-0 font-mono pt-0.5">{item.id}</span>
                                                            <span className="text-slate-400 flex-1 min-w-0 pt-0.5 truncate" title={item.label}>{item.label}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.max}
                                                                    step={0.5}
                                                                    value={item.awarded}
                                                                    disabled={isValidated}
                                                                    onChange={e => {
                                                                        const newAwarded = Math.min(item.max, Math.max(0, Number(e.target.value)));
                                                                        const newItems = items.map((it, i) =>
                                                                            i === idx ? { ...it, awarded: newAwarded } : it
                                                                        );
                                                                        setEditedItems(prev => ({ ...prev, [copy.id]: newItems }));
                                                                    }}
                                                                    className="w-14 bg-slate-950/60 border border-white/10 rounded-md px-1.5 py-0.5 text-right text-slate-200 outline-none focus:border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                />
                                                                <span className="text-slate-600">/{item.max}</span>
                                                            </div>
                                                            {item.comment && (
                                                                <span className="text-slate-600 hidden sm:block w-40 shrink-0 truncate" title={item.comment}>
                                                                    {item.comment}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Note + comment */}
                                                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-white">
                                                            Note : {currentNote}/{totalPoints}
                                                        </p>
                                                        {copy.analysis.general_comment && (
                                                            <p className="text-xs text-slate-500 italic max-w-md">
                                                                {copy.analysis.general_comment}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {!isValidated && (
                                                        <button
                                                            onClick={() => handleValidate(copy)}
                                                            disabled={validating === copy.id}
                                                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                                                        >
                                                            {validating === copy.id ? (
                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : '✓'}
                                                            Valider
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-500">Analyse non disponible.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
