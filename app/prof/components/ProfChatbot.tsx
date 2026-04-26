'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ProfContext, ChatMessageProf, ProfResourceType } from '@/lib/prof-types';
import { RESOURCE_TYPE_LABELS } from '@/lib/prof-types';
import { saveDraft, saveDraftPdf, uploadProfFile } from '../actions';
import { useFigureRenderer } from '@/app/hooks/useFigureRenderer';
import { extractBestLatex, extractBestHtml } from '@/lib/latex-extract';
import { convertTabularToHtml, convertTkzTabToMathtable, convertPgfplotsToMathgraph } from '@/lib/latex-env-converters';

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
    const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
    const [contentType, setContentType] = useState<'latex' | 'html'>('latex');
    const [showPreview, setShowPreview] = useState(false);
    const [previewTab, setPreviewTab] = useState<'code' | 'render' | 'pdf'>('render');
    const [pdfPreviewImages, setPdfPreviewImages] = useState<string[]>([]);
    const [pdfPreviewPdf, setPdfPreviewPdf] = useState<string | null>(null);
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
    const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);

    // Initialisation du renderer mathématique pour le chat (comme mimimaths)
    const { renderMessageContent: renderContent } = useFigureRenderer();
    const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
    const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string | null>(null);
    const [aiProvider, setAiProvider] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Determine if resource type is interactive
    const isInteractif = context.resource_type === 'interactif';

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Compilation PDF automatique quand l'onglet PDF est actif et que le LaTeX change
    useEffect(() => {
        if (previewTab !== 'pdf' || !generatedLatex) return;
        let cancelled = false;

        const compilePdf = async () => {
            setPdfPreviewLoading(true);
            setPdfPreviewError(null);
            setPdfPreviewImages([]);
            setPdfPreviewPdf(null);

            try {
                const resp = await fetch('/api/latex-preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latex: generatedLatex }),
                });

                if (cancelled) return;

                const data = await resp.json();
                if (data.success && (data.images || data.image)) {
                    setPdfPreviewImages(data.images || [data.image]);
                    if (data.pdf) setPdfPreviewPdf(data.pdf);
                } else {
                    setPdfPreviewError(data.error || 'Erreur de compilation');
                }
            } catch {
                if (!cancelled) {
                    setPdfPreviewError('Service indisponible');
                }
            } finally {
                if (!cancelled) {
                    setPdfPreviewLoading(false);
                }
            }
        };

        compilePdf();
        return () => { cancelled = true; };
    }, [previewTab, generatedLatex]);

    // Get content to send based on type
    const getContentToSend = useCallback((): string | undefined => {
        if (isInteractif) {
            return generatedHtml || undefined;
        }
        return generatedLatex || undefined;
    }, [isInteractif, generatedHtml, generatedLatex]);

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
                    existing_content: getContentToSend(),
                    image_urls: allImageUrls.length > 0 ? allImageUrls : undefined,
                    file_content: pendingFileContent,
                    file_name: pendingFileName,
                }),
            });

            // Récupérer le provider AI utilisé
            setAiProvider(response.headers.get('X-AI-Provider'));
            setPendingImageUrls([]); // Reset après envoi
            setPendingFileContent(null); // Reset contenu fichier après envoi
            setPendingFileName(null);

            if (!response.ok) {
                // Pour 503, le body contient un message utilisateur lisible
                const errorText = await response.text().catch(() => '');
                throw new Error(errorText || `Erreur ${response.status}`);
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

            // Extract content based on resource type
            if (isInteractif) {
                const htmlContent = extractBestHtml(fullContent);
                if (htmlContent) {
                    setGeneratedHtml(htmlContent);
                    setContentType('html');
                } else {
                    // Fallback : l'IA a produit du LaTeX au lieu de HTML
                    const latexContent = extractBestLatex(fullContent);
                    if (latexContent) {
                        setGeneratedLatex(latexContent);
                        setContentType('latex');
                    } else {
                        setGeneratedHtml(fullContent);
                        setContentType('html');
                    }
                }
                if (!context.free_mode) setShowPreview(true);
            } else {
                const latexContent = extractBestLatex(fullContent);
                if (latexContent) {
                    setGeneratedLatex(latexContent);
                    setContentType('latex');
                }
                if (!context.free_mode) setShowPreview(true);
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
    }, [input, messages, loading, context, getContentToSend, pendingImageUrls, pendingFileContent, pendingFileName, isInteractif]);

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

            // Déterminer le type de fichier
            const fileName = file.name.toLowerCase();
            const fileType = fileName.endsWith('.tex') ? 'tex' :
                fileName.endsWith('.pdf') ? 'pdf' :
                    fileName.endsWith('.docx') ? 'docx' : 'image';

            // Ajouter le message utilisateur avec l'attachement
            const msg: ChatMessageProf = {
                role: 'user',
                content: `📎 Fichier uploadé : ${file.name}`,
                attachments: [{
                    type: fileType,
                    url: result.url,
                    name: result.name,
                    extractedText: result.extractedContent,
                }],
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, msg]);

            // Accumuler les URLs d'images pour les envoyer avec le prochain message
            if (file.type.startsWith('image/')) {
                setPendingImageUrls(prev => [...prev, result.url]);
            }

            // Stocker le contenu extrait (PDF, TEX) pour l'envoyer à l'API
            if (result.extractedContent) {
                setPendingFileContent(result.extractedContent);
                setPendingFileName(file.name);
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

    // ── Dictée vocale (Web Speech API) ──────────────────────
    const handleMic = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('La dictée vocale nécessite Chrome ou Edge.');
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (e: any) => {
            const transcript = Array.from(e.results)
                .slice(e.resultIndex)
                .map((r: any) => r[0].transcript)
                .join(' ');
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
            textareaRef.current?.focus();
        };

        recognition.onerror = (e: any) => {
            setIsRecording(false);
            if (e.error === 'not-allowed') {
                alert('Microphone bloqué. Cliquez sur l\'icône 🔒 dans la barre d\'adresse Chrome → Microphone → Autoriser, puis rechargez la page.');
            }
        };

        recognition.onend = () => { setIsRecording(false); };

        recognitionRef.current = recognition;
        // setIsRecording AVANT start() pour garantir le rendu visuel immédiat
        setIsRecording(true);
        try {
            recognition.start();
        } catch {
            setIsRecording(false);
        }
    }, [isRecording]);

    // ── Sauvegarder le brouillon ─────────────────────────────
    const handleSaveDraft = useCallback(async () => {
        const content = contentType === 'html' ? generatedHtml : generatedLatex;
        if (!content) return;
        setSavingDraft(true);
        try {
            // Sauvegarder le fichier LaTeX/HTML
            const { resourceId } = await saveDraft({
                teacherId,
                sequenceId,
                chapterId: context.chapter_id,
                resourceType: context.resource_type,
                content,
            });

            // Compiler et sauvegarder le PDF (uniquement pour le LaTeX)
            if (contentType === 'latex' && generatedLatex) {
                saveDraftPdf(resourceId, generatedLatex).then(result => {
                    if (!result.success) {
                        console.warn('PDF preview non sauvegardé:', result.error);
                    }
                }).catch(() => {});
            }

            setDraftSaved(true);
        } catch (err: any) {
            console.error('Erreur sauvegarde brouillon:', err);
        } finally {
            setSavingDraft(false);
        }
    }, [contentType, generatedHtml, generatedLatex, teacherId, sequenceId, context]);

    // ── Télécharger le fichier ──────────────────────────────────
    const handleDownload = useCallback(() => {
        const content = contentType === 'html' ? generatedHtml : generatedLatex;
        if (!content) return;
        const blob = new Blob([content], { type: contentType === 'html' ? 'text/html' : 'text/x-latex' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${context.resource_type}_${context.chapter_title.replace(/\s+/g, '_')}.${contentType === 'html' ? 'html' : 'tex'}`;
        a.click();
        URL.revokeObjectURL(url);
    }, [contentType, generatedHtml, generatedLatex, context]);

    // ── Télécharger le PDF compilé ──────────────────────────────
    const handleDownloadPdf = useCallback(() => {
        if (!pdfPreviewPdf) return;
        const binary = atob(pdfPreviewPdf);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${context.resource_type}_${context.chapter_title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    }, [pdfPreviewPdf, context]);

    // Get current content for display
    const currentContent = contentType === 'html' ? generatedHtml : generatedLatex;
    // Detect actual format for rendering (HTML vs LaTeX)
    const isHtmlContent = !!(currentContent && (
        currentContent.trim().startsWith('<!DOCTYPE') ||
        currentContent.trim().startsWith('<html') ||
        currentContent.trim().startsWith('<HTML')
    ));

    // Fonction de nettoyage du LaTeX pour le rendu visuel professionnel
    const cleanLatexForPreview = (latex: string) => {
        if (!latex) return '';
        let content = latex;

        // ── PHASE 0 : Supprimer tout le préambule LaTeX ──────────────
        // Supprimer tout ce qui précède \begin{document}
        const docMatch = content.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
        if (docMatch) {
            content = docMatch[1];
        } else {
            // Pas de \begin{document} — supprimer quand même le préambule
            const dcMatch = content.match(/\\documentclass[\s\S]*?(?=\\begin\{document\}|\\section|\\subsection|\\begin\{(?:definition|propriete|exemple|methode|theoreme|remarque|tcolorbox|itemize|enumerate|center|figure|align))/);
            if (dcMatch) {
                content = content.substring(dcMatch[0].length);
            }
        }

        // ── PHASE 0.5 : Convertir les accents LaTeX en Unicode ──────────
        content = content
            // Accents avec accolades : \'{e} → é
            .replace(/\\'\{e\}/g, 'é').replace(/\\'\{E\}/g, 'É')
            .replace(/\\`\{e\}/g, 'è').replace(/\\`\{E\}/g, 'È')
            .replace(/\\`\{a\}/g, 'à').replace(/\\`\{A\}/g, 'À')
            .replace(/\\`\{u\}/g, 'ù').replace(/\\`\{U\}/g, 'Ù')
            .replace(/\\\^\{e\}/g, 'ê').replace(/\\\^\{E\}/g, 'Ê')
            .replace(/\\\^\{o\}/g, 'ô').replace(/\\\^\{O\}/g, 'Ô')
            .replace(/\\\^\{i\}/g, 'î').replace(/\\\^\{I\}/g, 'Î')
            .replace(/\\\^\{u\}/g, 'û').replace(/\\\^\{U\}/g, 'Û')
            .replace(/\\"\{e\}/g, 'ë').replace(/\\"\{i\}/g, 'ï')
            .replace(/\\c\{c\}/g, 'ç').replace(/\\c\{C\}/g, 'Ç')
            // Accents sans accolades : \'e → é, \`a → à, etc.
            .replace(/\\'e/g, 'é').replace(/\\'E/g, 'É')
            .replace(/\\`e/g, 'è').replace(/\\`E/g, 'È')
            .replace(/\\`a/g, 'à').replace(/\\`A/g, 'À')
            .replace(/\\`u/g, 'ù').replace(/\\`U/g, 'Ù')
            .replace(/\\\^e/g, 'ê').replace(/\\\^E/g, 'Ê')
            .replace(/\\\^o/g, 'ô').replace(/\\\^O/g, 'Ô')
            .replace(/\\\^i/g, 'î').replace(/\\\^I/g, 'Î')
            .replace(/\\\^u/g, 'û').replace(/\\\^U/g, 'Û')
            .replace(/\\"e/g, 'ë').replace(/\\"i/g, 'ï')
            // Notation décimale française {,} → virgule
            .replace(/\{,\}/g, ',')
            // Symboles monnaie et divers
            .replace(/\\euro\b/g, '€')
            .replace(/\\EUR\b/g, '€')
            .replace(/\\text\{€\}/g, '€')
            .replace(/\\text\{\euro\}/g, '€')
            .replace(/\\degres?\b/g, '°')
            .replace(/\\no\b/g, 'n°');

        // ── PHASE 1 : Supprimer les résidus de préambule ────────────
        content = content
            .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\RequirePackage(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\PassOptionsToPackage\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\inputenc\{[^}]*\}/g, '')
            .replace(/\\fontenc\{[^}]*\}/g, '')
            .replace(/\\babel\{[^}]*\}/g, '')
            .replace(/\\geometry\{[^}]*\}/g, '')
            .replace(/\\pgfplotsset\{[^}]*\}/g, '')
            .replace(/\\definecolor\{[^}]*\}\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\newcommand\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\renewcommand\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\newtcolorbox\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\titleformat\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\settowidth\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\pagestyle\{[^}]*\}/g, '')
            .replace(/\\thispagestyle\{[^}]*\}/g, '')
            .replace(/\\pagebreak/g, '')
            .replace(/\\linebreak/g, '\n')
            .replace(/\\columnbreak/g, '')
            .replace(/\\selectlanguage\{[^}]*\}/g, '')
            .replace(/\\tcbset\{[^}]*\}/g, '')
            .replace(/\\tcbuselibrary\{[^}]*\}/g, '')
            .replace(/\\makeatletter/g, '')
            .replace(/\\makeatother/g, '')
            .replace(/\\maketitle/g, '')
            .replace(/\\tableofcontents/g, '')
            .replace(/\\begin\{document\}/g, '')
            .replace(/\\end\{document\}/g, '');

        // ── PHASE 2 : Conversion des environnements LaTeX complexes ──
        // a) Tikzpicture : tkz-tab → <mathtable>, pgfplots → <mathgraph>, autre → placeholder
        content = content.replace(
            /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g,
            (tikzBlock) => {
                if (tikzBlock.includes('\\tkzTabInit')) return convertTkzTabToMathtable(tikzBlock);
                if (tikzBlock.includes('\\begin{axis}')) return convertPgfplotsToMathgraph(tikzBlock);
                return '\n<div class="preview-figure-placeholder">Figure TikZ</div>\n';
            }
        );

        // b) Tabular → HTML <table>
        // Gère \begin{tabular} seul OU \begin{center}\n\begin{tabular}...\end{tabular}\n\end{center}
        content = content.replace(
            /(?:\\begin\{center\}\s*)?\\begin\{tabular\}\{[^}]*\}[\s\S]*?\\end\{tabular\}(?:\s*\\end\{center\})?/g,
            (tabBlock) => convertTabularToHtml(tabBlock)
        );

        // c) Normaliser les <mathtable data='...'></mathtable> générés par l'IA
        content = content.replace(
            /(<mathtable\s+data=')([\s\S]*?)('(?:\s*\/>|>\s*<\/mathtable>))/g,
            (_match, prefix: string, jsonStr: string, suffix: string) => {
                try {
                    const unescaped = jsonStr
                        .replace(/&#39;/g, "'")
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');
                    const data = JSON.parse(unescaped);
                    if (data.xValues && data.rows) {
                        const N = data.xValues.length;
                        for (const row of data.rows) {
                            if (row.type === 'sign' && row.content.length === 2 * N - 1) {
                                row.content = row.content.slice(1, -1);
                            }
                        }
                    }
                    const escaped = JSON.stringify(data).replace(/'/g, '&#39;');
                    return `${prefix}${escaped}'></mathtable>`;
                } catch {
                    return _match;
                }
            }
        );

        // ── PHASE 3 : En-tête de document \fbox{\parbox{...}{...}} ──
        {
            const fboxRegex = /\\fbox\{\\parbox\{[^}]*\}\{/g;
            let fboxResult = '';
            let lastIdx = 0;
            let fboxMatch;
            while ((fboxMatch = fboxRegex.exec(content)) !== null) {
                fboxResult += content.substring(lastIdx, fboxMatch.index);
                const bodyStart = fboxMatch.index + fboxMatch[0].length;
                let depth = 1;
                let pos = bodyStart;
                while (pos < content.length && depth > 0) {
                    if (content[pos] === '{') depth++;
                    else if (content[pos] === '}') depth--;
                    pos++;
                }
                if (depth === 0) {
                    const body = content.substring(bodyStart, pos - 1);
                    let endPos = pos;
                    if (endPos < content.length && content[endPos] === '}') endPos++;
                    const cleaned = body
                        .replace(/\\centering/g, '')
                        .replace(/\\Large\s*/g, '')
                        .replace(/\\large\s*/g, '')
                        .replace(/\\textwidth/g, '')
                        .replace(/\\\\?\[[\d.]+\s*(?:pt|cm|mm|em|ex)\]/g, '\n')
                        .replace(/\$[^\$]*\$/g, '')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();
                    fboxResult += `\n\n<div class="preview-header-box">\n\n${cleaned}\n\n</div>\n\n`;
                    lastIdx = endPos;
                } else {
                    fboxResult += fboxMatch[0];
                    lastIdx = bodyStart;
                }
            }
            fboxResult += content.substring(lastIdx);
            content = fboxResult;
        }

        // ── PHASE 4 : Espacements LaTeX \\<dim> — AVANT la conversion maths ──
        content = content.replace(/\\\\?\[[\d.]+\s*(?:pt|cm|mm|em|ex)\]/g, '\n');

        // ── PHASE 5 : Supprimer les commandes de formatage brutes ────
        content = content
            // Tailles de police
            .replace(/\\(?:footnotesize|scriptsize|tiny|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, '')
            // Déclarations de fonte sans argument
            .replace(/\\(?:bfseries|itshape|scshape|slshape|upshape|mdseries|normalfont|rmfamily|sffamily|ttfamily|lmr|calligra)\b/g, '')
            // protect, relax, leavevmode
            .replace(/\\(?:protect|relax|leavevmode|strut)\b/g, '')
            // Booktabs (hors tableaux)
            .replace(/\\(?:toprule|midrule|bottomrule)(?:\[[^\]]*\])?/g, '')
            .replace(/\\hline/g, '')
            .replace(/\\cline\{[^}]*\}/g, '')
            // vfill, hfil
            .replace(/\\(?:vfill|hfil)\b/g, '')
            // \displaystyle, \textstyle
            .replace(/\\displaystyle/g, '')
            .replace(/\\textstyle/g, '')
            // \left / \right (délimiteurs de taille)
            .replace(/\\left\(/g, '(')
            .replace(/\\right\)/g, ')')
            .replace(/\\left\[/g, '[')
            .replace(/\\right\]/g, ']')
            .replace(/\\left\\{/g, '\\{')
            .replace(/\\right\\}/g, '\\}')
            .replace(/\\left\|/g, '|')
            .replace(/\\right\|/g, '|')
            .replace(/\\left\\lfloor/g, '⌊')
            .replace(/\\right\\rfloor/g, '⌋')
            .replace(/\\left\\lceil/g, '⌈')
            .replace(/\\right\\rceil/g, '⌉')
            .replace(/\\left\\langle/g, '⟨')
            .replace(/\\right\\rangle/g, '⟩')
            // Tailles de délimiteurs \Big, \bigg, etc.
            .replace(/\\(?:Big|big|Bigg|bigg)[lr]?\b/g, '')
            // \phantom
            .replace(/\\phantom\{[^}]*\}/g, '')
            // \hfill, \hfill\null
            .replace(/\\hfill(?:\\null)?/g, '')
            // \color{...} et \color[...]{...}
            .replace(/\\color(?:\[[^\]]*\])?\{[^}]*\}/g, '')
            // \boxed{...} → encadré (avec accolades imbriquées)
            .replace(/\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g, '**$1**')
            // \text{...}, \mathrm{...}, \operatorname{...}, \textup{...}
            .replace(/\\text\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\mathrm\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\operatorname\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\textup\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '**$1**')
            .replace(/\\textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '*$1*')
            .replace(/\\textrm\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\mathcal\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1')
            .replace(/\\mathbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '**$1**')
            .replace(/\\mathit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '*$1*')
            .replace(/\\boldsymbol\{((?:[^{}]|\{[^{}]*\})*)\}/g, '**$1**')
            // Espacement mathématique
            .replace(/\\quad/g, '  ')
            .replace(/\\qquad/g, '    ')
            .replace(/\\,/g, ' ')
            .replace(/\\;/g, ' ')
            .replace(/\\!/g, '')
            .replace(/\\>/g, ' ')
            // \phantom{...}
            .replace(/\\phantom\{[^}]*\}/g, '')
            // multicols
            .replace(/\\begin\{multicols\}\{[^}]*\}/g, '')
            .replace(/\\end\{multicols\}/g, '')
            // minipage
            .replace(/\\begin\{minipage\}(?:\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\end\{minipage\}/g, '');

        // ── PHASE 6 : Environnements structurels → Markdown/HTML ────
        content = content
            // Titres
            .replace(/\\section\*?\{([\s\S]*?)\}/g, '\n\n# $1\n\n')
            .replace(/\\subsection\*?\{([\s\S]*?)\}/g, '\n\n## $1\n\n')
            .replace(/\\subsubsection\*?\{([\s\S]*?)\}/g, '\n\n### $1\n\n')
            .replace(/\\paragraph\*?\{([\s\S]*?)\}/g, '\n\n#### $1\n\n')

            // En-tête tcolorbox du cours
            .replace(/\{\\Large\\bfseries\\color\{.*?\}([^{]*?)\}/g, '### $1')
            .replace(/\{\\normalsize([^{]*?)\}/g, '**$1**')

            // Formatage texte
            .replace(/\\uline\{([\s\S]*?)\}/g, '<u>$1</u>')
            .replace(/\\underline\{([\s\S]*?)\}/g, '<u>$1</u>')
            .replace(/\\emph\{([\s\S]*?)\}/g, '*$1*')

            // Listes
            .replace(/\\begin\{itemize\}(\[.*?\])?/g, '\n')
            .replace(/\\end\{itemize\}/g, '\n')
            .replace(/\\begin\{enumerate\}(\[.*?\])?/g, '\n')
            .replace(/\\end\{enumerate\}/g, '\n')
            .replace(/\\item\s*/g, '- ')

            // Environnements spéciaux (encadrés colorés)
            .replace(/\\begin\{definition\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-definition">\n\n**Définition$1** :\n\n')
            .replace(/\\end\{definition\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{propriete\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-propriete">\n\n**Propriété$1** :\n\n')
            .replace(/\\end\{propriete\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{exemple\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-exemple">\n\n**Exemple$1** :\n\n')
            .replace(/\\end\{exemple\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{methode\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-methode">\n\n**Méthode$1** :\n\n')
            .replace(/\\end\{methode\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{theoreme\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-theoreme">\n\n**Théorème$1** :\n\n')
            .replace(/\\end\{theoreme\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{remarque\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-remarque">\n\n**Remarque$1** :\n\n')
            .replace(/\\end\{remarque\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{tcolorbox\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{tcolorbox\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{encadre\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{encadre\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{preuve\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-preuve">\n\n**Preuve$1** :\n\n')
            .replace(/\\end\{preuve\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{demonstration\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-preuve">\n\n**Démonstration$1** :\n\n')
            .replace(/\\end\{demonstration\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{corollaire\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-propriete">\n\n**Corollaire$1** :\n\n')
            .replace(/\\end\{corollaire\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{lemme\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-definition">\n\n**Lemme$1** :\n\n')
            .replace(/\\end\{lemme\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{notation\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-remarque">\n\n**Notation$1** :\n\n')
            .replace(/\\end\{notation\}/g, '\n\n</div>\n\n')
            // Exercices, corrections, solutions
            .replace(/\\begin\{exercice\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-methode">\n\n**Exercice$1** :\n\n')
            .replace(/\\end\{exercice\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{exercise\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-methode">\n\n**Exercise$1** :\n\n')
            .replace(/\\end\{exercise\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{correction\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-remarque">\n\n**Correction$1** :\n\n')
            .replace(/\\end\{correction\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{solution\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-remarque">\n\n**Solution$1** :\n\n')
            .replace(/\\end\{solution\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{activite\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-exemple">\n\n**Activité$1** :\n\n')
            .replace(/\\end\{activite\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{partie\}(\[.*?\])?/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{partie\}/g, '\n\n</div>\n\n')
            // Cadres (mdframed, framed, shaded)
            .replace(/\\begin\{mdframed\}(?:\[.*?\])?/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{mdframed\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{framed\}/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{framed\}/g, '\n\n</div>\n\n')
            .replace(/\\begin\{shaded\}/g, '\n\n<div class="preview-box preview-box-tcolorbox">\n\n')
            .replace(/\\end\{shaded\}/g, '\n\n</div>\n\n')
            // Listes de questions
            .replace(/\\begin\{questions\}(?:\[.*?\])?/g, '\n')
            .replace(/\\end\{questions\}/g, '\n')
            .replace(/\\begin\{subquestions\}(?:\[.*?\])?/g, '\n')
            .replace(/\\end\{subquestions\}/g, '\n')
            .replace(/\\begin\{description\}/g, '\n')
            .replace(/\\end\{description\}/g, '\n')
            .replace(/\\begin\{problems?\}(?:\[.*?\])?/g, '\n')
            .replace(/\\end\{problems?\}/g, '\n');

        // ── PHASE 7 : Mathématiques ─────────────────────────────────
        content = content
            // \begin{cases} → block math
            .replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, p1) => `$$\n\\begin{cases}${p1}\\end{cases}\n$$\n`)
            // \begin{align*} → aligned math
            .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, p1) => `$$\n\\begin{aligned}${p1}\\end{aligned}\n$$\n`)
            // \begin{equation*} → block math
            .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_m, p1) => `\n$$\n${p1}\n$$\n`)
            // \begin{gather*} → block math
            .replace(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g, (_match, p1) => `$$\n\\begin{gathered}${p1}\\end{gathered}\n$$\n`)
            // \begin{array}{...} → matrix
            .replace(/\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g, (_match, p1) => `$$\n\\begin{matrix}${p1}\\end{matrix}\n$$\n`)
            // \begin{pmatrix}, \begin{bmatrix}, \begin{vmatrix}
            .replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_match, p1) => `$$\n\\begin{pmatrix}${p1}\\end{pmatrix}\n$$\n`)
            .replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_match, p1) => `$$\n\\begin{bmatrix}${p1}\\end{bmatrix}\n$$\n`)
            .replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, (_match, p1) => `$$\n\\begin{vmatrix}${p1}\\end{vmatrix}\n$$\n`)
            // \[...\] → block math
            .replace(/\\\[([\s\S]*?)\\\]/g, (_m, p1) => `\n$$\n${p1}\n$$\n`)
            // \(...\) → inline math
            .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

        // ── PHASE 7.5 : Nettoyage ** et auto-encapsulation équations nues ───
        // a) Supprimer les marqueurs **bold** qui brisent les commandes LaTeX
        content = content
            .replace(/\*\*(\\[a-zA-Z])/g, '$1')            // **\cmd → \cmd
            .replace(/(\\[a-zA-Z]+\{[^}]*)\*\*/g, '$1');   // \cmd{..**} → \cmd{..}

        // a2) Strip tous les ** à l'intérieur des blocs $$...$$ et $...$ déjà formés
        content = content
            .replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => '$$' + inner.replace(/\*\*/g, '') + '$$')
            .replace(/\$([^$\n]+)\$/g, (_m, inner) => '$' + inner.replace(/\*\*/g, '') + '$');

        // a3) Fix fracs mal formées générées par l'IA : accolade fermante manquante
        // Cas simple  : \dfrac{a{b}        → \dfrac{a}{b}
        content = content.replace(
            /\\(d?frac)\{([^{}]+)\{([^{}]+)\}/g,
            (_m, cmd, num, den) => `\\${cmd}{${num}}{${den}}`
        );
        // Cas imbriqué : \frac{\sqrt{5}{3} → \frac{\sqrt{5}}{3}
        // Non-greedy (+?) pour ne pas absorber le dénominateur dans le numérateur
        content = content.replace(
            /\\(d?frac)\{((?:[^{}]|\{[^{}]*\})+?)\{((?:[^{}]|\{[^{}]*\})*)\}/g,
            (_m, cmd, num, den) => `\\${cmd}{${num}}{${den}}`
        );

        // b) Lignes d'équation LaTeX sans délimiteurs $...$ → $$...$$
        // Heuristique : ligne avec commandes LaTeX (\cmd) + signe = sans mots français courants
        {
            const frenchKeywords = /\b(donc|alors|par|la|le|les|de|du|des|et\s|ou\s|si\s|on\s|un\s|une\s|est\s|sont|avec|pour|dans|que\s|qui\s|car\s|mais|ni\s|soit|voici|calculer|vérifier|donner|déduire|conclure|figure|recopier|montrer|justifier|après|avant|d'abord|sachant|puisque|comme\s|aussi|l'événement|l'urne)\b/i;
            content = content.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('#') ||
                    trimmed.startsWith('>') || trimmed.startsWith('-') || trimmed.startsWith('|') ||
                    trimmed.startsWith('$$')) return line;
                if (/\$/.test(line)) return line; // Déjà délimité
                const hasLatexCmd = /\\[a-zA-Z]/.test(line);
                const hasEquals = /=/.test(line);
                const hasFrench = frenchKeywords.test(line);
                if (hasLatexCmd && hasEquals && !hasFrench) {
                    return `\n$$\n${trimmed}\n$$\n`;
                }
                return line;
            }).join('\n');
        }

        // ── PHASE 8 : Nettoyage final ───────────────────────────────
        content = content
            // \reponse → placeholder
            .replace(/\\reponse/g, '\n\n> **Cadre de réponse**\n\n')
            // Espacements
            .replace(/\\vspace\*?\{.*?\}/g, '\n')
            .replace(/\\hspace\*?\{.*?\}/g, ' ')
            .replace(/\\newline/g, '\n')
            .replace(/\\newpage/g, '\n---\n')
            .replace(/\\par\b/g, '\n\n')
            .replace(/\\medskip/g, '\n')
            .replace(/\\bigskip/g, '\n')
            .replace(/\\smallskip/g, '\n')
            .replace(/\\setcounter\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\stepcounter\{[^}]*\}/g, '')
            .replace(/\\noindent/g, '')
            .replace(/\\indent/g, '')
            // center
            .replace(/\\begin\{center\}\s*\\end\{center\}/g, '')
            .replace(/\\begin\{center\}\s*/g, '\n\n<div style="text-align:center">\n\n')
            .replace(/\\end\{center\}/g, '\n\n</div>\n\n')
            // Commentaires LaTeX
            .replace(/%[^\n]*/g, '')
            // Espacements résiduels
            .replace(/\\{1,3}\[\d+(?:\.\d+)?\s*(?:pt|cm|mm|em|ex)\]/g, '\n')
            // fbox/parbox résiduels
            .replace(/\\fbox\{[\s\S]*?\}/g, (m) => m.replace(/\\fbox\{|\\parbox\{[^}]*\}\{|\\centering|\\textwidth|\\Large\s*|\\large\s*/g, '').replace(/\{|\}/g, ''))
            // \  (backslash+espace = espace insécable LaTeX)
            .replace(/\\ /g, ' ')
            // Balises HTML incomplètes/tronquées (ex: <table style="...width:100)
            .replace(/<[a-zA-Z]+\s[^>]*$/gm, '')
            .replace(/<[a-zA-Z]+\s[^>]*(?=<|$)/g, (m) => m.endsWith('>') ? m : '');

        // ── PHASE 9 : Nettoyage des commandes LaTeX résiduelles ────
        // Cette phase attrape toutes les commandes LaTeX qui n'ont pas été
        // converties par les phases précédentes et qui apparaissent en texte brut.

        // 9a) Commandes avec accolade unique : \label{...}, \ref{...}, \footnote{...}, etc.
        content = content
            .replace(/\\(?:label|ref|eqref|pageref|cite|index|footnote|marginpar|caption)\{[^}]*\}/g, '')
            // Commandes de barème / notation
            .replace(/\\(?:pts|bareme|score|note|points|Mark|marks)\{[^}]*\}/g, '')
            .replace(/\\pts\b/g, '')
            // \textcolor{color}{text} → text
            .replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \colorbox{color}{text} → text
            .replace(/\\colorbox\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \fcolorbox{c1}{c2}{text} → text
            .replace(/\\fcolorbox\{[^}]*\}\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \footnotetext{...}, \footnotemark
            .replace(/\\footnotetext\{[^}]*\}/g, '')
            .replace(/\\footnotemark/g, '')
            // \hypertarget{...}{text} / \hyperlink{...}{text}
            .replace(/\\hypertarget\{[^}]*\}\{([^}]*)\}/g, '$1')
            .replace(/\\hyperlink\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \url{...}
            .replace(/\\url\{([^}]*)\}/g, '$1')
            // \href{url}{text}
            .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \rule{w}{h}
            .replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '')
            // \mbox{...}, \makebox{...}{...}
            .replace(/\\mbox\{([^}]*)\}/g, '$1')
            .replace(/\\makebox\{[^}]*\}\{([^}]*)\}/g, '$1')
            // \raisebox{...}{text}
            .replace(/\\raisebox\{[^}]*\}\{([^}]*)\}/g, '$1');

        // 9b) Environnements non convertis : figure, table, quote, flushleft, flushright, etc.
        content = content
            .replace(/\\begin\{figure\}(?:\[[^\]]*\])?/g, '')
            .replace(/\\end\{figure\}/g, '')
            .replace(/\\begin\{table\}(?:\[[^\]]*\])?/g, '')
            .replace(/\\end\{table\}/g, '')
            // tabularx, longtable, tabu → supprimer la déclaration (le contenu est géré par le convertisseur tabular)
            .replace(/\\begin\{tabularx\}\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\end\{tabularx\}/g, '')
            .replace(/\\begin\{longtable\}(?:\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\end\{longtable\}/g, '')
            // adjustwidth, spacing
            .replace(/\\begin\{adjustwidth\}\{[^}]*\}\{[^}]*\}/g, '')
            .replace(/\\end\{adjustwidth\}/g, '')
            .replace(/\\begin\{spacing\}\{[^}]*\}/g, '')
            .replace(/\\end\{spacing\}/g, '')
            .replace(/\\begin\{quote\}/g, '<blockquote>')
            .replace(/\\end\{quote\}/g, '</blockquote>')
            .replace(/\\begin\{flushleft\}/g, '<div style="text-align:left">')
            .replace(/\\end\{flushleft\}/g, '</div>')
            .replace(/\\begin\{flushright\}/g, '<div style="text-align:right">')
            .replace(/\\end\{flushright\}/g, '</div>')
            .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, '<pre>$1</pre>')
            .replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g, '<pre>$1</pre>')
            .replace(/\\begin\{abstract\}/g, '<div class="preview-box">')
            .replace(/\\end\{abstract\}/g, '</div>');

        // 9c) Commandes de formatage résiduelles à 1 argument → texte seul
        content = content
            .replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>')
            .replace(/\\uline\{([^}]*)\}/g, '<u>$1</u>')
            .replace(/\\dotuline\{([^}]*)\}/g, '$1')
            .replace(/\\uuline\{([^}]*)\}/g, '$1')
            .replace(/\\sout\{([^}]*)\}/g, '~~$1~~')
            .replace(/\\xout\{([^}]*)\}/g, '$1')
            .replace(/\\textsuperscript\{([^}]*)\}/g, '<sup>$1</sup>')
            .replace(/\\textsubscript\{([^}]*)\}/g, '<sub>$1</sub>')
            .replace(/\\framebox\{[^}]*\}\{?([^}]*)\}?/g, '$1')
            .replace(/\\circle\{[^}]*\}/g, '')
            .replace(/\\line\([^)]*\)/g, '');

        // 9d) Nettoyage des commandes LaTeX orphelines restantes (catch-all)
        // Supprime les commandes \command{...} non-mathématiques qui trainent
        // en dehors des blocs $...$ et $$...$$.
        // On procède en 2 passes : d'abord les commandes à accolades imbriquées,
        // puis les commandes simples.
        const stripNonMathCommands = (str: string): string => {
            // Helper : vérifie si une position est dans un bloc math $...$ ou $$...$$
            const isInMath = (s: string, pos: number): boolean => {
                let inInline = false;
                let inDisplay = false;
                let k = 0;
                while (k < pos) {
                    if (s[k] === '$' && s[k + 1] === '$') { inDisplay = !inDisplay; k += 2; continue; }
                    if (s[k] === '$') { inInline = !inInline; }
                    k++;
                }
                return inInline || inDisplay;
            };

            // Passe 1 : commandes à accolades (ex: \unknown{...})
            // On répète car le nettoyage peut révéler de nouvelles commandes
            let result = str;
            for (let pass = 0; pass < 3; pass++) {
                const prev = result;
                result = result.replace(
                    /\\([a-zA-Z@]+)\s*(\{[^}]*\})/g,
                    (match, cmd, _arg, offset) => {
                        // Commandes KaTeX valides à préserver dans les blocs math
                        const mathCommands = new Set([
                            'frac', 'dfrac', 'tfrac', 'sqrt', 'root',
                            'vec', 'overrightarrow', 'overline', 'underline', 'widehat', 'widetilde',
                            'hat', 'tilde', 'dot', 'ddot', 'bar', 'breve', 'check', 'acute', 'grave',
                            'mathbb', 'mathcal', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathrm',
                            'text', 'textrm', 'textbf', 'textit', 'textsf', 'texttt',
                            'operatorname', 'boldsymbol',
                            'binom', 'tbinom', 'dbinom', 'choose',
                            'sum', 'prod', 'coprod', 'int', 'iint', 'iiint', 'oint',
                            'lim', 'sup', 'inf', 'max', 'min', 'log', 'ln', 'exp',
                            'sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan',
                            'sinh', 'cosh', 'tanh',
                            'left', 'right', 'Big', 'big', 'Bigg', 'bigg',
                            'begin', 'end',
                            'color', 'cancel', 'bcancel', 'xcancel',
                            'phantom', 'hphantom', 'vphantom',
                            'overset', 'underset', 'stackrel', 'substack',
                            'xleftarrow', 'xrightarrow',
                            'boxed', 'colorbox', 'fcolorbox',
                        ]);
                        if (isInMath(result, offset)) return match;
                        if (mathCommands.has(cmd)) return match;
                        return ''; // Supprimer la commande non-math hors bloc $
                    }
                );
                if (result === prev) break; // Plus de changements → on arrête
            }

            // Passe 2 : commandes sans accolades (ex: \hfill, \centering, etc.)
            result = result.replace(
                /\\([a-zA-Z@]+)(?![a-zA-Z{])/g,
                (match, cmd, offset) => {
                    if (isInMath(result, offset)) return match;
                    // Commandes qui doivent être préservées même hors bloc math
                    const keep = new Set([
                        'section', 'subsection', 'subsubsection', 'paragraph',
                        'begin', 'end',
                    ]);
                    if (keep.has(cmd)) return match;
                    // Commandes connues de formatage → les ignorer (déjà traitées)
                    const discard = new Set([
                        'hfill', 'centering', 'raggedright', 'raggedleft',
                        'noindent', 'indent', 'par', 'newline', 'linebreak',
                        'newpage', 'pagebreak', 'columnbreak', 'clearpage', 'cleardoublepage',
                        'medskip', 'bigskip', 'smallskip',
                        'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
                        // Déclarations de fonte
                        'bfseries', 'itshape', 'scshape', 'slshape', 'upshape',
                        'mdseries', 'normalfont', 'rmfamily', 'sffamily', 'ttfamily',
                        // Misc
                        'protect', 'relax', 'leavevmode', 'strut',
                        'maketitle', 'tableofcontents', 'appendix',
                        'makeatletter', 'makeatother',
                        'hline', 'toprule', 'midrule', 'bottomrule',
                        'vfill', 'hfil',
                        'allowdisplaybreaks', 'frontmatter', 'mainmatter', 'backmatter',
                    ]);
                    if (discard.has(cmd)) return '';
                    return match; // Commande inconnue → on garde (peut être KaTeX)
                }
            );

            return result;
        };

        content = stripNonMathCommands(content);

        // 9e) Nettoyage final des caractères spéciaux LaTeX
        content = content
            // ~~ (espace insécable LaTeX) → espace normal
            .replace(/~(?!\{)/g, ' ')
            // \\ en fin de ligne : newline hors math, préservé dans $$...$$
            .replace(/\\\\\s*/g, (match, offset, str) => {
                const before = str.substring(0, offset);
                const ddCount = (before.match(/\$\$/g) || []).length;
                return ddCount % 2 === 1 ? match : '\n';
            })
            // Accolades orphelines : }{2}}{2} (pattern très spécifique, ne casse pas les \frac{a}{b})
            .replace(/\}\{(\d+)\}\}\{(\d+)\}/g, '')
            // Accolades orphelines isolées hors des blocs math
            .replace(/^\s*\}\s*$/gm, '')
            // Zero-width spaces
            .replace(/\u200B/g, '')
            // Nettoyer les lignes vides excessives
            .replace(/\n{4,}/g, '\n\n\n')
            // Espaces en début/fin de lignes
            .replace(/[ \t]+$/gm, '');

        return content;
    };

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
                    {currentContent && !context.free_mode && (
                        <>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-all"
                            >
                                {showPreview ? '💬 Chat' : '👁️ Aperçu'}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-cyan-400 hover:bg-cyan-500/10 transition-all"
                            >
                                ⬇ {isHtmlContent ? '.html' : '.tex'}
                            </button>
                            {!isHtmlContent && pdfPreviewPdf && (
                                <button
                                    onClick={handleDownloadPdf}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                >
                                    ⬇ .pdf
                                </button>
                            )}
                            {!context.free_mode && (
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
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── ZONE PRINCIPALE ────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex">
                {/* Chat messages */}
                <div className={`flex flex-col overflow-hidden transition-all duration-300 ${showPreview && !context.free_mode ? 'w-2/5' : 'w-full'}`}>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                            <div className="text-5xl mb-4">{context.free_mode ? '🎨' : '🎓'}</div>
                            <p className="text-xs font-mono uppercase tracking-[0.5em] text-indigo-400 mb-2">
                                {context.free_mode ? 'Mode Libre' : 'Assistant Pédagogique'}
                            </p>
                            <p className="text-sm text-slate-500 max-w-md">
                                {context.free_mode
                                    ? 'Posez n\'importe quelle question, demandez une figure, un graphique, un schéma — sans contrainte de chapitre.'
                                    : <>Décrivez, dictez ou envoyez des fichiers pour créer votre{' '}
                                        <span className="text-indigo-400 font-medium">
                                            {RESOURCE_TYPE_LABELS[context.resource_type].toLowerCase()}
                                        </span></>
                                }
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {(context.free_mode
                                    ? [
                                        'Trace un triangle avec ses 3 médianes',
                                        'Représente graphiquement f(x) = x² - 2x + 1',
                                        'Dessine un cercle inscrit dans un carré',
                                        'Trace la suite u_n = 2n + 1 pour n = 0..8',
                                    ]
                                    : getSuggestions(context.resource_type)
                                ).map((s, i) => (
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
                                <div className="leading-relaxed message-content-wrapper space-y-4">
                                    {msg.role === 'user' ? (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    ) : (
                                        renderContent(msg.content)
                                    )}
                                </div>
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
                </div>

                {/* Preview panel with Tabs */}
                {showPreview && currentContent && (
                    <div className="w-3/5 flex flex-col border-l border-white/5 bg-slate-950/20 overflow-hidden">
                        {/* Tab Header */}
                        <div className="shrink-0 flex items-center bg-black/30 border-b border-white/5">
                            <button
                                onClick={() => setPreviewTab('render')}
                                className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    previewTab === 'render'
                                        ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-400'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                Apercu Rendu
                            </button>
                            <button
                                onClick={() => setPreviewTab('code')}
                                className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    previewTab === 'code'
                                        ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-400'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                {isHtmlContent ? 'Source HTML' : 'Source LaTeX'}
                            </button>
                            {!isHtmlContent && (
                                <button
                                    onClick={() => setPreviewTab('pdf')}
                                    className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        previewTab === 'pdf'
                                            ? 'text-violet-400 bg-violet-500/10 border-b-2 border-violet-400'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                                >
                                    <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                                    PDF
                                </button>
                            )}
                            {previewTab === 'code' && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(currentContent)}
                                    className="ml-auto mr-3 px-2.5 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-all"
                                    title="Copier le code"
                                >
                                    Copier
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden">
                            {previewTab === 'render' && (
                                <div className="h-full overflow-y-auto bg-white custom-scrollbar">
                                    <div className="preview-rendered p-8 max-w-none">
                                        {isHtmlContent ? (
                                            <iframe
                                                srcDoc={currentContent}
                                                className="w-full border-0"
                                                style={{ minHeight: '800px' }}
                                                title="Apercu HTML"
                                                sandbox="allow-scripts allow-same-origin"
                                            />
                                        ) : (
                                            renderContent(cleanLatexForPreview(currentContent))
                                        )}
                                    </div>
                                </div>
                            )}
                            {previewTab === 'code' && (
                                <div className="h-full overflow-y-auto bg-[#0f172a] custom-scrollbar">
                                    <pre className="preview-code-panel">
                                        {currentContent}
                                    </pre>
                                </div>
                            )}
                            {previewTab === 'pdf' && (
                                <div className="h-full overflow-y-auto bg-slate-900 custom-scrollbar flex items-start justify-center p-4">
                                    {pdfPreviewLoading ? (
                                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                                            <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs uppercase tracking-widest font-bold">Compilation PDF en cours...</span>
                                            <span className="text-[10px] text-slate-600">pdflatex sur le serveur Render</span>
                                        </div>
                                    ) : pdfPreviewError ? (
                                        <div className="flex flex-col items-center gap-3 py-20 text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                            </svg>
                                            <span className="text-sm">{pdfPreviewError}</span>
                                            <button
                                                onClick={() => setPreviewTab('pdf')}
                                                className="mt-2 px-4 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/30 transition-all"
                                            >
                                                Réessayer
                                            </button>
                                        </div>
                                    ) : pdfPreviewImages.length > 0 ? (
                                        pdfPreviewImages.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                alt={`Page ${i + 1}`}
                                                className="max-w-full shadow-2xl rounded"
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-20 text-slate-500">
                                            <span className="text-xs">Cliquez sur l&apos;onglet PDF pour compiler le LaTeX</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
                            {/* Dictée vocale */}
                            <button
                                type="button"
                                onClick={handleMic}
                                className={`p-2 rounded-full transition-all ${isRecording ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-slate-500 hover:text-indigo-400'}`}
                                title={isRecording ? 'Arrêter la dictée' : 'Dicter en français'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
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
                            aiProvider === 'DeepSeek-V3'
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
        interactif: 'Décrivez les questions interactives à générer (10 questions HTML avec note sur 20)...',
        ds: 'Décrivez le devoir surveillé (thème, nombre d\'exercices, durée)...',
        eam: 'Décrivez l\'épreuve anticipée (chapitres couverts, difficulté)...',
    };
    return placeholders[type]
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
            'Génère 10 questions interactives HTML',
            'Questions avec pièges fréquents',
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
    }
    return suggestions[type] || []
}