'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ProfContext, ChatMessageProf, ProfResourceType } from '@/lib/prof-types';
import { RESOURCE_TYPE_LABELS } from '@/lib/prof-types';
import { saveDraft, uploadProfFile } from '../actions';

interface ProfChatbotProps {
    context: ProfContext;
    sequenceId: string;
    teacherId: string;
}

export default function ProfChatbot({ context, sequenceId, teacherId }: ProfChatbotProps) {
    const [messages, setMessages] = useState<ChatMessageProf[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
    const [aiProvider, setAiProvider] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Envoi d'un message ───────────────────────────────────
    const handleSend = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: ChatMessageProf = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setDraftSaved(false);

        try {
            // Collecter TOUTES les URLs d'images : pending + celles dans les messages
            const allImageUrls = [...pendingImageUrls];
            for (const m of newMessages) {
                if (m.attachments) {
                    for (const att of m.attachments) {
                        if (att.type === 'image' && !allImageUrls.includes(att.url)) {
                            allImageUrls.push(att.url);
                        }
                    }
                }
            }

            const response = await fetch('/api/prof-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    context,
                    existing_content: generatedLatex,
                    image_urls: allImageUrls.length > 0 ? allImageUrls : undefined,
                }),
            });

            // Récupérer le provider AI utilisé
            setAiProvider(response.headers.get('X-AI-Provider'));
            setPendingImageUrls([]); // Reset après envoi

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}`);
            }

            // Streaming
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            const assistantMsg: ChatMessageProf = {
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
            };

            setMessages([...newMessages, assistantMsg]);

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;

                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: fullContent,
                    };
                    return updated;
                });
            }

            // Extraire le LaTeX si la réponse en contient
            const latexMatch = fullContent.match(/```latex\n([\s\S]*?)```/);
            if (latexMatch) {
                setGeneratedLatex(latexMatch[1]);
                setShowPreview(true);
            } else if (fullContent.includes('\\documentclass') || fullContent.includes('\\begin{document}')) {
                // Le contenu entier est du LaTeX
                setGeneratedLatex(fullContent);
                setShowPreview(true);
            }

        } catch (err: any) {
            console.error('Erreur envoi message:', err);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `❌ Erreur: ${err.message}. Veuillez réessayer.`,
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, [input, messages, loading, context, generatedLatex, pendingImageUrls]);

    // ── Upload fichier ───────────────────────────────────────
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('teacher_id', teacherId);

        setLoading(true);
        try {
            const result = await uploadProfFile(formData);

            // Ajouter le message utilisateur avec l'attachement
            const msg: ChatMessageProf = {
                role: 'user',
                content: `📎 Fichier uploadé : ${file.name}`,
                attachments: [{
                    type: file.name.endsWith('.tex') ? 'tex' :
                        file.name.endsWith('.pdf') ? 'pdf' :
                            file.name.endsWith('.docx') ? 'docx' : 'image',
                    url: result.url,
                    name: result.name,
                }],
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, msg]);

            // Accumuler les URLs d'images pour les envoyer avec le prochain message
            if (file.type.startsWith('image/')) {
                setPendingImageUrls(prev => [...prev, result.url]);
            }
        } catch (err: any) {
            console.error('Erreur upload:', err);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [teacherId]);

    // ── Copier-coller d'images (Ctrl+V) ──────────────────────
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                const formData = new FormData();
                const fileName = `capture_${Date.now()}.png`;
                formData.append('file', file, fileName);
                formData.append('teacher_id', teacherId);

                setLoading(true);
                try {
                    const result = await uploadProfFile(formData);

                    const msg: ChatMessageProf = {
                        role: 'user',
                        content: `📷 Image collée : ${fileName}`,
                        attachments: [{
                            type: 'image',
                            url: result.url,
                            name: result.name,
                        }],
                        timestamp: new Date().toISOString(),
                    };

                    setMessages(prev => [...prev, msg]);
                    setPendingImageUrls(prev => [...prev, result.url]);
                } catch (err: any) {
                    console.error('Erreur coller image:', err);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `❌ Erreur lors du collage de l'image : ${err.message}`,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setLoading(false);
                }
                break; // Un seul fichier à la fois
            }
        }
    }, [teacherId]);

    // ── Sauvegarder le brouillon ─────────────────────────────
    const handleSaveDraft = useCallback(async () => {
        if (!generatedLatex) return;
        setSavingDraft(true);
        try {
            await saveDraft({
                teacherId,
                sequenceId,
                chapterId: context.chapter_id,
                resourceType: context.resource_type,
                content: generatedLatex,
            });
            setDraftSaved(true);
        } catch (err: any) {
            console.error('Erreur sauvegarde brouillon:', err);
        } finally {
            setSavingDraft(false);
        }
    }, [generatedLatex, teacherId, sequenceId, context]);

    // ── Télécharger le .tex ──────────────────────────────────
    const handleDownloadTex = useCallback(() => {
        if (!generatedLatex) return;
        const blob = new Blob([generatedLatex], { type: 'text/x-latex' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${context.resource_type}_${context.chapter_title.replace(/\s+/g, '_')}.tex`;
        a.click();
        URL.revokeObjectURL(url);
    }, [generatedLatex, context]);

    return (
        <div className="flex flex-col h-full">
            {/* ── HEADER CONTEXTUEL ──────────────────────────── */}
            <div className="shrink-0 px-5 py-3 bg-indigo-600/10 border-b border-indigo-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg">{RESOURCE_TYPE_LABELS[context.resource_type].split(' ')[0]}</span>
                    <div>
                        <p className="text-sm font-bold text-white">
                            {RESOURCE_TYPE_LABELS[context.resource_type]}
                        </p>
                        <p className="text-[10px] text-indigo-400/70">
                            {context.level_label} • {context.chapter_title}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {generatedLatex && (
                        <>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-all"
                            >
                                {showPreview ? '💬 Chat' : '👁️ Aperçu'}
                            </button>
                            <button
                                onClick={handleDownloadTex}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-cyan-400 hover:bg-cyan-500/10 transition-all"
                            >
                                ⬇ .tex
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                disabled={savingDraft || draftSaved}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    draftSaved
                                        ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                                        : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30'
                                } disabled:opacity-50`}
                            >
                                {savingDraft ? '⏳' : draftSaved ? '✅ Sauvegardé' : '💾 Brouillon'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── ZONE PRINCIPALE ────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex">
                {/* Chat messages */}
                <div className={`flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar ${showPreview ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                            <div className="text-5xl mb-4">🎓</div>
                            <p className="text-xs font-mono uppercase tracking-[0.5em] text-indigo-400 mb-2">
                                Assistant Pédagogique
                            </p>
                            <p className="text-sm text-slate-500 max-w-md">
                                Décrivez, dictez ou envoyez des fichiers pour créer votre{' '}
                                <span className="text-indigo-400 font-medium">
                                    {RESOURCE_TYPE_LABELS[context.resource_type].toLowerCase()}
                                </span>
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {getSuggestions(context.resource_type).map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(s)}
                                        className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 hover:border-indigo-500/10 transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1 shadow-md">
                                    AI
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-indigo-600/20 border border-indigo-500/20 text-slate-200'
                                        : 'bg-white/[0.03] border border-white/5 text-slate-300'
                                }`}
                            >
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {msg.attachments.map((att, ai) => (
                                            <a
                                                key={ai}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-cyan-400 hover:bg-cyan-500/10 transition-all"
                                            >
                                                📎 {att.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shrink-0 animate-pulse shadow-md">
                                AI
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Preview panel */}
                {showPreview && generatedLatex && (
                    <div className="w-1/2 overflow-y-auto p-5 bg-white/[0.01] custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Aperçu LaTeX
                            </h3>
                            <span className="text-[10px] text-slate-600">
                                {generatedLatex.length} caractères
                            </span>
                        </div>
                        <pre className="text-xs text-slate-400 font-mono bg-black/30 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap border border-white/5 leading-relaxed">
                            {generatedLatex}
                        </pre>
                    </div>
                )}
            </div>

            {/* ── INPUT BAR ──────────────────────────────────── */}
            <div className="shrink-0 p-4 bg-slate-950/50 border-t border-white/5">
                {/* Images en attente d'analyse */}
                {pendingImageUrls.length > 0 && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-cyan-400 text-xs">📷 {pendingImageUrls.length} image{pendingImageUrls.length > 1 ? 's' : ''} jointe{pendingImageUrls.length > 1 ? 's' : ''} — {pendingImageUrls.length > 1 ? 'seront analysées' : 'sera analysée'} par GPT-4o Vision</span>
                        <button
                            onClick={() => setPendingImageUrls([])}
                            className="ml-auto text-slate-500 hover:text-red-400 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center pr-2 focus-within:ring-1 focus-within:ring-indigo-500/30">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={pendingImageUrls.length > 0
                                ? `Décrivez ce que vous voulez faire avec ${pendingImageUrls.length > 1 ? 'ces images' : 'cette image'}...`
                                : getPlaceholder(context.resource_type)}
                            className="flex-1 bg-transparent border-none text-slate-100 px-4 py-3 resize-none text-sm min-h-[44px] max-h-[120px] focus:ring-0 placeholder:text-slate-600"
                            disabled={loading}
                        />
                        <div className="flex items-center shrink-0 gap-1">
                            {/* Upload */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-500 hover:text-indigo-400 transition-all rounded-full"
                                title="Upload fichier (.tex, .pdf, .png, .jpg, .docx)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-[44px] w-[44px] flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0 disabled:opacity-40"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".tex,.pdf,.png,.jpg,.jpeg,.docx"
                    className="hidden"
                />
                {/* Badge AI Provider */}
                {aiProvider && (
                    <div className="mt-2 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                            aiProvider === 'DeepSeek-R1'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                            {aiProvider}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getPlaceholder(type: ProfResourceType): string {
    const placeholders: Record<ProfResourceType, string> = {
        cours: 'Décrivez le contenu du cours que vous souhaitez créer...',
        exercices_1: 'Décrivez les exercices d\'application directe souhaités...',
        exercices_2: 'Décrivez les exercices intermédiaires...',
        exercices_3: 'Décrivez les exercices de synthèse...',
        interactif: 'Décrivez les questions interactives à générer...',
        ds: 'Décrivez le devoir surveillé (thème, nombre d\'exercices, durée)...',
        eam: 'Décrivez l\'épreuve anticipée (chapitres couverts, difficulté)...',
    };
    return placeholders[type];
}

function getSuggestions(type: ProfResourceType): string[] {
    const suggestions: Record<ProfResourceType, string[]> = {
        cours: [
            'Génère un cours sur les suites numériques',
            'Structure le chapitre en 3 parties',
            'Ajoute des exemples avec cadres réponse',
        ],
        exercices_1: [
            'Exercices d\'application directe du cours',
            'Exercices simples sur les définitions',
            'Calculs basiques avec exemples types',
        ],
        exercices_2: [
            'Exercices plus complets avec mise en situation',
            'Problèmes concrets de la vie courante',
            'Exercices à étapes multiples',
        ],
        exercices_3: [
            'Exercices de synthèse multi-notions',
            'Problèmes ouverts et défis',
            'Bilan transversal du chapitre',
        ],
        interactif: [
            'Génère 20 questions QCM sur ce chapitre',
            'Questions avec piéges fréquents',
            'Mix de calcul et de logique',
        ],
        ds: [
            'DS 1h sans calculatrice, sujet A',
            'Automatismes (6pts) + 2 exercices (14pts)',
            'Thème : dérivation et optimisation',
        ],
        eam: [
            'EAM 2h, multi-chapitres (suites + dérivation)',
            '12 automatismes QCM + 3 exercices longs',
            'Difficulté progressive, dernière question difficile',
        ],
    };
    return suggestions[type] || [];
}
