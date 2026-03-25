'use client';

import { useCallback } from 'react';
import type { ChatMessage } from '@/lib/perplexity';
import type { NiveauLycee } from '@/lib/niveaux';
import { fixLatexContent } from '@/lib/latex-fixer';

// Référence globale à la fenêtre géomètre pour éviter les doublons
let _geoWindowRef: Window | null = null;

//  Utilitaire local ─────
function patchMarkdownTables(content: string): string {
    if (content.includes('@@@')) return content;
    const mdTableRegex = /(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g;
    const matches = content.match(mdTableRegex);
    if (!matches) return content;
    let patched = content;
    for (const match of matches) {
        try {
            const lines = match.trim().split('\n').filter((l: string) => l.trim());
            if (lines.length < 3) continue;
            const headers = lines[0].split('|').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
            const dataLines = lines.slice(2);
            if (!headers[0]) continue;
            if (headers[0].toLowerCase() === 'x') {
                const xValues = headers.slice(1).map((v: string) =>
                    v.replace(/-\s*\\?inft?y?|-?\s*infini?/gi, '-inf').replace(/\+?\s*\\?inft?y?|\+?\s*infini?/gi, '+inf')
                ).join(', ');
                let tableBlock = `table |\nx: ${xValues} |\n`;
                for (const dl of dataLines) {
                    // Protéger les || avant le split !
                    const protectedDl = dl.replace(/\|\|/g, '___DOUBLE_BAR___');
                    const cells = protectedDl.split('|').map((c: string) => c.trim().replace(/___DOUBLE_BAR___/g, '||')).filter((c: string) => c.length > 0);
                    if (cells.length < 2) continue;
                    const label = cells[0];
                    const values = cells.slice(1).map((v: string) =>
                        v.replace(/-\s*\\?inft?y?|-?\s*infini?/gi, '-inf').replace(/\+?\s*\\?inft?y?|\+?\s*infini?/gi, '+inf')
                    ).join(', ');
                    const isVariation = /nearrow|searrow/.test(values) || /(croissante|décroissante)/i.test(label);
                    tableBlock += `${isVariation ? 'var' : 'sign'}: ${label} : ${values} |\n`;
                }
                patched = patched.replace(match, `@@@\n${tableBlock}@@@`);
            }
        } catch (e) { console.warn('[patchMarkdownTables]', e); }
    }
    return patched;
}

//  Interface 

export interface UseMathRouterDeps {
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setLoading: (v: boolean) => void;
    setIsTalking: (v: boolean) => void;
    isVoiceEnabled: boolean;
    speakMessage: (text: string, index: number, audioData?: string) => Promise<void>;
    processSpeechQueue: () => void;
    speechQueue: React.MutableRefObject<string[]>;
    baseContext?: string;
    selectedNiveau: NiveauLycee | null;
    resolveNiveau: (msg: string) => NiveauLycee;
}

export interface UseMathRouterReturn {
    startStreamingResponse: (msgs: ChatMessage[]) => Promise<void>;
    handleSendMessageWithText: (inputText: string, newMessages: ChatMessage[]) => Promise<void>;
}

//  Hook 

export function useMathRouter({
    setMessages,
    setLoading,
    setIsTalking,
    isVoiceEnabled,
    speakMessage,
    processSpeechQueue,
    speechQueue,
    baseContext,
    selectedNiveau,
    resolveNiveau,
}: UseMathRouterDeps): UseMathRouterReturn {
    const startStreamingResponse = async (msgs: ChatMessage[]) => {
        setLoading(true);
        setIsTalking(true);

        // --- ACKNOWLEDGMENT VOCAL IMMÉDIAT ---
        if (isVoiceEnabled) {
            const acknowledgments = [
                "D'accord, je regarde ça tout de suite.",
                "Laisse-moi une seconde pour analyser ce problème.",
                "C'est une bonne question, je prépare une réponse détaillée.",
                "Je lance la recherche pour te donner une explication précise.",
                "D'accord, je commence l'analyse de ta demande."
            ];
            const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
            // On lance le TTS sans attendre qu'il finisse pour ne pas bloquer l'appel API
            speakMessage(randomAck, -1);
        }

        // On pré-ajoute le message de l'assistant (vide pour le stream)
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch('/api/perplexity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: msgs, context: baseContext }),
            });

            if (!response.ok) {
                let errMsg = `Erreur API (HTTP ${response.status})`;
                try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
                console.error('[useMathRouter] /api/perplexity error:', errMsg);
                throw new Error(errMsg);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Reader non disponible');

            const decoder = new TextDecoder();
            let fullText = "";
            let currentSentence = "";
            let inMathBlock = false;
            let lastUpdate = Date.now();
            let rafPending = false;
            let lineBuffer = ""; // Buffer pour les lignes incomplètes entre chunks

            // Référence stable pour accéder à fullText dans le RAF
            const fullTextRef = { current: "" };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const rawChunk = decoder.decode(value, { stream: true });

                // Accumuler le chunk dans le buffer et séparer les lignes complètes
                lineBuffer += rawChunk;
                const lines = lineBuffer.split('\n');

                // Le dernier élément peut être incomplet, le garder pour le prochain chunk
                lineBuffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr === '[DONE]') break;
                        try {
                            const json = JSON.parse(jsonStr);
                            const content = json.choices[0]?.delta?.content || "";
                            if (content) {
                                fullText += content;
                                fullTextRef.current = fullText;
                                currentSentence += content;

                                // Mise à jour UI : utiliser le texte brut pendant le streaming
                                // Le fixer complet sera appliqué à la fin (ligne ~214)
                                // Cela évite les problèmes d'encapsulation de fractions incomplètes
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = {
                                        role: 'assistant',
                                        content: fullText  // Texte brut pendant le streaming
                                    };
                                    return updated;
                                });

                                // Détection de fin de phrase pour le TTS
                                // On évite de couper au milieu d'un bloc @@@ ou d'un bloc KaTeX $$
                                if (content.includes('@@@')) inMathBlock = !inMathBlock;
                                if (content.includes('$$')) inMathBlock = !inMathBlock;

                                if (!inMathBlock && isVoiceEnabled) {
                                    const sentenceEndings = /[.!?](\s|$)/;
                                    if (sentenceEndings.test(currentSentence) && currentSentence.trim().length > 15) {
                                        // On nettoie un peu la phrase avant de l'ajouter à la queue
                                        const sentenceToSpeak = currentSentence.trim();
                                        speechQueue.current.push(sentenceToSpeak);
                                        currentSentence = "";
                                        processSpeechQueue();
                                    }
                                }
                            }
                        } catch (e) {
                            // Erreur de parsing JSON - log pour debug
                            console.warn('[Stream] JSON parse error on line:', line.slice(0, 100));
                        }
                    }
                }
            }

            // Traiter le buffer résiduel si non vide
            if (lineBuffer.startsWith('data: ')) {
                const jsonStr = lineBuffer.substring(6);
                if (jsonStr !== '[DONE]') {
                    try {
                        const json = JSON.parse(jsonStr);
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullText += content;
                            fullTextRef.current = fullText;
                        }
                    } catch (e) {
                        console.warn('[Stream] Residual buffer parse error');
                    }
                }
            }

            // Fin du stream : application du fixFinal et lecture du reste
            // patchMarkdownTables : si l'IA a généré un tableau Markdown au lieu de @@@,
            // on le convertit automatiquement (garde-fou non-déterminisme)
            const finalFixed = patchMarkdownTables(fixLatexContent(fullText).content);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: finalFixed };
                return updated;
            });

            if (currentSentence.trim().length > 0 && isVoiceEnabled) {
                speechQueue.current.push(currentSentence.trim());
                processSpeechQueue();
            }

        } catch (error) {
            console.error('Erreur Assistant:', error);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: "Désolé, une erreur est survenue lors de la communication." };
                return updated;
            });
            setIsTalking(false);
        } finally {
            setLoading(false);
        }
    };


    // ═══════════════════════════════════════════════════════════════════
    // MOTEUR DE ROUTAGE : détecte le type de demande et active le bon moteur
    // Appelé par handleSendMessage (texte tapé) ET processFile (capture d'écran)
    // ═══════════════════════════════════════════════════════════════════
    const handleSendMessageWithText = async (inputText: string, newMessages: ChatMessage[]) => {
        // ── Pré-traitement LaTeX : convertir les notations LaTeX de l'élève ──
        // pour que les extracteurs d'expression fonctionnent correctement
        const deLatexInput = (s: string): string => s
            // Supprimer les délimiteurs LaTeX $...$, $$...$$, \(...\), \[...\]
            .replace(/\\\[|\\\]/g, '')
            .replace(/\\\(|\\\)/g, '')
            .replace(/\$\$/g, '').replace(/\$/g, '')
            // \frac{a}{b} → (a)/(b)
            .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
            .replace(/\\dfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
            .replace(/\\tfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
            // \sqrt{a} → sqrt(a)
            .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
            .replace(/\\sqrt\s*([a-zA-Z0-9])/g, 'sqrt($1)')
            // Accolades LaTeX → parenthèses
            .replace(/\{/g, '(').replace(/\}/g, ')')
            // \cdot, \times → *
            .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
            // \left, \right → supprimé
            .replace(/\\left/g, '').replace(/\\right/g, '')
            // Commandes résiduelles → supprimées
            .replace(/\\[a-zA-Z]+/g, '')
            .trim();

        const inputCleaned = deLatexInput(inputText);
        // Utiliser inputCleaned pour les détections et extractions, inputText pour l'affichage/IA
        const inputLower = inputCleaned.toLowerCase();
        const wantsSignTable = /signe|sign|tableau\s*de\s*signe|étudier?\s*(le\s*)?signe|in[eé]quation/i.test(inputLower);
        const wantsVariationTable = /variation|tableau\s*de\s*variation|étudier?\s*(les?\s*)?variation/i.test(inputLower);
        // Détection exercice multi-questions (format 1) ... 2) ... OU 1. ... 2. ...)
        const isMultiExpr = /(?:^|[\n;.!?\s])\s*\d+\s*[).]\s+[\s\S]+?(?:[\n;.!?\s])\s*\d+\s*[).]\s+/.test(inputText);

        // ═══════════════════════════════════════════════════════════
        // HANDLER EXERCICE MULTI-QUESTIONS
        // Flux pédagogique : IA explique → tableau SymPy en conclusion
        // ═══════════════════════════════════════════════════════════
        if (isMultiExpr) {
            try {
                // ── 1. Extraire l'expression commune du préambule ──
                let commonExpr = '';
                // Nettoyer le texte OCR : retirer les $ du LaTeX inline
                const cleanedInput = inputText.replace(/\$\$/g, '').replace(/\$/g, '');
                // Extraire tout ce qui suit '=' jusqu'au premier retour à la ligne
                // ⚠️ Ne PAS utiliser \d\) dans le lookahead car ça matche (2x-1) !
                // Supporte : "f(x) = ...", "Soit f(x) = ...", "définie par : f(x) = ...", "par : f(x) = ..."
                const preMatch = cleanedInput.match(/(?:soit|on\s+(?:consid[eè]re|pose|d[eé]finit)|d[eé]finie?\s+(?:sur\s+\S+\s+)?par\s*:?)?\s*(?:[fghk]\s*\(\s*x\s*\)|y)\s*=\s*(.+)/i);
                if (preMatch) {
                    // Prendre l'expression en s'arrêtant au premier numéro de question (ex: "1)", "1.", "Q1")
                    // ou au premier retour à la ligne.
                    commonExpr = preMatch[1].split(/(?:^|[\n;.!?\s])(?:\d+\s*[).]\s|Q\d+\b)/)[0].trim()
                        .replace(/[.!?]+$/, '')
                        // ⚠️ Retirer le texte français après l'expression
                        // Ex: "3/(x²+2x-3), et on note (Cf) sa courbe" → "3/(x²+2x-3)"
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|vous|c'est|puis|or|car|si|quand|donc|cette)\b.*$/i, '')
                        // Retirer aussi tout texte après "; " qui est un séparateur de phrase
                        .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                        .trim();
                }
                if (!commonExpr) {
                    const eqMatch = cleanedInput.match(/=\s*(.+)/);
                    if (eqMatch) commonExpr = eqMatch[1].split(/(?:^|[\n;.!?\s])(?:\d+\s*[).]\s|Q\d+\b)/)[0].trim()
                        .replace(/[.!?]+$/, '')
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|vous|c'est|puis|or|car|si|quand|donc|cette)\b.*$/i, '')
                        .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                        .trim();
                }

                const cleanMathExpr = (e: string) => {
                    let t = e;
                    // Retirer f(x) =
                    t = t.replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '');
                    // Retirer toute inéquation ou équation à droite (ex: > 0, = 0, ≥ 0)
                    t = t.replace(/\s*(?:>|<|>=|<=|=|≥|≤)\s*.*$/, '');
                    // Retirer $ et \\ (double backslash LaTeX)
                    t = t.replace(/\$/g, '').replace(/\\\\/g, '');
                    // Unicode → ASCII
                    t = t.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4');
                    t = t.replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/');
                    // LaTeX fractions (plusieurs passes pour les imbriqués)
                    for (let pass = 0; pass < 3; pass++) {
                        t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
                    }
                    // LaTeX racines
                    t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^}]*)\}/g, '$1rt($2)');
                    t = t.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
                    // LaTeX commandes courantes
                    t = t.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
                    t = t.replace(/\\left/g, '').replace(/\\right/g, '');
                    t = t.replace(/\\infty/g, 'Infinity');
                    t = t.replace(/\\pi/g, 'pi');
                    // Nettoyer les accolades résiduelles
                    t = t.replace(/\{/g, '(').replace(/\}/g, ')');
                    // ⛔ Supprimer TOUTE commande LaTeX restante (\xxx)
                    t = t.replace(/\\[a-zA-Z]+/g, '');
                    // Traduction française
                    t = t.replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)');
                    t = t.replace(/\bln\s*\(/g, 'log(');
                    // Multiplication implicite
                    t = t.replace(/(\d)([a-zA-Z])/g, '$1*$2');   // 2x → 2*x
                    t = t.replace(/(\d)\(/g, '$1*(');             // 3( → 3*(
                    t = t.replace(/\)(\w)/g, ')*$1');             // )x → )*x
                    t = t.replace(/\)\(/g, ')*(');                // )( → )*(
                    // Filet de sécurité : texte français résiduel
                    t = t.replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '');
                    t = t.replace(/\s+(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\s+.*$/i, '');
                    return t.replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '').trim();
                };

                const prettifyExpr = (ex: string): string => ex
                    .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                    .replace(/\blog\(/g, 'ln(')
                    .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                    .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');

                // ── 2. Parser les questions numérotées ──
                interface ExQ { num: string; text: string; type: 'sign_table' | 'sign_table_f' | 'variation_table' | 'graph' | 'solve' | 'parity' | 'limits' | 'derivative_sign' | 'ai'; }
                const questions: ExQ[] = [];
                const qRegex = /(\d+)\s*[).]\s*(.+?)(?=\n\s*\d+\s*[).]|\s*$)/g;
                let qM;
                while ((qM = qRegex.exec(inputText)) !== null) {
                    const qText = qM[2].trim();
                    const qNorm = qText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                    // ── Détection des questions COMPOSÉES ──
                    // Ex: "Étudier la fonction (ensemble de définition, limites, signe de la dérivée, tableau de variations)"
                    // → doit générer PLUSIEURS sous-questions : derivative_sign + variation_table
                    const hasDerivSign = /deriv|f'\s*\(|signe.*deriv|deriv.*signe/i.test(qNorm);
                    const hasVariation = /variation|dresser.*variation|tableau.*variation/i.test(qNorm);
                    const hasSignTable = /signe|etudier.*signe|tableau.*signe/i.test(qNorm) && !/deriv|f'/i.test(qNorm);
                    const isStudyQuestion = /etudier|etude complète|etude complete/i.test(qNorm);

                    if (isStudyQuestion && (hasDerivSign || hasVariation)) {
                        // Question composite "Étudier la fonction" → générer tous les tableaux nécessaires
                        if (hasDerivSign) {
                            questions.push({ num: qM[1], text: qText, type: 'derivative_sign' });
                        }
                        if (hasVariation) {
                            questions.push({ num: qM[1], text: qText, type: 'variation_table' });
                        }
                        // Ajouter aussi la question AI pour l'explication complète
                        questions.push({ num: qM[1], text: qText, type: 'ai' });
                    } else {
                        let qType: ExQ['type'] = 'ai';
                        // Parité
                        if (/parit|pair|impair/i.test(qNorm)) qType = 'parity';
                        // Limites
                        else if (/limite|borne|comportement.*infini|branche.*infini/i.test(qNorm)) qType = 'limits';
                        // Dérivée + signe de f' → tableau de signes de la dérivée
                        else if (hasDerivSign) qType = 'derivative_sign';
                        // Tableau de signes de f
                        else if (hasSignTable) qType = 'sign_table';
                        // Tableau de variations
                        else if (hasVariation) qType = 'variation_table';
                        // Courbe
                        else if (/trace|courbe|graphe|graphique|represent|dessine/i.test(qNorm)) qType = 'graph';
                        // Résolution d'inéquation f(x) > 0 ou < 0 → tableau de signes de f OBLIGATOIRE
                        // Note: qNorm est sans accents → "inéquation" devient "inequation"
                        else if (/resou|inequation/i.test(qNorm) && /[><≤≥]\s*0|[><≤≥]\s*f\(|f\(x\)\s*[><≤≥]/i.test(qText)) qType = 'sign_table_f';
                        // Résolution d'équation
                        else if (/resou|inequation|equation/i.test(qNorm)) qType = 'solve';
                        questions.push({ num: qM[1], text: qText, type: qType });
                    }
                }

                const exprClean = cleanMathExpr(commonExpr);
                console.log('[ExerciceMode] DEBUG commonExpr:', JSON.stringify(commonExpr), 'chars:', [...commonExpr].slice(0, 15).map(c => c.charCodeAt(0)));
                console.log('[ExerciceMode] DEBUG exprClean:', JSON.stringify(exprClean));
                console.log('[ExerciceMode]', { commonExpr, exprClean, questions: questions.map(q => `${q.num}) ${q.type}`) });

                if (questions.length >= 2 && exprClean) {
                    setLoading(true);
                    setIsTalking(true);

                    // ── 3. Pré-calculer tous les résultats déterministes ──
                    let signTableBlock = '';
                    let variationTableBlock = '';
                    let signCtx = '';
                    let tableOfValues = '';

                    for (const q of questions) {
                        if (q.type === 'sign_table') {
                            try {
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'sign_table', expression: exprClean, niveau: resolveNiveau(inputText) }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    signTableBlock = data.aaaBlock;
                                    // Construire un contexte riche avec la factorisation SymPy
                                    const ctxParts: string[] = [];
                                    if (data.factors?.length) {
                                        const numF = data.factors.filter((f: any) => f.type === 'numerator').map((f: any) => f.label);
                                        const denF = data.factors.filter((f: any) => f.type === 'denominator').map((f: any) => f.label);
                                        if (numF.length > 0) ctxParts.push(`Factorisation : f(x) = ${data.effectiveConst && data.effectiveConst < -1e-10 ? data.effectiveConst + ' × ' : ''}${numF.join(' × ')}`);
                                        if (denF.length > 0) ctxParts.push(`Dénominateur : ${denF.join(' × ')}`);
                                    }
                                    if (data.discriminantSteps?.length) {
                                        ctxParts.push('Discriminants :');
                                        for (const s of data.discriminantSteps) {
                                            ctxParts.push(`• ${s.factor} : ${s.steps.join(' ; ')}`);
                                        }
                                    }
                                    if (data.numZeros?.length) ctxParts.push(`Racines : x = ${data.numZeros.join(', ')}`);
                                    if (data.denZeros?.length) ctxParts.push(`Valeurs interdites : x = ${data.denZeros.join(', ')}`);
                                    signCtx = ctxParts.length ? '\n' + ctxParts.join('\n') : '';
                                }
                            } catch { /* AI fallback */ }
                        }
                        if (q.type === 'derivative_sign') {
                            // Appel direct de l'API Python SymPy pour calculer la dérivée exacte
                            try {
                                const drRes = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'derivative', expression: exprClean }),
                                });
                                const drData = await drRes.json();
                                let derivExprForSympy = '';
                                if (drData.success && drData.factored_derivative_str) {
                                    derivExprForSympy = drData.factored_derivative_str.replace(/\*\*/g, '^');
                                } else {
                                    // Fallback mathjs si Python indisponible 
                                    const { computeDerivative } = require('@/lib/math-engine/expression-parser');
                                    derivExprForSympy = computeDerivative(exprClean) || '';
                                }

                                if (derivExprForSympy) {
                                    const res = await fetch('/api/math-engine', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: 'sign_table',
                                            expression: derivExprForSympy,
                                            niveau: resolveNiveau(inputText),
                                        }),
                                    });
                                    const data = await res.json();
                                    if (data.success && data.aaaBlock) {
                                        signTableBlock = data.aaaBlock.replace(/sign:\s*f\(x\)/g, "sign: f'(x)");
                                        signCtx = `\nInfo : f'(x) = ${derivExprForSympy}` + (data.discriminantSteps?.length
                                            ? '\n' + data.discriminantSteps.map((s: any) => `- ${s.factor}: ${s.steps.join('; ')}`).join('\n')
                                            : '');
                                    }
                                }
                            } catch (derivErr) {
                                console.warn('[ExerciceMode] Erreur calcul dérivée:', derivErr);
                            }
                        }
                        if (q.type === 'sign_table_f') {
                            try {
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        type: 'sign_table',
                                        expression: exprClean,
                                        niveau: resolveNiveau(inputText),
                                    }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    signTableBlock = data.aaaBlock;
                                    signCtx = `\nInfo: tableau de signes de f(x) = ${exprClean} pré-calculé` +
                                        (data.discriminantSteps?.length
                                            ? '\n' + data.discriminantSteps.map((s: any) => `- Δ de ${s.factor}: ${s.steps.join('; ')}`).join('\n')
                                            : '');
                                    console.log(`[ExerciceMode] ✅ Tableau de signes f(x) via ${data.engine || 'moteur'}`);
                                } else {
                                    console.warn('[ExerciceMode] ⚠️ Tableau de signes f(x) échoué:', data.error);
                                }
                            } catch (err) {
                                console.warn('[ExerciceMode] Erreur calcul signe f(x):', err);
                            }
                        }
                        if (q.type === 'variation_table') {
                            try {
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'variation_table', expression: exprClean, niveau: resolveNiveau(inputText) }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    variationTableBlock = data.aaaBlock;
                                }
                            } catch { /* AI fallback */ }
                        }
                        if (q.type === 'graph') {
                            console.log(`[ExerciceMode] 📊 Handler GRAPH déclenché, exprClean="${exprClean}"`);
                            try {
                                const { compile: compileExpr } = await import('mathjs');
                                const san = (e2: string) => e2
                                    .replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                                    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bln\b/g, 'log')
                                    .replace(/−/g, '-')
                                    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
                                    .replace(/(\d)\(/g, '$1*(')
                                    .replace(/\)(\w)/g, ')*$1')
                                    .replace(/\)\(/g, ')*(');
                                const sanExpr = san(exprClean);
                                console.log(`[ExerciceMode] 📊 Expression sanitisée: "${sanExpr}"`);
                                const compiled = compileExpr(sanExpr);
                                const xVals = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
                                const rows: string[] = [];
                                for (const xv of xVals) {
                                    try {
                                        const yv = compiled.evaluate({ x: xv });
                                        if (typeof yv === 'number' && isFinite(yv)) {
                                            rows.push(`| ${xv} | ${Math.round(yv * 100) / 100} |`);
                                        }
                                    } catch { /* skip */ }
                                }
                                if (rows.length > 0) tableOfValues = `| x | f(x) |\n|---|---|\n${rows.join('\n')}`;
                                console.log(`[ExerciceMode] 📊 Tableau de valeurs: ${rows.length} points calculés`);
                            } catch (gErr) {
                                console.error('[ExerciceMode] 📊 ERREUR compilation expression:', gErr);
                            }

                            // Stocker les données du graphe pour ouverture via lien cliquable
                            try {
                                const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
                                const prettyName = exprClean
                                    .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                                    .replace(/\blog\(/g, 'ln(')
                                    .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                                    .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
                                const gs = {
                                    curves: [{ id: 'curve-0', expression: exprClean, name: `f(x) = ${prettyName}`, color: GRAPH_COLORS[0], interval: [-10, 10] as [number, number] }],
                                    intersections: [] as any[], positionsRelatives: [] as any[], tangent: null,
                                    title: `f(x) = ${prettyName}`,
                                };
                                localStorage.setItem('graphState', JSON.stringify(gs));
                                console.log(`[ExerciceMode] 📊 graphState stocké dans localStorage:`, JSON.stringify(gs).substring(0, 200));
                                // Envoyer via BroadcastChannel
                                try {
                                    const bch = new BroadcastChannel('mimimaths-graph');
                                    bch.postMessage({ type: 'UPDATE_GRAPH', state: gs }); bch.close();
                                    console.log('[ExerciceMode] 📊 BroadcastChannel envoyé');
                                } catch (bcErr) { console.warn('[ExerciceMode] 📊 BroadcastChannel échoué:', bcErr); }
                                // Essayer d'ouvrir le popup
                                try {
                                    const gw = window.open('/graph', 'mimimaths-graph', 'width=1100,height=700,menubar=no,toolbar=no');
                                    console.log(`[ExerciceMode] 📊 window.open résultat: ${gw ? 'ouvert' : 'bloqué'}`);
                                } catch { console.warn('[ExerciceMode] 📊 window.open échoué'); }
                            } catch (gsErr) {
                                console.error('[ExerciceMode] 📊 ERREUR stockage graphState:', gsErr);
                            }
                        }
                    }

                    // ── 4. Prompt IA : expliquer puis [TABLE_SIGNES] / [TABLE_VARIATIONS] ──
                    const aiParts: string[] = [];
                    // Déterminer si la question composite "étudier" est présente
                    const hasStudyDerivSign = questions.some(q => q.type === 'derivative_sign');
                    const hasStudyVarTable = questions.some(q => q.type === 'variation_table');

                    for (const q of questions) {
                        if (q.type === 'parity') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nÉtudie la parité de f :\n- Précise le domaine de définition Df et vérifie qu'il est symétrique par rapport à 0.\n- Calcule f(-x) en détaillant chaque étape.\n- Compare f(-x) avec f(x) et f(-x) avec -f(x).\n- Conclus : f est paire (si f(-x) = f(x)), impaire (si f(-x) = -f(x)), ou ni paire ni impaire.\n- Si paire/impaire, indique la conséquence sur la courbe (axe de symétrie Oy / centre de symétrie O).`
                            );
                        } else if (q.type === 'limits') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCalcule les limites aux bornes du domaine de définition :\n- Pour chaque borne (±∞ ou points d'annulation du dénominateur), factorise par le terme de plus haut degré.\n- Utilise la notation lim avec flèche (pas de notation d/dx, c'est hors programme).\n- Interprète graphiquement chaque limite : asymptote horizontale, verticale, ou branche parabolique.\n- Rédige comme dans un programme de Terminale de l'Éducation Nationale.`
                            );
                        } else if (q.type === 'derivative_sign') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCalcule f'(x) :\n- Utilise les formules de dérivation du programme (dérivée d'une somme, d'un produit, d'un quotient, de xⁿ).\n- NE PAS utiliser la notation d/dx qui est HORS PROGRAMME Lycée. Utilise f'(x).\n- Factorise f'(x) au maximum.\n- Étudie le signe de f'(x) : trouve les valeurs où f'(x) = 0, détermine le signe sur chaque intervalle.` +
                                (hasStudyVarTable 
                                    ? `\n⚠️ NE DESSINE PAS DE TABLEAU DE SIGNES ICI et n'écris pas le marqueur [TABLE_SIGNES]. Contente-toi du texte, car le signe sera intégré au [TABLE_VARIATIONS] de la question suivante.`
                                    : `\n- Présente le résultat dans un tableau de signes clair de f'(x).\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`)
                            );
                        } else if (q.type === 'sign_table') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nExplique la méthode en suivant ces étapes :\n1. Factorisation : utilise EXACTEMENT la factorisation SymPy ci-dessous, NE la modifie PAS.\n${signCtx}\n2. Pour chaque facteur de degré 2 (trinôme) : calcule Δ = b² - 4ac. NE FACTORISE PAS le trinôme en produit de facteurs de degré 1 (ex: NE PAS écrire x²-1 = (x-1)(x+1)). Utilise la règle : signe de a à l'extérieur des racines, signe opposé entre les racines.\n3. Pour chaque facteur de degré 1 : indique le signe de part et d'autre de la racine.\n4. Applique la règle des signes du produit.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\\\\\begin{array})`
                            );
                        } else if (q.type === 'sign_table_f') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\n` +
                                `Étape 1 : Calculer Δ pour trouver les racines de f(x) (OBLIGATOIRE, même si les racines sont évidentes) :\n` +
                                `  - Identifier a, b, c dans f(x) = ax² + bx + c\n` +
                                `  - Calculer Δ = b² - 4ac (montrer le calcul numérique)\n` +
                                `  - Calculer x₁ = (-b - √Δ) / 2a et x₂ = (-b + √Δ) / 2a (montrer le calcul)\n` +
                                `Étape 2 : Étudier le signe du trinôme : rappeler la règle du signe de 'a' à l'extérieur des racines.\n` +
                                `Étape 3 : Dresser le tableau de signes de f(x)${signCtx}\n` +
                                `Termine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n` +
                                `(⛔ NE fais PAS de tableau toi-même — le tableau SymPy est inséré automatiquement)\n` +
                                `Étape 4 : Utilise le tableau de signes. Pour >0 ou ≥0, garde UNIQUEMENT les intervalles où f(x) a un signe '+'. Pour <0 ou ≤0, garde UNIQUEMENT les intervalles avec un signe '-'. Attention aux valeurs interdites (||).\n` +
                                `Encadre OBLIGATOIREMENT TOUTE la ligne de solution finale dans **$ $**.\nExemple de format : **$S = ]-\\infty ; x_1[ \\cup ]x_2 ; +\\infty[$** (L'union doit correspondre rigoureusement aux bons signes, ne te trompe pas !)`
                            );
                        } else if (q.type === 'solve') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCommence par : "D'après le tableau de signes de la question précédente, ..."\n⛔ ATTENTION : Lis TRÈS ATTENTIVEMENT la dernière ligne (f(x)) du tableau pour trouver EXACTEMENT les bons intervalles (+ ou - selon l'inégalité demandée). Ne te trompe pas sur les valeurs des bornes (-∞, x₁, x₂, +∞) !\nConclus OBLIGATOIREMENT par la solution exacte **S = ...** en l'encadrant ENTIÈREMENT avec des symboles **$ $**. Utilise correctement \\cup pour l'union et \\infty.`
                            );
                        } else if (q.type === 'variation_table') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nExplique : calcule f'(x) avec les formules programme Lycée (PAS de notation d/dx), étudie le signe de f'(x), détermine les intervalles de croissance et décroissance, calcule la valeur de l'extremum.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_VARIATIONS]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`
                            );
                        } else if (q.type === 'graph') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nLa courbe a été tracée automatiquement par le moteur graphique. Clique sur le bouton ci-dessous pour l'ouvrir.`
                            );
                        } else {
                            aiParts.push(`**${q.num})** ${q.text}\nRéponds de manière pédagogique en suivant strictement le programme de Terminale de l'Éducation Nationale (Bulletin Officiel).\nNe PAS utiliser de notation hors programme (comme d/dx, nabla, etc.).${hasStudyDerivSign ? '\n⚠️ Le tableau de signes de f\'(x) est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}${hasStudyVarTable ? '\n⚠️ Le tableau de variations est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}`);
                        }
                    }

                    // ── Contraintes pédagogiques niveau-spécifiques pour le mode exercice ──
                    const exerciceNiveau = resolveNiveau(inputText);
                    const niveauLabel = exerciceNiveau.startsWith('seconde') ? 'SECONDE'
                        : exerciceNiveau.startsWith('premiere-stmg') ? 'PREMIÈRE STMG'
                        : exerciceNiveau.startsWith('premiere') ? 'PREMIÈRE SPÉCIALITÉ'
                        : 'TERMINALE';

                    const niveauConstraints = exerciceNiveau.startsWith('seconde') ? `
⛔⛔⛔ NIVEAU SECONDE — INTERDICTIONS ABSOLUES DANS CET EXERCICE ⛔⛔⛔
- ⛔ JAMAIS utiliser le discriminant Δ = b² - 4ac (HORS PROGRAMME SECONDE)
- ⛔ JAMAIS calculer des racines avec x = (-b ± √Δ) / 2a
- ⛔ JAMAIS écrire "On calcule Δ" ou "Δ = ..."
- ⛔ JAMAIS dériver f (pas de f'(x) en Seconde)
- ✅ Pour factoriser : utiliser UNIQUEMENT les identités remarquables (a²-b²=(a-b)(a+b)) ou le facteur commun évident
- ✅ Pour résoudre une inéquation : TOUJOURS tableau de signes avec les facteurs affines
- ✅ Les facteurs affines sont directement lisibles dans les expressions fournies par l'exercice
` : exerciceNiveau.startsWith('premiere') ? `
⚠️ NIVEAU ${niveauLabel} — RÈGLES POUR CET EXERCICE :
- ✅ Discriminant Δ autorisé pour les polynômes du 2nd degré
- ✅ Dérivée f'(x) autorisée (notation de Lagrange UNIQUEMENT, JAMAIS d/dx)
- ⛔ JAMAIS calculer des limites en ±∞ (hors programme Première)
- ✅ Pour toute inéquation f(x) > 0 : OBLIGATOIREMENT tableau de signes @@@table
` : `
⚠️ NIVEAU TERMINALE — RÈGLES POUR CET EXERCICE :
- ✅ Toutes les méthodes autorisées (dérivées, limites, asymptotes)
- ✅ Discriminant Δ autorisé
- ⛔ JAMAIS développements limités, équivalents (~), Taylor-Young
- ✅ Pour toute inéquation f(x) > 0 : OBLIGATOIREMENT tableau de signes @@@table
`;

                    const enrichedMessages: ChatMessage[] = JSON.parse(JSON.stringify(newMessages));
                    if (enrichedMessages.length > 0) {
                        enrichedMessages[enrichedMessages.length - 1].content += `\n\n[INSTRUCTIONS CACHÉES DU SYSTÈME AUTOMATIQUE DE MATHS] Exercice complet — Niveau : ${niveauLabel} — f(x) = ${exprClean}.
Réponds comme un élève modèle qui traite chaque question de l'exercice.
${niveauConstraints}
${aiParts.join('\n\n')}

RÈGLES ABSOLUES :
- ⛔ NE GÉNÈRE JAMAIS de tableaux LaTeX \\begin{array} ni de tableaux Markdown pour les signes ou les variations.
- ✅ L'unique façon d'afficher un tableau est d'utiliser le bloc @@@ fourni par le moteur.
- ✅ TU DOIS RECOPIER EXACTEMENT ET ENTIÈREMENT le(s) bloc(s) @@@ fournis dans les questions, SANS CHANGER UN SEUL CARACTÈRE. N'ajoute AUCUN espace ou tube '|' à l'intérieur du bloc @@@.
- Pour chaque question commence par le numéro en gras
- Détaille TOUTES les étapes de calcul
- ⛔⛔⛔ NOTATION d/dx STRICTEMENT INTERDITE (HORS PROGRAMME LYCÉE) ⛔⛔⛔
- ⛔ JAMAIS écrire d/dx, df/dx, dy/dx, d²f/dx²
- ⛔ JAMAIS écrire \\\\frac{d}{dx} ou \\\\frac{df}{dx}
- ✅ TOUJOURS utiliser f'(x) (notation de Lagrange, la SEULE au programme)
- ✅ Écrire "La dérivée de f est f'(x) = ..." et PAS "d/dx(f) = ..."
- ⛔⛔ NE PAS tracer la courbe, NE PAS générer de graphique, NE PAS ouvrir de fenêtre graphique — SAUF si une question le demande EXPLICITEMENT avec les mots "tracer", "représenter" ou "courbe"`;
                    }

                    // ── 5. Streaming + remplacement des placeholders ──
                    const header = `📝 **Exercice : f(x) = ${prettifyExpr(exprClean)}**\n\n---\n\n`;
                    setMessages(prev => [...prev, { role: 'assistant', content: header + '⏳ *Résolution en cours...*' }]);

                    try {
                        const response = await fetch('/api/perplexity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                        });
                        if (!response.ok) {
                            let errMsg = `Erreur API (HTTP ${response.status})`;
                            try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
                            console.error('[ExerciceMode] /api/perplexity error:', errMsg);
                            throw new Error(errMsg);
                        }
                        const reader = response.body?.getReader();
                        if (!reader) throw new Error('Reader non disponible');
                        const decoder = new TextDecoder();
                        let aiText = '';
                        let lastUpdate = 0;
                        // ⛔ Fonction pour supprimer la notation d/dx (Leibniz → Lagrange)
                        // SÉCURISÉE : ne touche PAS au LaTeX normal (\frac{a}{b}, etc.)
                        const stripDdx = (t: string) => t
                            // Plaintext exact : d(expr)/dx → (expr)'
                            .replace(/\bd\(([^)]+)\)\/dx\b/gi, "($1)'")
                            // Plaintext exact : df/dx → f'(x)
                            .replace(/\bdf\/dx\b/gi, "f'(x)")
                            // Plaintext exact : d/dx → (supprimé)
                            .replace(/\bd\/dx\b/gi, "")
                            // d²f/dx² → f''(x)
                            .replace(/\bd[²2]f?\/dx[²2]/gi, "f''(x)");
                        let lineBuffer = ''; // Buffer pour les lignes incomplètes
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            lineBuffer += decoder.decode(value, { stream: true });
                            const lines = lineBuffer.split('\n');
                            lineBuffer = lines.pop() || ''; // Garder la dernière ligne incomplète
                            for (const ln of lines) {
                                if (!ln.startsWith('data: ')) continue;
                                const js = ln.substring(6);
                                if (js === '[DONE]') break;
                                try {
                                    const c = JSON.parse(js).choices?.[0]?.delta?.content || '';
                                    if (c) {
                                        aiText += c;
                                        // Throttle : max 1 update / 400ms pour éviter 'Maximum update depth exceeded'
                                        const now = Date.now();
                                        if (now - lastUpdate > 400) {
                                            lastUpdate = now;
                                            let disp = aiText
                                                .replace(/\[TABLE_SIGNES\]/gi, (signTableBlock && !hasStudyVarTable) ? `\n\n${signTableBlock}\n\n` : '')
                                                .replace(/\[TABLE_VARIATIONS\]/gi, variationTableBlock ? `\n\n${variationTableBlock}\n\n` : '');
                                            const fixedDisp = patchMarkdownTables(fixLatexContent(header + disp).content);
                                            requestAnimationFrame(() => {
                                                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fixedDisp }; return u; });
                                            });
                                        }
                                    }
                                } catch { }
                            }
                        }
                        let finalText = aiText
                            .replace(/\[TABLE_SIGNES\]/gi, (signTableBlock && !hasStudyVarTable) ? `\n\n${signTableBlock}\n\n` : '')
                            .replace(/\[TABLE_VARIATIONS\]/gi, variationTableBlock ? `\n\n${variationTableBlock}\n\n` : '');
                        if (tableOfValues && !finalText.includes('| x | f(x) |')) {
                            finalText += '\n\n**Tableau de valeurs :**\n\n' + tableOfValues;
                        }
                        // Toujours ajouter le graphe pour un exercice sur une fonction
                        // (même si pas de question 'graph' explicite dans l'OCR)
                        try {
                            const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
                            const prettyName = exprClean
                                .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                                .replace(/\blog\(/g, 'ln(')
                                .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                                .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
                            const gs = {
                                curves: [{ id: 'curve-0', expression: exprClean, name: `f(x) = ${prettyName}`, color: GRAPH_COLORS[0], interval: [-10, 10] as [number, number] }],
                                intersections: [] as any[], positionsRelatives: [] as any[], tangent: null,
                                title: `Courbe de f(x) = ${prettyName}`,
                            };
                            localStorage.setItem('graphState', JSON.stringify(gs));
                            try {
                                const bch = new BroadcastChannel('mimimaths-graph');
                                bch.postMessage({ type: 'UPDATE_GRAPH', state: gs }); bch.close();
                            } catch { /* ignore */ }
                            console.log(`[ExerciceMode] 📊 graphState stocké pour ${exprClean}`);
                        } catch { /* ignore */ }
                        finalText += '\n\n---\n\n📊 Clique sur le bouton ci-dessous pour voir la courbe.';
                        finalText = stripDdx(finalText);
                        const finalContent = patchMarkdownTables(fixLatexContent(header + finalText).content);
                        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: finalContent }; return u; });
                    } catch (error) {
                        console.error('[ExerciceMode] Erreur streaming:', error);
                    } finally {
                        setLoading(false);
                        setIsTalking(false);
                    }
                    return;
                }
            } catch (err) {
                console.warn('[ExerciceMode] Erreur, fallback standard:', err);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // HANDLER "ÉTUDIER UNE FONCTION" (auto-génère les sous-questions BO)
        // Programme Éducation Nationale : domaine → parité → limites → dérivée → variations → courbe
        // ═══════════════════════════════════════════════════════════
        const wantsStudyFunction = /(?:étudier?|etudie)\s+(?:la\s+)?(?:fonction\s+)?(?:[fghk]|cette\s+fonction)/i.test(inputLower)
            || /(?:étude\s+(?:complète|de\s+la\s+fonction))/i.test(inputLower);

        if (wantsStudyFunction && !isMultiExpr) {
            try {
                // Extraire l'expression
                let studyExpr = '';
                const eqMatch = inputCleaned.match(/(?:[fghk]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s*$|\.)/i);
                if (eqMatch) studyExpr = eqMatch[1].trim()
                    .replace(/[.!?]+$/, '')
                    .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                    .trim();
                if (!studyExpr) {
                    const deMatch = inputCleaned.match(/=\s*(.+)/);
                    if (deMatch) studyExpr = deMatch[1].split('\n')[0].trim()
                        .replace(/[.!?]+$/, '')
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                        .trim();
                }
                if (studyExpr && studyExpr.includes('x')) {
                    // Construire l'input avec sous-questions numérotées
                    const niveau = resolveNiveau(inputText);
                    const isTerminale = niveau.startsWith('terminale');

                    let generatedInput = `f(x) = ${studyExpr}\n`;
                    let qNum = 1;
                    generatedInput += `${qNum}. Déterminer le domaine de définition de f.\n`; qNum++;
                    generatedInput += `${qNum}. Étudier la parité de f.\n`; qNum++;
                    if (isTerminale) {
                        generatedInput += `${qNum}. Déterminer les limites de f aux bornes de son domaine de définition.\n`; qNum++;
                    }
                    generatedInput += `${qNum}. Calculer la fonction dérivée de f et étudier son signe.\n`; qNum++;
                    generatedInput += `${qNum}. Dresser le tableau de variations de f.\n`; qNum++;
                    generatedInput += `${qNum}. Tracer la courbe représentative de f.\n`;

                    console.log('[ÉtudeFunction] Auto-généré:', generatedInput);
                    // Relancer handleSendMessageWithText avec les sous-questions auto-générées
                    await handleSendMessageWithText(generatedInput, newMessages);
                    return;
                }
            } catch (err) {
                console.warn('[ÉtudeFunction] Erreur, fallback:', err);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // HANDLER "CALCULER UNE DÉRIVÉE EXACTE" (Module Dérivation)
        // ═══════════════════════════════════════════════════════════
        const wantsDerivative = /(?:calculer?|donne-?moi|calcule|déterminer?|determiner?|quelle\s+est|trouve[rz]?)\s+(?:la\s+)?(?:dérivée?|derivée?)\s*(?:de|du|d'un|d'une|des)?\s*(?:[fghk]|cette|l'expression|la\s+fonction|trin[ôo]me|polyn[ôo]me|quotient|produit|fraction)/i.test(inputLower)
            || /(?:c'est\s+quoi\s+la\s+dérivée|quelle\s+est\s+la\s+dérivée)/i.test(inputLower)
            || /^[fghk]'\s*\(\s*x\s*\)/i.test(inputLower);

        // Bloquer si c'est une étude complète ou un tableau (les autres handlers s'en chargent)
        if (wantsDerivative && !wantsStudyFunction && !wantsVariationTable && !wantsSignTable && !isMultiExpr) {
            let expr = '';
            const eqMatch = inputCleaned.match(/(?:[fghk]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s*$|\.)/i);
            if (eqMatch) expr = eqMatch[1].split(/[?!]/)[0].trim();
            if (!expr) {
                let extract = inputCleaned.replace(/.*(?:dérivée?)\s+(?:de\s+(?:la\s+fonction\s+)?)?(?:[fghk]\s*\(\s*x\s*\)\s*=\s*)?/i, '');
                extract = extract.split(/[?!]/)[0];
                expr = extract.replace(/^(?:=\s*)/, '').trim();
            }

            // Nettoyage classique
            expr = expr.replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                       .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                       .replace(/\.\s+[A-ZÀ-Ÿa-zà-ÿ].+$/s, '')
                       .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');

            if (expr && expr.includes('x') && expr.length > 1) {
                console.log(`[MathEngine] 🎯 Module dérivation strict déclenché pour: "${expr}"`);
                try {
                    const engineRes = await fetch('/api/math-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'derivative', expression: expr, niveau: resolveNiveau(inputText) }),
                    });
                    const engineData = await engineRes.json();
                    if (engineData.success && engineData.aiContext) {
                        // ANTI-REGRESSION: JSON purge empêche les rôles 'user' consécutifs qui faisaient planter l'API Anthropic.
                        const enrichedMessages: ChatMessage[] = JSON.parse(JSON.stringify(newMessages));
                        if (enrichedMessages.length > 0) {
                            enrichedMessages[enrichedMessages.length - 1].content += `\n\n[INSTRUCTIONS CACHÉES DU SYSTÈME AUTOMATIQUE DE MATHS]\n${engineData.aiContext}`;
                        }

                        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                        setLoading(true);
                        setIsTalking(true);
                        const response = await fetch('/api/perplexity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                        });
                        
                        if (!response.ok) throw new Error(`Erreur API deriv (HTTP ${response.status})`);
                        const reader = response.body?.getReader();
                        if (!reader) throw new Error('Reader non disponible');
                        const decoder = new TextDecoder();
                        let aiText = '';
                        let lastUpdate = 0;
                        let lineBuffer = '';
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            lineBuffer += decoder.decode(value, { stream: true });
                            const lines = lineBuffer.split('\n');
                            lineBuffer = lines.pop() || '';
                            for (const line of lines) {
                                if (!line.startsWith('data: ')) continue;
                                const jsonStr = line.substring(6);
                                if (jsonStr === '[DONE]') break;
                                try {
                                    const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                                    if (c) {
                                        aiText += c;
                                        const now = Date.now();
                                        if (now - lastUpdate > 250) {
                                            lastUpdate = now;
                                            const fixedClean = fixLatexContent(aiText).content;
                                            setMessages(prev => {
                                                const u = [...prev];
                                                u[u.length - 1] = { role: 'assistant', content: fixedClean };
                                                return u;
                                            });
                                        }
                                    }
                                } catch { }
                            }
                        }
                        const finalFixed = fixLatexContent(aiText).content;
                        setMessages(prev => {
                            const u = [...prev];
                            u[u.length - 1] = { role: 'assistant', content: finalFixed };
                            return u;
                        });
                        setLoading(false);
                        setIsTalking(false);
                        return;
                    } else if (!engineData.success) {
                        console.warn('[MathEngine] Module dérivation: API a retourné success=false:', engineData.error);
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `Désolé, le moteur de calcul formel est actuellement en cours de démarrage ou semble surchargé (délai d'attente dépassé). Veuillez patienter une vingtaine de secondes et réessayer pour calculer la dérivée exacte de $${expr}$.`
                        }]);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn('[MathEngine] Erreur module dérivation, fallback IA:', err);
                }
            }
        }

        if (wantsSignTable && !isMultiExpr) {
            let expr = '';
            // Match '= ...' only if it's not part of an inequality (<=, >=, !=, etc.)
            const eqMatch = inputCleaned.match(/(?<![><≤≥!])=\s*(.+)/);
            if (eqMatch) expr = eqMatch[1].trim();
            // Si expr ne contient pas 'x' (ex: matché sur '= 0'), on invalide cette extraction basique
            if (!expr || !expr.includes('x')) {
                // ─── Extraction 1 : retirer tout ce qui précède et inclut "signes/variations de" ───
                let extract = inputCleaned.replace(/.*(?:signes?|variations?|l'expression|la fonction|l'étude)\s+(?:de|du|d'un|d'une|des?)\s+(?:(?:trin[ôo]mes?|polyn[ôo]mes?|produit|quotient|fonction|fraction(?: rationnelle)?|expression)\s*(?:suivante?|ci-dessous)?\s*:?\s*)?/i, '');

                // ─── Extraction 2 : fallback — chercher après "de f(x)" ou "du" ───
                if (extract === inputCleaned) {
                    // ⚠️ On exige [fghk](x) pour éviter de capturer "signes de (-2x+4)..."
                    const deMatch = inputCleaned.match(/(?:de|du)\s+(?:[fghk]\s*\(\s*x\s*\)\s*=?\s*)(.+)/i);
                    if (deMatch) extract = deMatch[1].trim();
                }

                // ─── Extraction 3 : fallback final — chercher la première expression mathématique ───
                // Si extract contient encore des mots français (signes, tableau, moi, etc.) c'est qu'on
                // n'a pas réussi à extraire proprement → on cherche la 1ère parenthèse ou suite math
                const hasFrenchWords = /\b(?:signes?|tableau|donne|moi|calcule?|résous|étudier?|l[ae]|les?|mon|trouve|dresse|faire|donner|montrer|pour|avec|selon|trouve)\b/i.test(extract);
                if (hasFrenchWords || extract === inputCleaned) {
                    // Chercher la 1ère sous-chaîne qui commence par (, chiffre, x, e^, ln, log, exp, sqrt ou -
                    // et contient x (donc c'est une expression mathématique)
                    const mathMatch = extract.match(/([-(]?\s*(?:[2-9]|\d+\.?\d*|x|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);
                    if (mathMatch && mathMatch[1].includes('x')) {
                        // Affiner : chercher spécifiquement après le dernier "de " suivi d'une expression
                        const lastDeMatch = inputCleaned.match(/(?:^|\s)de\s+((?:[-(]|\d)[^a-zA-ZÀ-ÿ,;.]{0}[\s\S]+)$/i);
                        if (lastDeMatch && lastDeMatch[1].includes('x')) {
                            extract = lastDeMatch[1].trim();
                        } else {
                            extract = mathMatch[1].trim();
                        }
                    }
                }

            expr = extract.replace(/^(?:(?:[fghkP]\s*\(\s*x\s*\)|y)\s*=?\s*)/i, '').trim();
            }
            
            // Sécurité anti- "polynôme suivant :" restant
            expr = expr.replace(/^(?:le\s+|ce\s+)?(?:trin[ôo]mes?|polyn[ôo]mes?|produits?|quotients?|fonctions?|fractions?|expressions?)\s*(?:suivante?|ci-dessous)?\s*:?\s*/i, '');

            expr = expr
                .replace(/\$/g, '')
                .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                // Retirer toute inéquation ou équation à droite (ex: > 0, = 0, <= 1, ≥ 0)
                .replace(/\s*(?:>|<|>=|<=|=|≥|≤)\s*.*$/, '')
                .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
                .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                // Exposants Unicode superscript → notation ^
                .replace(/⁰/g, '^0').replace(/¹/g, '^1').replace(/⁵/g, '^5')
                .replace(/⁶/g, '^6').replace(/⁷/g, '^7').replace(/⁸/g, '^8').replace(/⁹/g, '^9')
                // Exponentielle : eˣ, e^x, e**x → exp(x) pour SymPy
                .replace(/e\s*ˣ/g, 'exp(x)')           // eˣ (U+02E3 superscript x)
                .replace(/e\s*\*\*\s*x/gi, 'exp(x)')   // e**x
                .replace(/e\s*\^\s*x/gi, 'exp(x)')     // e^x
                .replace(/e\s*\^\s*\(([^)]+)\)/gi, 'exp($1)')  // e^(u) → exp(u)
                // Racines : √, ∛, ∜ → sqrt, cbrt pour SymPy
                .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')     // √(expr) → sqrt(expr)
                .replace(/√\s*([a-zA-Z0-9]+)/g, 'sqrt($1)')  // √x → sqrt(x)
                .replace(/∛\s*\(([^)]+)\)/g, 'cbrt($1)')     // ∛(expr) → cbrt(expr)
                .replace(/∛\s*([a-zA-Z0-9]+)/g, 'cbrt($1)')  // ∛x → cbrt(x)
                .replace(/∜\s*\(([^)]+)\)/g, '($1)^(1/4)')   // ∜(expr)
                // Logarithme : ln, Ln, Log → log (SymPy: log = logarithme naturel)
                .replace(/\bLn\s*\(/g, 'log(')
                .replace(/\bLog\s*\(/g, 'log(')
                .replace(/\bln\s*\(/g, 'log(')

                // Retirer les domaines de définition (sur ℝ, sur R, sur ]a;b[, etc.)
                .replace(/\s+sur\s+ℝ\s*\.?\s*$/i, '')
                .replace(/\s+sur\s+[Rr]\s*\.?\s*$/i, '')
                .replace(/\s+sur\s+[\[\]].+$/i, '')    // sur ]0 ; +∞[, sur [a ; b], etc.
                .replace(/\s+pour\s+tout\s+x\s*\.?\s*$/i, '')
                .replace(/\s+∀\s*x\s*\.?\s*$/i, '')
                .replace(/\s+x\s*[∈∊]\s*ℝ\s*\.?\s*$/i, '')
                // Retirer les contraintes de domaine : "pour x ≠ 0", "(x ≠ 0)", ", x ≠ 0", "x ≠ k"
                // ⚠️ Ordre : la règle large "pour x ..." d'abord, ensuite le symbole seul
                .replace(/\s+pour\s+x\s*[^=].{0,20}$/i, '')            // "pour x ≠ 0", "pour x > 0"
                .replace(/\s*,?\s*\(?\s*x\s*≠\s*\d*\s*\)?\s*$/g, '')    // ", x ≠ 0" résiduel
                .replace(/\s+pour\s*$/i, '')                            // "pour" résiduel seul
                // Stopper brut à n'importe quel point d'interrogation ou d'exclamation
                .split(/[?!]/)[0]
                .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                .replace(/\.\s+[A-ZÀ-Ÿa-zà-ÿ].+$/s, '')
                .replace(/\s*s'?il\s*(?:te|vous)\s*pla[îi]t\b/gi, '')
                .replace(/\s*s(?:tp|vp)\b/gi, '')
                .replace(/\s*merci\b/gi, '')
                .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');



            if (expr && expr.includes('x') && expr.length > 1) {
                console.log(`[MathEngine] 🎯 Tableau de signes pour: "${expr}"`);
                try {
                    const engineRes = await fetch('/api/math-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'sign_table', expression: expr, niveau: resolveNiveau(inputText) }),
                    });
                    const engineData = await engineRes.json();
                    if (engineData.success && engineData.aaaBlock) {
                        const tableBlock = engineData.aaaBlock;
                        console.log(`[MathEngine] ✅ Injection directe du tableau SymPy`);
                        // ANTI-REGRESSION: JSON purge empêche les rôles 'user' consécutifs qui faisaient planter l'API Anthropic.
                        const enrichedMessages: ChatMessage[] = JSON.parse(JSON.stringify(newMessages));
                        if (enrichedMessages.length > 0) {
                            enrichedMessages[enrichedMessages.length - 1].content += '\n\n' + (() => {
                                const parts: string[] = [];
                                parts.push(`[INSTRUCTIONS CACHÉES DU SYSTÈME AUTOMATIQUE DE MATHS] ⚠️ Le tableau de signes de f(x) = ${expr} est DÉJÀ AFFICHÉ au-dessus. NE GÉNÈRE AUCUN tableau.`);
                                parts.push(`\n**VOICI LE TABLEAU EXACT GÉNÉRÉ PAR LE MOTEUR (blocs @@@) :**\n${tableBlock}\n`);

                                    // Factorisation SymPy
                                    let factorizationStr = '';
                                    if (engineData.factors?.length) {
                                        const numFactors = engineData.factors.filter((f: any) => f.type === 'numerator').map((f: any) => f.label);
                                        const denFactors = engineData.factors.filter((f: any) => f.type === 'denominator').map((f: any) => f.label);
                                        const constPart = engineData.effectiveConst && Math.abs(engineData.effectiveConst - 1) > 1e-10 && Math.abs(engineData.effectiveConst + 1) > 1e-10
                                            ? `${engineData.effectiveConst} × ` : '';
                                        if (numFactors.length > 0) {
                                            factorizationStr = `${constPart}${numFactors.map((f: string) => `(${f})`).join(' × ')}`;
                                            // Ne l'appeler "FACTORISATION" que s'il y a vraiment plusieurs facteurs
                                            if (numFactors.length > 1 || constPart) {
                                                parts.push(`\n📌 FORME À UTILISER : f(x) = ${factorizationStr}`);
                                            }
                                        }
                                        if (denFactors.length > 0) {
                                            parts.push(`📌 DÉNOMINATEUR : ${denFactors.map((f: string) => `(${f})`).join(' × ')}`);
                                        }
                                    }

                                    // INTERDICTION EXPLICITE
                                    parts.push(`\n⛔⛔⛔ INTERDICTIONS ABSOLUES ⛔⛔⛔`);
                                    parts.push(`- NE FACTORISE JAMAIS LES TRINÔMES pour faire un tableau ! (ex: on n'utilise jamais (x-1)(x+1) pour faire deux lignes dans un tableau, on garde la ligne x²-1).`);
                                    parts.push(`- NE DESSINE STRICTEMENT AUCUN TABLEAU (pas de markdown genre |x|...|, pas de LaTeX, pas de tirets). Le tableau est déjà codé dans l'application et s'affiche au-dessus de ta réponse !`);
                                    parts.push(`- Ne donne QU'UNE SEULE ET UNIQUE méthode de résolution (celle avec le discriminant si c'est un degré 2). Il est STRICTEMENT INTERDIT de proposer une seconde méthode (ni racines évidentes, ni factorisation).`);

                                    // Étapes discriminant Δ
                                    if (engineData.discriminantSteps?.length) {
                                        parts.push(`\n📐 MÉTHODE DU DISCRIMINANT OBLIGATOIRE pour l'explication :`);
                                        parts.push(`⚠️ INTERDICTION STRICTE DE FACTORISER DAVANTAGE CES TRINÔMES (pas d'identités remarquables) ! Garde le trinôme entier et étudie son signe avec le signe de 'a'.`);
                                        for (const s of engineData.discriminantSteps) {
                                            parts.push(`\n▸ Pour le facteur ${s.factor} :`);
                                            for (const step of s.steps) {
                                                parts.push(`  ${step}`);
                                            }
                                        }
                                    }

                                    if (engineData.fxValues && engineData.fxValues.length > 0) {
                                        parts.push(`\n📌 **AIDE INFAILLIBLE FOURNIE PAR LE SYSTÈME** 📌`);
                                        parts.push(`Le système a calculé formellement les signes de f(x) sur les intervalles séparés par les racines (de gauche à droite) :`);
                                        
                                        const xMatch = (engineData.aaaBlock || '').match(/x:\s*([^|]+)/);
                                        const xStr = xMatch ? xMatch[1].trim() : '';
                                        const xArr = xStr ? xStr.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
                                        
                                        if (xArr.length >= 2 && engineData.fxValues.length === 2 * xArr.length - 3) {
                                            for (let i = 0; i < xArr.length - 1; i++) {
                                                const left = xArr[i];
                                                const right = xArr[i + 1];
                                                const sign = engineData.fxValues[2 * i];
                                                parts.push(`- Sur l'intervalle ]${left}; ${right}[ : l'expression est de signe ${sign}`);
                                                if (i < xArr.length - 2) {
                                                    const ptSign = engineData.fxValues[2 * i + 1];
                                                    parts.push(`- En x = ${right} : l'expression vaut ${ptSign === '||' ? 'NON DÉFINIE (||)' : ptSign}`);
                                                }
                                            }
                                        } else {
                                            // Fallback
                                            if (xArr.length > 0) parts.push(`- Valeurs de x : ${xArr.join(' ; ')}`);
                                            parts.push(`- Signes successifs de f(x) : ${engineData.fxValues.join(' puis ')}`);
                                        }
                                        parts.push(`Tu DOIS ABSOLUMENT te calquer sur ces signes pour justifier le résultat et trouver l'ensemble de solutions S, ne propose pas une autre méthode.`);
                                    }

                                    parts.push(`\n**CONCLUSION ATTENDUE :**`);
                                    if (inputText.match(/>|<|≥|≤|>=|<=/)) {
                                        parts.push(`Avant de donner la solution, TU DOIS IMPÉRATIVEMENT prendre le temps de lister chaque intervalle du tableau avec son signe correspondant (ex: Sur ]-inf, 2[, f(x) est -). C'est crucial pour ne pas te tromper.`);
                                        parts.push(`Ensuite seulement, déduis logiquement la solution finale et termine par LA SOLUTION EXACTE de l'inéquation en tapant : **S = ...**`);
                                    } else if (inputText.match(/(?:équa|equation|résoud|solution)/i)) {
                                        parts.push(`Termine simplement par l'ensemble exact des solutions de l'équation en tapant : S = { ... }`);
                                    } else {
                                        parts.push(`⛔ NE DONNE SURTOUT PAS d'ensemble de solution S=... à la fin ! On t'a simplement demandé le tableau ou l'étude de signe, pas de résoudre une inéquation.`);
                                    }

                                    return parts.join('\n');
                                })();
                        }
                        const tablePrefix = tableBlock + '\n\n';
                        // AJOUTER un nouveau message assistant (pas remplacer !)
                        setMessages(prev => [...prev, { role: 'assistant', content: tablePrefix }]);

                        setLoading(true);
                        setIsTalking(true);
                        try {
                            console.log('[DEBUG PROMPT IA COMPLET]:', JSON.stringify(enrichedMessages, null, 2));
                            const response = await fetch('/api/perplexity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                            });
                            if (!response.ok) {
                                let errMsg = `Erreur API sign_table (HTTP ${response.status})`;
                                try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
                                console.error('[SignTable] /api/perplexity error:', errMsg);
                                throw new Error(errMsg);
                            }
                            const reader = response.body?.getReader();
                            if (!reader) throw new Error('Reader non disponible');
                            const decoder = new TextDecoder();
                            let aiText = '';
                            let lastSignUpdate = 0;
                            let lineBuffer = ''; // Buffer pour les lignes incomplètes
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                lineBuffer += decoder.decode(value, { stream: true });
                                const lines = lineBuffer.split('\n');
                                lineBuffer = lines.pop() || ''; // Garder la dernière ligne incomplète
                                for (const line of lines) {
                                    if (!line.startsWith('data: ')) continue;
                                    const jsonStr = line.substring(6);
                                    if (jsonStr === '[DONE]') break;
                                    try {
                                        const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                                        if (c) {
                                            aiText += c;
                                            // Throttle : max 1 update / 250ms pour éviter 'Maximum update depth exceeded'
                                            const now = Date.now();
                                            if (now - lastSignUpdate > 250) {
                                                lastSignUpdate = now;
                                                const clean = aiText
                                                    .replace(/@@@[\s\S]*?@@@/g, '')
                                                    .replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, '')
                                                    .replace(/\|(?:[^|\n]*(?:x|signe|variations?|f\(x\))[^|\n]*)\|[^\n]*(?:\n|$)(?:\|[^\n]*(?:\n|$))*/gi, '');
                                                const fixedClean = patchMarkdownTables(fixLatexContent(tablePrefix + clean).content);
                                                setMessages(prev => {
                                                    const u = [...prev];
                                                    u[u.length - 1] = { role: 'assistant', content: fixedClean };
                                                    return u;
                                                });
                                            }
                                        }
                                    } catch { }
                                }
                            }
                            const cleanFinal = aiText
                                .replace(/@@@[\s\S]*?@@@/g, '')
                                .replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, '')  // Supprimer tableaux LaTeX générés par l'IA
                                .replace(/\|(?:[^|\n]*(?:x|signe|variations?|f\(x\))[^|\n]*)\|[^\n]*(?:\n|$)(?:\|[^\n]*(?:\n|$))*/gi, '');  // Supprimer tableaux markdown de signes
                            const finalContent = patchMarkdownTables(fixLatexContent(tablePrefix + cleanFinal).content);
                            setMessages(prev => {
                                const u = [...prev];
                                u[u.length - 1] = { role: 'assistant', content: finalContent };
                                return u;
                            });
                        } catch (error) {
                            console.error('Erreur streaming:', error);
                        } finally {
                            setLoading(false);
                            setIsTalking(false);
                        }
                        return; // OBLIGATOIRE : stoppe l'exécution pour ne pas retomber dans le fallback !
                    }
                } catch (err) {
                    console.warn('[MathEngine] Erreur module dérivation, fallback IA:', err);
                }
            }
        }

        // ── INTERCEPTION TABLEAU DE VARIATIONS (expression unique) ──
        if (wantsVariationTable && !isMultiExpr) {
            let expr = '';
            // Match '= ...' only if it's not part of an inequality
            const eqMatch = inputCleaned.match(/(?<![><≤≥!])=\s*(.+)/);
            if (eqMatch) expr = eqMatch[1].trim();
            if (!expr || !expr.includes('x')) {
                let extract = inputCleaned.replace(/.*(?:variations?|l'étude|la fonction)\s+(?:de|du|d'un|d'une|des?)\s+(?:(?:trinôme|polynôme|produit|quotient|fonction|fraction(?: rationnelle)?|expression)\s*(?:suivante?|ci-dessous)?\s*:?\s*)?/i, '');
                
                const deMatch = extract.match(/(?:de|du)\s+(?:[fghk]\s*\(x\)\s*)?(.+)/i);
                if (deMatch) expr = deMatch[1].trim().replace(/^=\s*/, '');
                else expr = extract;
            }
            expr = expr
                .replace(/\$/g, '')
                .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                .replace(/\s*(?:>|<|>=|<=|=|≥|≤)\s*.*$/, '')
                .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
                .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                // Exposants Unicode superscript → notation ^
                .replace(/⁰/g, '^0').replace(/¹/g, '^1').replace(/⁵/g, '^5')
                .replace(/⁶/g, '^6').replace(/⁷/g, '^7').replace(/⁸/g, '^8').replace(/⁹/g, '^9')
                // Exponentielle : eˣ, e^x → exp(x) pour le moteur
                .replace(/e\s*ˣ/g, 'exp(x)')
                .replace(/e\s*\*\*\s*x/gi, 'exp(x)')
                .replace(/e\s*\^\s*x/gi, 'exp(x)')
                .replace(/e\s*\^\s*\(([^)]+)\)/gi, 'exp($1)')
                // Racines
                .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
                .replace(/√\s*([a-zA-Z0-9]+)/g, 'sqrt($1)')
                // Logarithme
                .replace(/\bLn\s*\(/g, 'log(').replace(/\bLog\s*\(/g, 'log(').replace(/\bln\s*\(/g, 'log(')
                // Retirer les domaines de définition (sur ℝ, sur R, sur ]a;b[, etc.)
                .replace(/\s+sur\s+ℝ\s*\.?\s*$/i, '')
                .replace(/\s+sur\s+[Rr]\s*\.?\s*$/i, '')
                .replace(/\s+sur\s+(?:l(?:'|’|e\s+|a\s+|les\s+)?intervalles?\s*)?(?:ℝ|[Rr]|[\[\]I]).*$/i, '')
                .replace(/\s+pour\s+tout\s+x\s*\.?\s*$/i, '')
                .replace(/\s+∀\s*x\s*\.?\s*$/i, '')
                // Retirer les contraintes de domaine : "pour x ≠ 0", "(x ≠ 0)", ", x ≠ 0"
                // ⚠️ Ordre : la règle large "pour x ..." d'abord, ensuite le symbole seul
                .replace(/\s+pour\s+x\s*[^=].{0,20}$/i, '')            // "pour x ≠ 0", "pour x > 0"
                .replace(/\s*,?\s*\(?\s*x\s*≠\s*\d*\s*\)?\s*$/g, '')    // ", x ≠ 0" résiduel
                .replace(/\s+pour\s*$/i, '')                            // "pour" résiduel seul
                // Stopper brut à n'importe quel point d'interrogation ou d'exclamation
                .split(/[?!]/)[0]
                // Retirer le texte français résiduel (virgule + mot courant, point + phrase)
                .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                // Retirer instructions en langage naturel
                .replace(/\.\s+[A-ZÀ-Ÿa-zà-ÿ].+$/s, '')
                .replace(/\s+(?:et|puis)\s+(?:trace|dedui|dresse|calcule|donne|determi|represent).+$/i, '')
                .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');


            let vOptions: any = {};
            const intMatch = inputCleaned.match(/\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]/);
            if (intMatch) {
                vOptions.searchDomain = [parseFloat(intMatch[1]), parseFloat(intMatch[2])];
            }

            const inputNormV = inputLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const wantsGraphAlongWithTable = (
                /\btrace\b|\btracer\b|\btrace\b|\bdessine\b|\bdessin\b/i.test(inputNormV)
                || /\bcourbe\b|\bgraphe\b|\bgraphique\b|\bplot\b/i.test(inputNormV)
                || /represent/i.test(inputNormV)
                || /visualise|affiche|montre/i.test(inputNormV)
            ) && !/\b(triangle|rectangle|carr[eé]|polygone|cercle|droite(?!\s+d)|segment|demi-droite|vecteur|angle|médiatrice|bissectrice|hauteur|médiane|parallèle|perpendiculaire)\b/i.test(inputLower);

            if (expr && expr.includes('x') && expr.length > 1) {
                console.log(`[MathEngine] 🎯 Tableau de variations pour: "${expr}"`);

                if (wantsGraphAlongWithTable) {
                    try {
                        const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
                        const prettyName = expr
                            .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                            .replace(/\blog\(/g, 'ln(')
                            .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                            .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
                        const gs = {
                            curves: [{ id: 'curve-0', expression: expr, name: `f(x) = ${prettyName}`, color: GRAPH_COLORS[0], interval: vOptions.searchDomain || [-10, 10] }],
                            intersections: [] as any[], positionsRelatives: [] as any[], tangent: null,
                            title: `f(x) = ${prettyName}`,
                        };
                        localStorage.setItem('graphState', JSON.stringify(gs));
                        const bch = new BroadcastChannel('mimimaths-graph');
                        bch.postMessage({ type: 'UPDATE_GRAPH', state: gs }); bch.close();
                        try { window.open('/graph', 'mimimaths-graph', 'width=1100,height=700,menubar=no,toolbar=no'); } catch {}
                    } catch (e) {}
                }

                try {
                    const engineRes = await fetch('/api/math-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            type: 'variation_table', 
                            expression: expr, 
                            niveau: resolveNiveau(inputText),
                            options: vOptions
                        }),
                    });
                    const engineData = await engineRes.json();
                    if (engineData.success && engineData.aaaBlock) {
                        const tableBlock = engineData.aaaBlock;
                        console.log(`[MathEngine] ✅ Injection directe du tableau de variations`);
                        // ANTI-REGRESSION: JSON purge empêche les rôles 'user' consécutifs qui faisaient planter l'API Anthropic.
                        const enrichedMessages: ChatMessage[] = JSON.parse(JSON.stringify(newMessages));
                        if (enrichedMessages.length > 0) {
                            enrichedMessages[enrichedMessages.length - 1].content += `\n\n[INSTRUCTIONS CACHÉES DU SYSTÈME AUTOMATIQUE DE MATHS] Le tableau de variations de f(x) = ${expr} est DÉJÀ affiché au-dessus. ⛔ NE REPRODUIS PAS le tableau (ni en @@@, ni en texte, ni en markdown, ni en ASCII). Fais UNIQUEMENT les explications pédagogiques des étapes.\n${engineData.aiContext || 'Explique les étapes de l\'étude des variations sans refaire le tableau.'}`;
                        }
                        const tablePrefix = tableBlock + '\n\n';
                        setMessages(prev => [...prev, { role: 'assistant', content: tablePrefix }]);

                        setLoading(true);
                        setIsTalking(true);
                        try {
                            const response = await fetch('/api/perplexity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                            });
                            if (!response.ok) {
                                let errMsg = `Erreur API variation_table (HTTP ${response.status})`;
                                try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
                                console.error('[VarTable] /api/perplexity error:', errMsg);
                                throw new Error(errMsg);
                            }
                            const reader = response.body?.getReader();
                            if (!reader) throw new Error('Reader non disponible');
                            const decoder = new TextDecoder();
                            let aiText = '';
                            let lastVarUpdate = 0;
                            let lineBuffer = ''; // Buffer pour les lignes incomplètes
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                lineBuffer += decoder.decode(value, { stream: true });
                                const lines = lineBuffer.split('\n');
                                lineBuffer = lines.pop() || ''; // Garder la dernière ligne incomplète
                                for (const line of lines) {
                                    if (!line.startsWith('data: ')) continue;
                                    const jsonStr = line.substring(6);
                                    if (jsonStr === '[DONE]') break;
                                    try {
                                        const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                                        if (c) {
                                            aiText += c;
                                            // Throttle : max 1 update / 200ms pour éviter 'Maximum update depth exceeded'
                                            const now = Date.now();
                                            if (now - lastVarUpdate > 200) {
                                                lastVarUpdate = now;
                                                const clean = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                                                const fixedClean = fixLatexContent(tablePrefix + clean).content;
                                                setMessages(prev => {
                                                    const u = [...prev];
                                                    u[u.length - 1] = { role: 'assistant', content: fixedClean };
                                                    return u;
                                                });
                                            }
                                        }
                                    } catch { }
                                }
                            }
                            const cleanFinal = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                            const finalContent = patchMarkdownTables(fixLatexContent(tablePrefix + cleanFinal).content);
                            setMessages(prev => {
                                const u = [...prev];
                                u[u.length - 1] = { role: 'assistant', content: finalContent };
                                return u;
                            });
                        } catch (error) {
                            console.error('Erreur streaming:', error);
                        } finally {
                            setLoading(false);
                            setIsTalking(false);
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('[MathEngine] Erreur variation, fallback IA:', err);
                }
            }
        }

        // ── INTERCEPTION TRACÉ DE COURBE / GRAPHIQUE ──
        // Vocabulaire officiel BO Éducation Nationale (Seconde → Terminale)
        // On normalise l'input pour supprimer les accents (évite les problèmes d'encodage é/è/ê)
        const inputNorm = inputLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const wantsGraph = (
            /\btrace\b|\btracer\b|\btrace\b|\bdessine\b|\bdessin\b/i.test(inputNorm)
            || /\bcourbe\b|\bgraphe\b|\bgraphique\b|\bplot\b/i.test(inputNorm)
            || /represent/i.test(inputNorm)  // représente, représentation (sans accent)
            || /visualise|affiche|montre/i.test(inputNorm)
            || /lecture\s+graphique/i.test(inputNorm)
        ) && !/signe|variation/i.test(inputNorm)
            // Exclure les demandes géométriques pour éviter un double traitement
            && !/\b(triangle|rectangle|carr[eé]|polygone|cercle|droite(?!\s+d)|segment|demi-droite|vecteur|angle|médiatrice|bissectrice|hauteur|médiane|parallèle|perpendiculaire)\b/i.test(inputLower);
        const wantsAddCurve = (
            // Mots-clés explicites : "ajoute", "rajoute", "superpose"
            (/ajoute|rajoute|superpose/i.test(inputNorm) && /courbe|fonction|graph|f\s*\(|g\s*\(|h\s*\(/i.test(inputNorm))
            // "sur ce graphe", "sur le même graphe/graphique", "sur le graphique"
            || /sur\s+(ce|le\s+meme|le)\s+(graph|graphe|graphique)/i.test(inputNorm)
            // "aussi", "en plus", "également" + tracé
            || (/aussi|en\s+plus|egalement/i.test(inputNorm) && /trace|dessine/i.test(inputNorm))
            // "et trace", "et dessine" (début de phrase ou après virgule)
            || /(?:,|et)\s+(?:trace|dessine)/i.test(inputNorm)
        );
        const wantsIntersection = /intersection|se\s+coup|crois|point\s*commun/i.test(inputNorm);
        const wantsResolve = /resou|resolution|resoudre/i.test(inputNorm)
            && /graphi|graphement|graphique|graphiquement|courbe/i.test(inputNorm);
        const wantsTangente = /tangente|tangent/i.test(inputNorm)
            && !/\b(triangle|rectangle|carr[eé]|polygone|cercle|droite(?!\s+d)|segment|demi-droite|vecteur|angle|médiatrice|bissectrice|hauteur|médiane|parallèle|perpendiculaire)\b/i.test(inputLower);
        const wantsEffacerGraph = /efface.*graph|reset.*graph|nettoie.*graph|efface.*courbe|reset.*courbe/i.test(inputNorm);
        const wantsGraphAction = wantsGraph || wantsAddCurve || wantsIntersection || wantsResolve || wantsTangente || wantsEffacerGraph;

        // ── INTERCEPTION RÉSOLUTION D'ÉQUATION (SymPy direct) ──
        // Détecte "résous ax² + bx + c = 0" et utilise /api/solve (sans graphe)
        // ⚠️ Ne PAS confondre avec "résous graphiquement" → géré par wantsResolve ci-dessus
        const wantsSolveEquation = (
            /resou|calculer?.*equation|trouv.*racine|trouv.*solution|antecedent.*0/i.test(inputNorm)
            && !wantsGraphAction  // Ne pas capturer les demandes graphiques
            && !wantsSignTable
            && !wantsVariationTable
            && !isMultiExpr
            && !/in(?:é|e)quation/i.test(inputNorm)
            && !/[<≤>≥]/.test(inputText) // ⛔ Ne JAMAIS capturer les inéquations ici
            && !/=[^0-9]*[1-9]/i.test(inputText) // Essayer d'éviter "f(x) = 2" si ce n'est pas géré
        );

        if (wantsSolveEquation) {
            // NOTE: on matche sur inputNorm (sans accents) pour gerer 'Résous' -> 'resous'.
            // On extrait ensuite depuis inputText pour garder les ²/³/⁴.
            let rawEq = '';

            // Pattern 1 : "resous 2x² = 8x - 6"
            const m1 = inputNorm.match(/resou\w*\s+(.+?)\s*$/im);
            if (m1 && m1[1]) {
                const normIdx = inputNorm.indexOf(m1[1]);
                if (normIdx >= 0) {
                    const eqFromText = inputText.slice(normIdx, normIdx + m1[1].length).trim();
                    if (eqFromText.includes('=')) rawEq = eqFromText;
                }
                if (!rawEq && m1[1].includes('=')) rawEq = m1[1].trim();
            }

            // Pattern 2 : "trouve les solutions de ..."
            if (!rawEq) {
                const m2 = inputNorm.match(/(?:solution|racine|resou)[^:]*?(?:de|pour|:)\s*(.+?)\s*$/im);
                if (m2 && m2[1]) {
                    const normIdx = inputNorm.indexOf(m2[1]);
                    if (normIdx >= 0) {
                        const eqFromText = inputText.slice(normIdx, normIdx + m2[1].length).trim();
                        if (eqFromText.includes('=')) rawEq = eqFromText;
                    }
                    if (!rawEq && m2[1].includes('=')) rawEq = m2[1].trim();
                }
            }

            // Pattern 3 : toute expression avec "=" dans inputText (garde les ²/³)
            if (!rawEq) {
                const m3 = inputText.match(/([\w²³⁴][\w\s²³⁴^+\-*/(),.]*=[\w\s²³⁴^+\-*/(),.]+)/);
                if (m3 && m3[1] && m3[1].includes('=')) rawEq = m3[1].trim();
            }

            // Fallback final
            if (!rawEq) {
                const mFb = inputText.match(/([\w²³⁴][\w\s²³⁴^+\-*/().]*=[\w\s²³⁴^+\-*/().]+)/);
                if (mFb) rawEq = mFb[1].trim();
            }

            // Nettoyage de l'équation : retirer les mots français
            let cleanEq = rawEq
                .replace(/\$/g, '')
                .replace(/(?:l['’]\s*)?(?:é|e)quations?/gi, '')
                .replace(/(?:l['’]\s*)?(?:in(?:é|e)quations?)/gi, '')
                .replace(/(?:l['’]\s*)?expressions?/gi, '')
                .replace(/(?:le\s+|ce\s+)?polyn[ôo]mes?/gi, '')
                .replace(/(?:le\s+|ce\s+)?trin[ôo]mes?/gi, '')
                .replace(/de\s+degré\s+\d+/gi, '')
                .replace(/:\s*/g, '')
                .replace(/\s*s'?il\s*(?:te|vous)\s*pla[îi]t\b/gi, '')
                .replace(/\s*s(?:tp|vp)\b/gi, '')
                .replace(/\s*merci\b/gi, '')
                // On supprime toute ponctuation de fin de phrase ou parenthèse fermante résiduelle
                .replace(/[\s,;:!?.\\)"\]]+$/, '')
                .trim();
            
            // Retirer des prefixes textuels eventuels (Ex: 'la ' dans 'la x^2 = 0')
            cleanEq = cleanEq.replace(/^([a-zA-ZÀ-ÿ]{2,}\s+)+/i, '');
            // Retirer les résidus textuels à la fin (ex: mots isolés sans variable)
            cleanEq = cleanEq.replace(/(?:\s+[a-zA-ZÀ-ÿ]{2,})+\s*$/i, '');
            // Strip any remaining formatting
            cleanEq = cleanEq.replace(/[\s,;]+$/, '').trim();

            // Nettoyer l'équation pour l'API SymPy
            const sympifyEq = cleanEq
                .replace(/²/g, '**2').replace(/³/g, '**3').replace(/⁴/g, '**4')
                .replace(/\^/g, '**')
                .replace(/(\d),(\d)/g, '$1.$2')   // virgule decimale francaise : 0,5 → 0.5
                .replace(/(\d)([xX])/g, '$1*$2')
                .replace(/[fghk]\s*\(x\)\s*=\s*/gi, '')
                .replace(/\s+/g, '')
                .replace(/[−]/g, '-')
                .trim();


            if (sympifyEq && sympifyEq.includes('=') && sympifyEq.includes('x')) {
                const solveNiveau = resolveNiveau(inputText);
                console.log(`[Solve] 🔢 Résolution équation: "${sympifyEq}" niveau=${solveNiveau}`);

                // Injecter un bloc @@@ solve directement dans le message affiché
                const solveBlock = `@@@\nsolve\nequation: ${sympifyEq}\nniveau: ${solveNiveau}\n@@@`;
                const introText = `Je résous cette équation via le moteur SymPy.\n\n`;
                setMessages(prev => [...prev, { role: 'assistant', content: introText + solveBlock }]);

                setLoading(false);
                setIsTalking(false);
                return;
            }
        }

        if (wantsGraphAction) {
            try {
                // ── Fonctions utilitaires ──
                const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];

                // Extraction de l'intervalle
                let gInterval: [number, number] = [-10, 10];
                const intMatch = inputText.match(/\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]/);
                if (intMatch) gInterval = [parseFloat(intMatch[1]), parseFloat(intMatch[2])];
                const intMatch2 = inputText.match(/(?:entre|de)\s+([+-]?\d+(?:\.\d+)?)\s+(?:et|à)\s+([+-]?\d+(?:\.\d+)?)/i);
                if (intMatch2) gInterval = [parseFloat(intMatch2[1]), parseFloat(intMatch2[2])];

                // Formater une expression mathjs en notation lisible (pour affichage)
                const prettifyMath = (expr: string): string => {
                    return expr
                        // sqrt(expr) → √(expr)
                        .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                        .replace(/\bsqrt\b/g, '√')
                        // log(x) → ln(x) en notation française
                        .replace(/\blog\(/g, 'ln(')
                        // e^(x) → eˣ — on laisse e^(...) pour lisibilité
                        // Puissances : ^2 → ², ^3 → ³, ^4 → ⁴
                        .replace(/\^2(?![0-9])/g, '²')
                        .replace(/\^3(?![0-9])/g, '³')
                        .replace(/\^4(?![0-9])/g, '⁴')
                        // Multiplication : * → ×
                        .replace(/\*/g, '×')
                        // pi → π
                        .replace(/\bpi\b/g, 'π')
                        // Espaces autour des opérateurs
                        .replace(/([^\s])([+\-])/g, '$1 $2')
                        .replace(/([+\-])([^\s])/g, '$1 $2')
                        // Nettoyage doubles espaces
                        .replace(/\s+/g, ' ').trim();
                };

                // Nettoyage d'expression commun (LaTeX, Unicode, français → mathjs)
                const cleanExpr = (e: string) => {
                    let c = e
                        .replace(/\$/g, '')
                        // Retirer f(x)=, g(x)=, y= etc.
                        .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                        .replace(/^\s*y\s*=\s*/i, '')
                        // LaTeX : \frac{a}{b} → (a)/(b)
                        .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
                        // LaTeX : \sqrt{expr} → sqrt(expr)
                        .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
                        .replace(/\\sqrt\s+(\w+)/g, 'sqrt($1)')
                        // LaTeX : \left( \right) → ( )
                        .replace(/\\left\s*[([]/g, '(').replace(/\\right\s*[)\]]/g, ')')
                        // LaTeX : \cdot \times → *
                        .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
                        // LaTeX : \text{...} → contenu
                        .replace(/\\text\s*\{([^}]*)\}/g, '$1')
                        // LaTeX : backslashes restants
                        .replace(/\\[,;:!]\s*/g, ' ')
                        .replace(/\\quad/g, ' ').replace(/\\qquad/g, ' ')
                        // Unicode : ², ³
                        .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                        // Symboles
                        .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/')
                        // Multiplications implicites
                        .replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2')
                        .replace(/([xX])\s*([a-zA-Z(])/g, '$1*$2')
                        .replace(/\)\s*([a-zA-Z(])/g, ')*$1')
                        // Français : racine carrée de → sqrt
                        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?\(([^)]+)\)/gi, 'sqrt($1)')
                        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)')
                        // Valeur absolue
                        .replace(/\|([^|]+)\|/g, 'abs($1)')
                        // ln → log pour mathjs
                        .replace(/\bln\s*\(/g, 'log(')
                        // exp(x) → e^(x)
                        .replace(/\bexp\s*\(/g, 'e^(')
                        // Ponctuation finale
                        .replace(/\s+$/g, '').replace(/[.!?]+$/g, '')
                        .trim();
                    return c;
                };

                // Charger l'état précédent du graphe
                let graphState: any = { curves: [], intersections: [], positionsRelatives: [], tangent: null, title: '' };
                try {
                    const stored = localStorage.getItem('graphState');
                    if (stored) graphState = JSON.parse(stored);
                } catch { /* ignore */ }

                // ═══════════════════════════════════════════════════════
                // CAS 0 : EFFACER LE GRAPHIQUE
                // ═══════════════════════════════════════════════════════
                if (wantsEffacerGraph) {
                    graphState = { curves: [], intersections: [], positionsRelatives: [], tangent: null, title: '' };
                    localStorage.setItem('graphState', JSON.stringify(graphState));
                    const ch = new BroadcastChannel('mimimaths-graph');
                    ch.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                    ch.close();
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `🗑️ Graphique effacé ! Tu peux tracer une nouvelle courbe.`
                    }]);
                    return;
                }

                // ═══════════════════════════════════════════════════════
                // CAS 1 : RÉSOLUTION GRAPHIQUE (équation / inéquation)
                // ═══════════════════════════════════════════════════════
                if (wantsResolve) {
                    // Chercher le pattern : expr1 OPERATOR expr2
                    const ops = ['>=', '<=', '≥', '≤', '>', '<', '='] as const;
                    const opMap: Record<string, string> = { '>=': '≥', '<=': '≤', '≥': '≥', '≤': '≤', '>': '>', '<': '<', '=': '=' };
                    let lhs = '', rhs = '', operator = '=';

                    // Retirer le préfixe "résous graphiquement" etc.
                    let mathPart = inputText
                        .replace(/résou\w*\s*(?:graphiquement\s*)?/i, '')
                        .replace(/résolution\s*(?:graphique\s*)?(?:de\s*)?/i, '')
                        .replace(/\s+sur\s+\[.*$/i, '')  // retirer l'intervalle
                        .replace(/\s+entre\s+.*$/i, '')
                        .replace(/\s+pour\s+.*$/i, '')
                        .trim();

                    // Chercher l'opérateur
                    for (const op of ops) {
                        const idx = mathPart.indexOf(op);
                        if (idx > 0) {
                            lhs = cleanExpr(mathPart.substring(0, idx));
                            rhs = cleanExpr(mathPart.substring(idx + op.length));
                            operator = opMap[op] || '=';
                            break;
                        }
                    }

                    if (lhs && lhs.includes('x')) {
                        // Si rhs pas d'expression, c'est une constante
                        if (!rhs) rhs = '0';

                        // Construire le graphState avec 2 courbes
                        const rhsIsConst = !rhs.includes('x');
                        graphState = {
                            curves: [
                                {
                                    id: 'curve-0',
                                    expression: lhs,
                                    name: `f(x) = ${prettifyMath(lhs)}`,
                                    color: GRAPH_COLORS[0],
                                    interval: gInterval,
                                },
                                {
                                    id: 'curve-1',
                                    expression: rhs.includes('x') ? rhs : rhs,
                                    name: rhsIsConst ? `y = ${rhs}` : `g(x) = ${prettifyMath(rhs)}`,
                                    color: GRAPH_COLORS[1],
                                    interval: gInterval,
                                }
                            ],
                            intersections: '__COMPUTE__',  // Signal pour calculer les intersections
                            positionsRelatives: [],
                            tangent: null,
                            title: `Résolution : ${lhs} ${operator} ${rhs}`,
                        };

                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `🔍 **Résolution graphique** de \`${lhs} ${operator} ${rhs}\` sur [${gInterval[0]}, ${gInterval[1]}]. Regarde la fenêtre graphique !`
                        }]);
                    } else {
                        // Pas d'expression parsable → fallback IA
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 2 : TANGENTE
                // ═══════════════════════════════════════════════════════
                else if (wantsTangente) {
                    // Extraire le point x0
                    let x0: number | null = null;
                    const x0Match = inputText.match(/(?:en\s+)?x\s*=\s*([+-]?\d+(?:\.\d+)?)/i);
                    if (x0Match) x0 = parseFloat(x0Match[1]);
                    else {
                        const x0Match2 = inputText.match(/en\s+([+-]?\d+(?:\.\d+)?)/i);
                        if (x0Match2) x0 = parseFloat(x0Match2[1]);
                    }

                    // Extraire l'expression (si fournie)
                    let tangExpr = '';
                    const tangEqMatch = inputText.match(/(?:tangente\s+(?:de\s+|à\s+)?)?(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s+en\s|$)/i);
                    if (tangEqMatch) tangExpr = cleanExpr(tangEqMatch[1]);
                    if (!tangExpr) {
                        const tangVerbMatch = inputText.match(/tangente\s+(?:de\s+|à\s+)?(.+?)(?:\s+en\s|$)/i);
                        if (tangVerbMatch) tangExpr = cleanExpr(tangVerbMatch[1]);
                    }

                    // Si pas d'expression, utiliser la dernière courbe
                    if (!tangExpr && graphState.curves.length > 0) {
                        tangExpr = graphState.curves[graphState.curves.length - 1].expression;
                    }

                    if (!tangExpr || !tangExpr.includes('x')) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ Quelle fonction ? Dis par exemple : « tangente de x² en x = 2 »`
                        }]);
                        return;
                    }

                    if (x0 === null) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ En quel point ? Dis par exemple : « tangente en x = 2 »`
                        }]);
                        return;
                    }

                    // Calculer la tangente numériquement (f'(x0) par différence finie)
                    try {
                        const { compile } = await import('mathjs');
                        const sanitize = (e: string) => e.replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bln\b/g, 'log');
                        const compiled = compile(sanitize(tangExpr));
                        const evalF = (xv: number) => {
                            try { const r = compiled.evaluate({ x: xv }); return typeof r === 'number' && isFinite(r) ? r : null; } catch { return null; }
                        };

                        const y0 = evalF(x0);
                        const h = 1e-7;
                        const yPlus = evalF(x0 + h);
                        const yMinus = evalF(x0 - h);

                        if (y0 !== null && yPlus !== null && yMinus !== null) {
                            const slope = (yPlus - yMinus) / (2 * h);
                            const slopeRound = Math.round(slope * 10000) / 10000;
                            const y0Round = Math.round(y0 * 10000) / 10000;
                            const interceptRound = Math.round((y0 - slope * x0) * 10000) / 10000;

                            // S'assurer que la courbe est tracée
                            if (!graphState.curves.some((c: any) => c.expression === tangExpr)) {
                                graphState = {
                                    curves: [{
                                        id: 'curve-0',
                                        expression: tangExpr,
                                        name: `f(x) = ${prettifyMath(tangExpr)}`,
                                        color: GRAPH_COLORS[0],
                                        interval: gInterval,
                                    }],
                                    intersections: [],
                                    positionsRelatives: [],
                                    tangent: null,
                                    title: `f(x) = ${prettifyMath(tangExpr)}`,
                                };
                            }

                            graphState.tangent = {
                                x0,
                                y0: y0Round,
                                slope: slopeRound,
                                equation: `T(x) = ${slopeRound}x + ${interceptRound}`,
                                interval: gInterval,
                            };
                            graphState.title = `Tangente à f(x) = ${tangExpr} en x = ${x0}`;

                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `📐 **Tangente** à f(x) = ${tangExpr} en x = ${x0} :\n\n- f(${x0}) = ${y0Round}\n- f'(${x0}) ≈ ${slopeRound}\n- **T(x) = ${slopeRound}x + ${interceptRound}**\n\nRegarde la fenêtre graphique !`
                            }]);
                        } else {
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `❌ Impossible de calculer la tangente en x = ${x0}. La fonction n'est peut-être pas définie en ce point.`
                            }]);
                            return;
                        }
                    } catch (err) {
                        console.warn('[Tangente] Erreur calcul:', err);
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 3 : INTERSECTION (courbes déjà tracées)
                // ═══════════════════════════════════════════════════════
                else if (wantsIntersection) {
                    if (graphState.curves.length >= 2) {
                        graphState.intersections = '__COMPUTE__';
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `📊 Recherche des intersections entre ${graphState.curves.map((c: any) => c.name).join(' et ')}. Regarde la fenêtre graphique !`
                        }]);
                    } else {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ Il faut au moins 2 courbes tracées pour chercher une intersection. Trace d'abord une courbe, puis ajoute-en une autre !`
                        }]);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 4 : TRACER / AJOUTER UNE COURBE
                // ═══════════════════════════════════════════════════════
                else {
                    // Extraire potentiellement plusieurs expressions séparées par 'et', ','
                    // On part de inputText pour retrouver tous les "f(x) = ..."
                    const exprMatches = [...inputText.matchAll(/(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*([^,;]+?(?=\s+et\s+|\s+ou\s+|\s*(?:sur|pour|entre|dans)\s|\s*$))/gi)];
                    
                    let gExprs: { name: string, expr: string }[] = [];

                    if (exprMatches.length > 0) {
                        gExprs = exprMatches.map((m, idx) => {
                            // m[0] = "f(x) = x^2", m[1] = "x^2"
                            const nameMatch = m[0].match(/([fghFGH])/i);
                            const name = nameMatch ? nameMatch[1].toLowerCase() : `f${idx+1}`;
                            return { name, expr: cleanExpr(m[1].trim()) };
                        });
                    } else {
                        // Fallback simple ou verbes
                        let gExpr = '';
                        const gEqMatch = inputText.match(/(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s+(?:sur|pour|entre|de\s+-?\d)\s|$)/);
                        if (gEqMatch) gExpr = gEqMatch[1].trim();
                        if (!gExpr) {
                            const gVerbMatch = inputText.match(
                                /(?:trace|tracer|dessine|ajoute|rajoute|repr[eé]sente|visualise|affiche|montre)\s+(?:(?:la\s+)?(?:courbe\s+(?:repr[eé]sentative\s+)?|repr[eé]sentation\s+graphique\s+|fonction\s+|graphe\s+|graphique\s+)?(?:de\s+)?)?(.+?)(?:\s+(?:sur|pour|entre|dans)\s|$)/i
                            );
                            if (gVerbMatch) {
                                gExpr = gVerbMatch[1].trim()
                                    .replace(/^(?:de\s+)?(?:[fgh]\s*\(x\)\s*=\s*)/, '')
                                    .replace(/[.!?]+$/, '');
                            }
                        }
                        gExpr = cleanExpr(gExpr);
                        if (gExpr) {
                            const nameMatch = inputText.match(/([fghFGH])\s*\(\s*x\s*\)/);
                            gExprs.push({ name: nameMatch ? nameMatch[1] : (wantsAddCurve ? 'g' : 'f'), expr: gExpr });
                        }
                    }

                    // Ne garder que les expressions qui contiennent au moins 'x' ou sont des nombres/constantes mathématiques
                    gExprs = gExprs.filter(g => g.expr && (g.expr.includes('x') || /^[\d\s+\-*/()eπ.]+$/.test(g.expr)));

                    if (gExprs.length > 0) {
                        if (wantsAddCurve && graphState.curves.length > 0) {
                            // AJOUTER des courbes
                            for (const {name, expr} of gExprs) {
                                const idx = graphState.curves.length;
                                graphState.curves.push({
                                    id: `curve-${idx}`,
                                    expression: expr,
                                    name: `${name}(x) = ${prettifyMath(expr)}`,
                                    color: GRAPH_COLORS[idx % GRAPH_COLORS.length],
                                    interval: gInterval,
                                });
                            }
                            graphState.title = 'Graphique multi-courbes';
                            graphState.intersections = graphState.curves.length >= 2 ? '__COMPUTE__' : [];
                            graphState.tangent = null;
                            const action = 'ajoutée' + (gExprs.length > 1 ? 's' : '');
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `📊 Courbe(s) ${action} : **${gExprs.map(g => `${g.name}(x) = ${prettifyMath(g.expr)}`).join(', ')}** sur [${gInterval[0]}, ${gInterval[1]}]. Regarde la fenêtre graphique !`
                            }]);
                        } else {
                            // TRACER une ou plusieurs nouvelles courbes (efface les précédentes)
                            graphState = {
                                curves: gExprs.map((g, i) => ({
                                    id: `curve-${i}`,
                                    expression: g.expr,
                                    name: `${g.name}(x) = ${prettifyMath(g.expr)}`,
                                    color: GRAPH_COLORS[i % GRAPH_COLORS.length],
                                    interval: gInterval,
                                })),
                                intersections: gExprs.length >= 2 ? '__COMPUTE__' : [],
                                positionsRelatives: [],
                                tangent: null,
                                title: gExprs.length > 1 ? 'Graphique multi-courbes' : `${gExprs[0].name}(x) = ${prettifyMath(gExprs[0].expr)}`,
                            };
                            const action = 'tracée' + (gExprs.length > 1 ? 's' : '');
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `📊 Courbe(s) ${action} : **${gExprs.map(g => `${g.name}(x) = ${prettifyMath(g.expr)}`).join(', ')}** sur [${gInterval[0]}, ${gInterval[1]}]. Regarde la fenêtre graphique !`
                            }]);
                        }
                    } else {
                        // Pas d'expression trouvée → laisser l'IA gérer
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // ENVOI AU GRAPHIQUE + IA
                // ═══════════════════════════════════════════════════════
                localStorage.setItem('graphState', JSON.stringify(graphState));
                const graphChannel = new BroadcastChannel('mimimaths-graph');
                graphChannel.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                graphChannel.close();

                // Ouvrir la fenêtre si pas déjà ouverte
                const graphWin = window.open('/graph', 'mimimaths-graph', 'width=1100,height=700,menubar=no,toolbar=no');
                if (graphWin) {
                    setTimeout(() => {
                        const ch = new BroadcastChannel('mimimaths-graph');
                        ch.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                        ch.close();
                    }, 500);
                }

                // Demander à l'IA d'expliquer
                const curvesDesc = graphState.curves.map((c: any) => c.name).join(', ');
                let aiSystemPrompt = `[SYSTÈME] Un graphique a été ouvert dans une fenêtre séparée avec ${curvesDesc}. Ne génère AUCUN graphique toi-même.`;

                if (wantsResolve) {
                    aiSystemPrompt += ` Explique la résolution graphique : comment lire les solutions sur le graphique, méthode de résolution, ensemble solution.`;
                } else if (wantsTangente && graphState.tangent) {
                    aiSystemPrompt += ` La tangente ${graphState.tangent.equation} a été tracée en x=${graphState.tangent.x0}. Explique le calcul de la tangente : dérivée, coefficient directeur, ordonnée à l'origine.`;
                } else {
                    aiSystemPrompt += ` Explique brièvement la/les fonction(s) tracée(s) : domaine, comportement, points remarquables.`;
                }

                const graphPrompt: ChatMessage[] = [
                    ...newMessages,
                    { role: 'user' as const, content: aiSystemPrompt }
                ];
                await startStreamingResponse(graphPrompt);
                return;
            } catch (err) {
                console.warn('[Graph] Erreur, fallback IA:', err);
            }
        }


        // ═══════════════════════════════════════════════════════════
        // HANDLER GÉOMÉTRIE DYNAMIQUE — /geometre
        // Détecte les demandes de tracé géométrique et ouvre/met à jour
        // la fenêtre /geometre via BroadcastChannel + sessionStorage.
        // ═══════════════════════════════════════════════════════════
        const wantsGeometry = (
            /\b(triangle|rectangle|carr[eé]|polygone|cercle|droite|segment|demi-droite|vecteur|angle)\b/i.test(inputLower)
            || /\b(constru|trac[eé]|repr[eé]sente|dessine|place)\b.*\b(point|figure|géo|geo)\b/i.test(inputLower)
            || /\b(figure géo|figure géométrique|construction géométrique|médiatrice|bissectrice|hauteur|médiane)\b/i.test(inputLower)
            || /\b[A-Z]\s*\(\s*-?\d/.test(inputText) // Coordonnées A(x,y) ou A(x; y)

        ) && !/\bfonction\b|\btableau?\b|\bsigne\b|\bvariation\b|\bdérivée?\b/i.test(inputLower);

        if (wantsGeometry) {
            try {
                const GEO_CHANNEL = 'mimimaths-geometre';

                // Prompt système pour guider l'IA à produire le bloc geo
                // Détecter si c'est un SUIVI (ajouter/modifier) ou une NOUVELLE figure
                const isFollowUp = /\b(ajoute|place|mets|rajoute|prolonge|trace\s+la\s+droite|trace\s+le\s+segment|perpendiculaire|parallèle|parallele|médiatrice|bissectrice|hauteur\s+issue|sur\s+la\s+figure|sur\s+le\s+segment|sur\s+le\s+cercle|sur\s+\[)/i.test(inputText);

                // Récupérer la scène précédente UNIQUEMENT si c'est un suivi
                let previousGeoBlock = '';
                if (isFollowUp) {
                    try {
                        const keys = Object.keys(localStorage).filter(k => k.startsWith('geo_scene_')).sort();
                        if (keys.length > 0) {
                            const lastScene = JSON.parse(localStorage.getItem(keys[keys.length - 1]) || '{}');
                            if (lastScene.raw) previousGeoBlock = lastScene.raw;
                        }
                    } catch { /* ignore */ }
                } else {
                    // Nouvelle figure → purger les anciennes scènes
                    try {
                        Object.keys(localStorage)
                            .filter(k => k.startsWith('geo_scene_'))
                            .forEach(k => localStorage.removeItem(k));
                    } catch { /* ignore */ }
                }

                const previousContext = previousGeoBlock
                    ? `\n\n⛔⛔⛔ SCÈNE EXISTANTE — TU DOIS REPRENDRE INTÉGRALEMENT TOUS CES OBJETS ⛔⛔⛔
@@@
${previousGeoBlock}
@@@
⛔ COPIE D'ABORD TOUS les points, segments, droites, cercles ci-dessus dans ton nouveau bloc.
⛔ ENSUITE ajoute les nouveaux éléments demandés par l'élève.
⛔ Si tu oublies un seul objet de la scène existante, la figure sera CASSÉE !`
                    : '';

                const geoSystemPrompt = `[SYSTÈME GÉOMÉTRIE] L'élève demande une figure géométrique.
${previousGeoBlock ? '⚠️ UNE FIGURE EXISTE DÉJÀ. Tu dois la CONSERVER et y AJOUTER les nouveaux éléments.' : ''}
Tu DOIS répondre avec UN SEUL bloc @@@...@@@ au format suivant :

@@@
geo
title: [titre de la figure]
point: A, [x], [y]
point: B, [x], [y]
[...autres points...]
segment: AB
[...ou: droite: AB | cercle: O, r | triangle: A, B, C | vecteur: AB | angle: A,B,C | angle_droit: A,B,C]
parallele: P, AB
perpendiculaire: P, AB
compute: distance AB
compute: milieu AB
@@@

Puis explique la figure pédagogiquement.

⛔ RÈGLE ABSOLUE : Tu DOIS TOUJOURS déclarer chaque point avec ses coordonnées (point: X, x, y) AVANT de l'utiliser dans un segment, triangle, etc. 
⛔ Si l'élève ne donne PAS les coordonnées, TU choisis des coordonnées adaptées pour que la figure soit lisible.
⛔ Exemple : "trace un triangle ABC" → TU calcules des coordonnées : A(0,0), B(4,0), C(2,3)

⚠️ NOTATION FRANÇAISE DES COORDONNÉES :
- L'élève écrit souvent A(4; 5) avec un POINT-VIRGULE — interprète-le comme x=4, y=5.
- Dans ton bloc geo, utilise TOUJOURS la virgule : point: A, 4, 5  (jamais de ; dans le bloc).

⚠️ MÉDIATRICE d'un segment [AB] :
  mediatrice: A, B [, label]
  (le moteur calcule le milieu M, la droite perpendiculaire ET le ⊾ automatiquement)
  ⛔ N'utilise PAS perpendiculaire: + point: M séparément — utilise mediatrice:.
  ⚠️ IMPORTANT : Si l'élève demande les médiatrices d'un triangle, TU dois aussi déclarer le triangle (triangle: A, B, C).
    Les médiatrices seules ne tracent pas les côtés !


⚠️ CERCLES SPÉCIAUX — Utilise TOUJOURS les commandes déterministes (le moteur calcule tout) :

🔵 CERCLE INSCRIT dans un triangle ABC :
  cercle_inscrit: A, B, C
  (le moteur calcule l'incentre I et le rayon r automatiquement — ⛔ NE calcule RIEN toi-même)

🟠 CERCLE CIRCONSCRIT d'un triangle ABC :
  cercle_circonscrit: A, B, C
  (le moteur calcule le circumcentre O et le rayon R automatiquement — ⛔ NE calcule RIEN toi-même)

⛔ INTERDIT : calculer Ox, Oy, Ix, Iy, R, r toi-même — tu ferais des erreurs ! Utilise uniquement les commandes ci-dessus.

RÈGLES STRICTES SUR LE REPÈRE :
- ✅ Mettre "repere: orthonormal" UNIQUEMENT si l'élève lui-même mentionne un repère, ou si la demande est de nature analytique (équation de droite, vecteur avec coordonnées, produit scalaire).
- ✅ Mettre "repere: orthonormal" si l'élève donne des coordonnées explicites dans SA question (ex: "place A(2;3) et B(5;1)").
- ❌ NE PAS mettre repere: orthonormal si c'est TOI qui choisis les coordonnées pour dessiner la figure (c'est le cas le plus fréquent).
- ❌ NE PAS mettre repere si l'élève demande une figure purement géométrique : "trace un triangle", "trace un cercle", "trace la médiatrice", "perpendiculaire à AB", etc.
- ❌ NE PAS mettre repere si les coordonnées ne sont que des supports internes pour le tracé SVG — les élèves ne les voient pas.
- Utilise UNIQUEMENT des coordonnées entières ou demi-entières (ex: 0, 1, 2, 0.5)
- Le bloc @@@ DOIT commencer par "geo" sur la première ligne
- Respecte les conventions EN France : [AB] pour segments, (d) pour droites, [AB) pour demi-droites
- Pour un angle droit, utilise angle_droit: [premier bras], [sommet], [deuxième bras]
- Adapte le domain si les coordonnées sortent de [-8,8]
- ⛔ NE GÉNÈRE QU'UN SEUL bloc @@@...@@@. Jamais deux blocs @@@ dans la même réponse.
- ⛔ NE génère AUCUN autre graphique (ni @@@graph, ni @@@figure). Seulement le bloc geo.
- ⚠️ Quand on place un point sur un segment SANS position précise (ex: "un point N sur [AB]"), NE le place PAS au milieu ! Place-le à environ 1/3 ou 2/5 du segment pour que la figure soit réaliste et non trompeuse (l'élève pourrait croire que c'est le milieu).
${previousContext}

EXEMPLE pour "trace la droite (d) passant par N parallèle à (BC)" :
@@@
geo
title: Triangle avec parallèle et perpendiculaire
point: A, 0, 0
point: B, 4, 0
point: C, 2, 3
point: N, 1.5, 0
segment: AB
segment: BC
segment: CA
parallele: N, BC, (d)
perpendiculaire: C, d, (T)
@@@

⛔⛔ COMMANDES AUTOMATIQUES (le moteur calcule TOUT) :
- "parallele: N, BC" → droite parallèle à (BC) passant par N, label par défaut (d)
- "parallele: N, BC, (d1)" → même chose avec label (d1)
- "perpendiculaire: C, d" → droite perpendiculaire à la droite (d) passant par C
- "perpendiculaire: C, d, (Δ)" → même chose avec label (Δ)
- "perpendiculaire: C, BC, (T)" → droite perpendiculaire à (BC) passant par C, label (T)

⛔ Tu NE dois JAMAIS calculer toi-même un 2e point pour tracer une parallèle ou perpendiculaire !
⛔ Utilise TOUJOURS les commandes parallele: / perpendiculaire: — le moteur calcule les directions exactes.
⛔ Si tu utilises "droite:" pour une parallèle ou perpendiculaire, la figure sera FAUSSE !


⚠️ ANGLES DROITS :
- Pour marquer un angle droit (90°), utilise OBLIGATOIREMENT : angle_droit: Point1, Sommet, Point2
  ex : si le triangle est rectangle en A, tu dois écrire : angle_droit: B, A, C
- ⛔ N'utilise PAS "angle: A, B, C" pour un angle droit — ça afficherait un arc, pas un carré !
- Le rendu affiche le symbole ⊾ (petit carré) à l'angle droit, comme en géométrie classique.
- Utilise angle_droit: chaque fois que tu traces une perpendiculaire, une hauteur ou un triangle rectangle.

- Pour nommer une droite, utilise le 3e argument : parallele: N, BC, (d) ou perpendiculaire: C, d, (Δ)
- L'élève tape "delta" au clavier → TU convertis en symbole : (Δ). Idem : "delta'" → (Δ')
- Conversions obligatoires : delta → Δ, gamma → Γ, alpha → α, beta → β
- Pour référencer une droite existante, utilise le label COURT : "d" pour (d), et "d" pour (Δ) aussi (le moteur comprend les alias delta/d/Δ)

⚠️ TANGENTE À UN CERCLE :
- Pour tracer une tangente à un cercle en un point M, commence par définir le segment du rayon (ex: segment: OM), puis trace la perpendiculaire à ce rayon passant par M (ex: perpendiculaire: M, OM, (T)).

La figure s'ouvrira automatiquement dans la fenêtre géomètre.`;

                const geoMessages: ChatMessage[] = [
                    ...newMessages,
                    { role: 'user' as const, content: geoSystemPrompt }
                ];

                // ⚠️ OUVRIR LA FENÊTRE ICI (dans le contexte du clic utilisateur)
                // Sinon le navigateur bloque le popup car window.open est appelé
                // depuis une boucle async de streaming.
                const sceneKey = `geo_scene_${Date.now()}`;
                let geoWin: Window | null = null;
                try {
                    // Réutiliser la fenêtre existante si elle est encore ouverte
                    if (_geoWindowRef && !_geoWindowRef.closed) {
                        geoWin = _geoWindowRef;
                        geoWin.focus();
                    } else {
                        // Ouvrir une nouvelle fenêtre
                        geoWin = window.open(`/geometre?key=${sceneKey}`, 'mimimaths-geometre',
                            'width=1000,height=720,menubar=no,toolbar=no,resizable=yes');
                        _geoWindowRef = geoWin;
                    }
                } catch { /* ignore */ }

                // Streaming : on capte le bloc @@@ geo dès qu'il arrive
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                setLoading(true);
                setIsTalking(true);

                const response = await fetch('/api/perplexity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: geoMessages, context: baseContext }),
                });

                if (!response.ok) {
                    let errMsg = `Erreur API géométrie (HTTP ${response.status})`;
                    try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
                    console.error('[Geo] /api/perplexity error:', errMsg);
                    throw new Error(errMsg);
                }
                const reader = response.body?.getReader();
                if (!reader) throw new Error('Reader indisponible');

                const decoder = new TextDecoder();
                let aiText = '';
                let geoSceneSent = false;
                let filteredGeoBlock = ''; // bloc geo post-traité (repère corrigé) pour affichage inline
                let lastGeoUpdate = 0;
                let lineBuffer = ''; // Buffer pour les lignes incomplètes

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop() || ''; // Garder la dernière ligne incomplète
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const jsonStr = line.substring(6);
                        if (jsonStr === '[DONE]') break;
                        try {
                            const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                            if (c) {
                                aiText += c;
                                const now = Date.now();
                                if (now - lastGeoUpdate > 200) {
                                    lastGeoUpdate = now;
                                    // Garder le bloc @@@ dans le message → renderFigure le rend inline
                                    // On sépare le bloc @@@ du texte explicatif pour l'affichage
                                    const geoMatchStream = aiText.match(/@@@[\s\S]*?@@@/);
                                    const textAfterBlock = aiText.replace(/@@@[\s\S]*?@@@/g, '').trim();
                                    const fixedText = fixLatexContent(textAfterBlock).content;
                                    // Si le bloc est complet, le mettre en premier; sinon afficher le texte
                                    const streamContent = geoMatchStream
                                        ? `${geoMatchStream[0]}\n\n${fixedText}`.trim()
                                        : fixedText;
                                    setMessages(prev => {
                                        const u = [...prev];
                                        u[u.length - 1] = { role: 'assistant', content: streamContent };
                                        return u;
                                    });
                                }

                                // Dès qu'on a le bloc geo complet, envoyer à la fenêtre
                                if (!geoSceneSent) {
                                    const geoMatch = aiText.match(/@@@\s*([\s\S]*?)\s*@@@/);
                                    if (geoMatch) {
                                        let block = geoMatch[1].trim();
                                        const firstLine = block.split(/[\n|]/)[0].trim().toLowerCase();
                                        if (firstLine === 'geo' || firstLine.startsWith('geo ')) {
                                            geoSceneSent = true;

                                            // ── POST-TRAITEMENT : fixer les droites manuelles ──
                                            // Si le texte IA mentionne perpendiculaire/parallèle mais
                                            // le bloc utilise "droite:" au lieu des commandes auto,
                                            // convertir automatiquement.
                                            try {
                                                const lowerAI = aiText.toLowerCase();
                                                const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

                                                // Collecter les points déclarés
                                                const declaredPoints = new Set<string>();
                                                for (const l of lines) {
                                                    const pm = l.match(/^point:\s*([A-Z])/i);
                                                    if (pm) declaredPoints.add(pm[1].toUpperCase());
                                                }

                                                // Chercher les droites qui utilisent un point non-déclaré
                                                // (signe que l'IA a calculé manuellement un 2e point)
                                                const fixedLines: string[] = [];
                                                const pointsToRemove = new Set<string>();

                                                for (const l of lines) {
                                                    const droiteMatch = l.match(/^(?:droite|line):\s*([A-Z]),\s*([A-Z][A-Z0-9']*)/i);
                                                    if (droiteMatch) {
                                                        const pt1 = droiteMatch[1].toUpperCase();
                                                        const pt2 = droiteMatch[2].toUpperCase();

                                                        // Chercher les segments existants pour déduire la référence
                                                        const hasPerp = lowerAI.includes('perpendiculaire');
                                                        const hasPara = lowerAI.includes('parallèle') || lowerAI.includes('parallele');

                                                        // Trouver les lignes existantes (segments, paralleles)
                                                        const existingLines = lines.filter(el =>
                                                            /^(?:parallele|parallèle|parallel):/i.test(el)
                                                        );

                                                        if (hasPerp && existingLines.length > 0) {
                                                            // Extraire le label de la dernière droite comme référence
                                                            const lastParallel = existingLines[existingLines.length - 1];
                                                            const labelMatch = lastParallel.match(/,\s*\(([^)]+)\)\s*$/);
                                                            const refLabel = labelMatch ? labelMatch[1] : 'd';

                                                            // Extraire le label de cette droite
                                                            const thisLabelMatch = l.match(/,\s*\(([^)]+)\)\s*$/);
                                                            const thisLabel = thisLabelMatch ? `(${thisLabelMatch[1]})` : '(Δ)';

                                                            fixedLines.push(`perpendiculaire: ${pt1}, ${refLabel}, ${thisLabel}`);
                                                            pointsToRemove.add(pt2); // supprimer le point auxiliaire
                                                            continue;
                                                        }
                                                    }
                                                    fixedLines.push(l);
                                                }

                                                // Supprimer les points auxiliaires créés manuellement par l'IA
                                                if (pointsToRemove.size > 0) {
                                                    block = fixedLines
                                                        .filter(l => {
                                                            const pm = l.match(/^point:\s*([A-Z][A-Z0-9']*)/i);
                                                            return !(pm && pointsToRemove.has(pm[1].toUpperCase()));
                                                        })
                                                        .join('\n');
                                                }
                                            } catch { /* ignore post-processing errors */ }

                                            // ── POST-TRAITEMENT déterministe : type de repère ──
                                            // On détecte ce que l'élève veut depuis SA question,
                                            // puis on impose le bon type dans le bloc (indépendamment de l'IA).
                                            const hasCoords = /[A-Z]\s*\(\s*-?\d/.test(inputText); // ex: A(0,0), A(2;3)
                                            const mentionsRepere = /rep[eè]re/i.test(inputText);

                                            let forcedRepere: string | null = null;
                                            if (hasCoords || mentionsRepere) {
                                                // L'élève donne des coords ou mentionne un repère → on affiche les axes
                                                if (/orthogonal(?!\S*normal)/i.test(inputText)) {
                                                    // Repère orthogonal (axes perpendiculaires, unités libres)
                                                    forcedRepere = 'orthogonal';
                                                } else if (/s[eé]cant|oblique|vec\s*[({]|\\vec/i.test(inputText)) {
                                                    // Repère oblique / sécantes / (O, vec u, vec v)
                                                    forcedRepere = 'orthogonal'; // rendu approximatif — TODO: support oblique
                                                } else {
                                                    // Défaut : repère orthonormal
                                                    forcedRepere = 'orthonormal';
                                                }
                                            }
                                            // Appliquer : supprimer toute directive repere: existante puis injecter la bonne
                                            block = block.split('\n').filter(l => !/^\s*rep[eè]re\s*:/i.test(l)).join('\n');
                                            if (forcedRepere) {
                                                // Injecter après la ligne "geo" (1ère ligne du bloc)
                                                const blockLines = block.split('\n');
                                                blockLines.splice(1, 0, `repere: ${forcedRepere}`);
                                                block = blockLines.join('\n');
                                            }
                                            // Mémoriser le bloc filtré pour l'affichage inline
                                            filteredGeoBlock = `@@@\n${block}\n@@@`;

                                            try {
                                                // Stocker dans localStorage (partagé entre fenêtres)
                                                localStorage.setItem(sceneKey, JSON.stringify({ raw: block }));
                                                // Envoyer via BroadcastChannel
                                                const ch = new BroadcastChannel(GEO_CHANNEL);
                                                ch.postMessage({ type: 'UPDATE_GEO', raw: block, key: sceneKey });
                                                ch.close();
                                                // Retries pour s'assurer que la fenêtre reçoit
                                                for (const delay of [500, 1500, 3000]) {
                                                    setTimeout(() => {
                                                        try {
                                                            const ch2 = new BroadcastChannel(GEO_CHANNEL);
                                                            ch2.postMessage({ type: 'UPDATE_GEO', raw: block, key: sceneKey });
                                                            ch2.close();
                                                        } catch { /* ignore */ }
                                                    }, delay);
                                                }
                                            } catch { /* ignore */ }
                                        }
                                    }
                                }
                            }
                        } catch { }
                    }
                }
                console.log('[Router-Geo] while loop ended, aiText length:', aiText.length, 'contains @@@:', aiText.includes('@@@'));

                try {
                    // Garder le bloc @@@geo dans le message final → rendu inline par renderFigure
                    const geoBlockMatch = aiText.match(/@@@[\s\S]*?@@@/);
                    const cleanFinalText = aiText.replace(/@@@[\s\S]*?@@@/g, '').trim();
                    const finalFixed = fixLatexContent(patchMarkdownTables(cleanFinalText)).content;

                    // Appliquer le filtre repère déterministe sur le bloc final
                    // (même logique que dans le streaming, pour garantir la cohérence)
                    let geoBlockDisplay = filteredGeoBlock; // préférer le bloc déjà filtré
                    if (!geoBlockDisplay && geoBlockMatch) {
                        // filteredGeoBlock vide (timing) → filtrer le brut maintenant
                        const rawBlock = geoBlockMatch[0];
                        const innerBlock = rawBlock.replace(/^@@@\s*/, '').replace(/\s*@@@$/, '').trim();
                        const hasCoordsFinal = /[A-Z]\s*\(\s*-?\d/.test(inputText);
                        const mentionsRepereFinal = /rep[eè]re/i.test(inputText);
                        let forcedRepereFinal: string | null = null;
                        if (hasCoordsFinal || mentionsRepereFinal) {
                            if (/orthogonal(?!\S*normal)/i.test(inputText)) forcedRepereFinal = 'orthogonal';
                            else if (/s[eé]cant|oblique|vec\s*[({]|\\vec/i.test(inputText)) forcedRepereFinal = 'orthogonal';
                            else forcedRepereFinal = 'orthonormal';
                        }
                        let filteredInner = innerBlock.split('\n').filter(l => !/^\s*rep[eè]re\s*:/i.test(l)).join('\n');
                        if (forcedRepereFinal) {
                            const lines = filteredInner.split('\n');
                            lines.splice(1, 0, `repere: ${forcedRepereFinal}`);
                            filteredInner = lines.join('\n');
                        }
                        geoBlockDisplay = `@@@\n${filteredInner}\n@@@`;
                    }

                    const finalContent = geoBlockDisplay
                        ? `${geoBlockDisplay}\n\n${finalFixed}`.trim()
                        : finalFixed;
                    console.log('[Router-Geo] geoBlockMatch:', !!geoBlockMatch, 'finalContent starts:', finalContent.slice(0, 60));
                    setMessages(prev => {
                        const u = [...prev];
                        u[u.length - 1] = { role: 'assistant', content: finalContent };
                        return u;
                    });
                } catch (finalErr) {
                    console.error('[Router-Geo] FINAL BLOCK ERROR:', finalErr);
                    // Fallback: show clean text without geo block
                    const cleanFallback = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                    const fixedFallback = fixLatexContent(patchMarkdownTables(cleanFallback)).content;
                    setMessages(prev => {
                        const u = [...prev];
                        u[u.length - 1] = { role: 'assistant', content: fixedFallback };
                        return u;
                    });
                }
                setLoading(false);
                setIsTalking(false);
                return;

            } catch (err) {
                console.warn('[Géométrie] Erreur, fallback IA:', err);
                setLoading(false);
                setIsTalking(false);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // HANDLER ARBRES DE PROBABILITÉS
        // Détecte les demandes d'arbres et injecte un prompt dédié.
        // ═══════════════════════════════════════════════════════════
        const wantsTree = /\b(arbre|arbre\s+pond[eé]r[eé]|arbre\s+de\s+proba|arbre\s+probabilit)/i.test(inputLower);

        if (wantsTree) {
            const treeSystemPrompt = `[SYSTÈME ARBRE DE PROBABILITÉS]
L'élève demande un arbre de probabilités. Tu DOIS inclure un bloc @@@...@@@ au format arbre.

FORMAT OBLIGATOIRE du bloc @@@:
@@@
arbre: [titre de l'arbre]
[chemin avec ->], [probabilité NUMÉRIQUE]
@@@

RÈGLES :
- Première ligne après @@@ : "arbre: Titre"
- NE PAS écrire la ligne "Ω, 1" — la racine Ω est automatique
- Chaque ligne = un chemin complet depuis la racine : A, 0.3 ou A->B, 0.4
- Le chemin utilise -> pour séparer les niveaux : A->B signifie "B sachant A"
- La probabilité DOIT être un NOMBRE (décimal ou fraction) : 0.3, 0.7, 1/3, 2/5
- ⛔⛔ JAMAIS de P(B|A), P(B), P_A(B) comme valeur — uniquement des NOMBRES !
- ⛔⛔ JAMAIS de | (pipe) dans les valeurs — ça casse le parser !
- Si une probabilité est inconnue, écris "?" 
- Pour le complémentaire, utilise la barre Unicode : Ā, B̄ (pas A' ni \\bar{A})
- NE mets PAS de résultats aux feuilles (pas de P(A∩B) = ...)
- La somme des branches d'un même nœud = 1

EXEMPLE pour "arbre avec P(A) = 0.4, P(B|A) = 0.3, P(B|Ā) = 0.5" :
@@@
arbre: Expérience aléatoire
A, 0.4
Ā, 0.6
A->B, 0.3
A->B̄, 0.7
Ā->B, 0.5
Ā->B̄, 0.5
@@@

AUTRE EXEMPLE pour tirage avec remise :
@@@
arbre: Tirage avec remise
R, 3/5
V, 2/5
R->R, 3/5
R->V, 2/5
V->R, 3/5
V->V, 2/5
@@@

⛔ Si tu oublies le bloc @@@ ou que le format est faux, l'arbre ne s'affichera PAS !
⛔ Chaque probabilité doit être un NOMBRE : 0.3, 1/3, 0.7 — JAMAIS P(X), P_A(B), P(B|A) !

Après le bloc @@@, explique brièvement l'arbre et les propriétés utilisées.`;

            const treeMessages: ChatMessage[] = [
                ...newMessages,
                { role: 'user' as const, content: treeSystemPrompt }
            ];
            await startStreamingResponse(treeMessages);
            return;
        }

        // Pas de tableau détecté → flux normal (IA seule)
        await startStreamingResponse(newMessages);

    };

    return { startStreamingResponse, handleSendMessageWithText };
}