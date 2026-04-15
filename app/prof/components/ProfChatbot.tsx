'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ProfContext, ChatMessageProf, ProfResourceType } from '@/lib/prof-types';
import { RESOURCE_TYPE_LABELS } from '@/lib/prof-types';
import { saveDraft, uploadProfFile } from '../actions';
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
    const [previewTab, setPreviewTab] = useState<'code' | 'render'>('render');
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);

    // Initialisation du renderer mathématique pour le chat (comme mimimaths)
    const { renderMessageContent: renderContent } = useFigureRenderer();
    const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
    const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string | null>(null);
    const [aiProvider, setAiProvider] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Determine if resource type is interactive
    const isInteractif = context.resource_type === 'interactif';

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                setShowPreview(true);
            } else {
                const latexContent = extractBestLatex(fullContent);
                if (latexContent) {
                    setGeneratedLatex(latexContent);
                    setContentType('latex');
                }
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

    // ── Sauvegarder le brouillon ─────────────────────────────
    const handleSaveDraft = useCallback(async () => {
        const content = contentType === 'html' ? generatedHtml : generatedLatex;
        if (!content) return;
        setSavingDraft(true);
        try {
            await saveDraft({
                teacherId,
                sequenceId,
                chapterId: context.chapter_id,
                resourceType: context.resource_type,
                content,
            });
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

        // ── PHASE 1 : Supprimer les résidus de préambule ────────────
        content = content
            .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, '')
            .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '')
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
        content = content.replace(
            /\\begin\{(?:center\}\s*)?tabular\}\{[^}]*\}[\s\S]*?\\end\{tabular\}(?:\s*\\end\{center\})?/g,
            (tabBlock) => convertTabularToHtml(tabBlock)
        );

        // c) Normaliser les <mathtable data='...' /> générés par l'IA
        content = content.replace(
            /(<mathtable\s+data=')([\s\S]*?)('\s*\/>)/g,
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
                    return `${prefix}${escaped}${suffix}`;
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
            .replace(/\\(?:footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, '')
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
            // \boxed{...} → encadré
            .replace(/\\boxed\{([^}]*)\}/g, '**$1**')
            // \text{...}, \mathrm{...}, \operatorname{...}, \textup{...}
            .replace(/\\text\{([^}]*)\}/g, '$1')
            .replace(/\\mathrm\{([^}]*)\}/g, '$1')
            .replace(/\\operatorname\{([^}]*)\}/g, '$1')
            .replace(/\\textup\{([^}]*)\}/g, '$1')
            .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
            .replace(/\\textit\{([^}]*)\}/g, '*$1*')
            .replace(/\\textrm\{([^}]*)\}/g, '$1')
            .replace(/\\mathbb\{([^}]*)\}/g, '$$$1$$')
            .replace(/\\mathcal\{([^}]*)\}/g, '$1')
            .replace(/\\mathbf\{([^}]*)\}/g, '**$1**')
            .replace(/\\mathit\{([^}]*)\}/g, '*$1*')
            .replace(/\\boldsymbol\{([^}]*)\}/g, '**$1**')
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
            .replace(/\\end\{notation\}/g, '\n\n</div>\n\n');

        // ── PHASE 7 : Mathématiques ─────────────────────────────────
        content = content
            // \begin{cases} → block math
            .replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, p1) => `$$\n\\begin{cases}${p1}\\end{cases}\n$$\n`)
            // \begin{align*} → aligned math
            .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, p1) => `$$\n\\begin{aligned}${p1}\\end{aligned}\n$$\n`)
            // \begin{equation*} → block math
            .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '\n$$\n$1\n$$\n')
            // \begin{gather*} → block math
            .replace(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g, (_match, p1) => `$$\n\\begin{gathered}${p1}\\end{gathered}\n$$\n`)
            // \begin{array}{...} → matrix
            .replace(/\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g, (_match, p1) => `$$\n\\begin{matrix}${p1}\\end{matrix}\n$$\n`)
            // \begin{pmatrix}, \begin{bmatrix}, \begin{vmatrix}
            .replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_match, p1) => `$$\n\\begin{pmatrix}${p1}\\end{pmatrix}\n$$\n`)
            .replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_match, p1) => `$$\n\\begin{bmatrix}${p1}\\end{bmatrix}\n$$\n`)
            .replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, (_match, p1) => `$$\n\\begin{vmatrix}${p1}\\end{vmatrix}\n$$\n`)
            // \[...\] → block math
            .replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n')
            // \(...\) → inline math
            .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

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
            // Nettoyer les doubles accolades résiduelles
            .replace(/\}\}/g, '}')
            // Nettoyer les lignes vides excessives
            .replace(/\n{4,}/g, '\n\n\n');

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
                    {currentContent && (
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
                <div className={`flex flex-col overflow-hidden transition-all duration-300 ${showPreview ? 'w-2/5' : 'w-full'}`}>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
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