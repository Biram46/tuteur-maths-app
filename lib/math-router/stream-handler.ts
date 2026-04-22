import { fixLatexContent } from '@/lib/latex-fixer';
import { patchMarkdownTables, stripDdx } from './math-text-utils';
import type { ChatMessage } from '@/lib/perplexity';
import { MutableRefObject } from 'react';
import type { NiveauLycee } from '@/lib/niveaux';
import { getNiveauInfo } from '@/lib/niveaux';

interface StreamOptions {
    messages: ChatMessage[];
    baseContext?: string;
    niveau?: NiveauLycee | null;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setLoading?: (v: boolean) => void;
    setIsTalking?: (v: boolean) => void;
    isVoiceEnabled?: boolean;
    speechQueue?: MutableRefObject<string[]>;
    processSpeechQueue?: () => void;
    
    // Optional prefixes/suffixes to inject around the AI stream
    prependText?: string;
    appendText?: string;
    
    // If true, the last message in `prev` is REPLACED with the stream.
    // If false, a NEW message is appended.
    replaceLast?: boolean;
    
    // Additional modifiers
    applyStripDdx?: boolean;
    
    // Custom post-process (called on each update and final update)
    postProcess?: (text: string) => string;
}

/**
 * Handles the streaming response from Perplexity API, parsing SSE and updating React state.
 */
export async function streamPerplexityResponse({
    messages,
    baseContext,
    niveau,
    setMessages,
    setLoading,
    setIsTalking,
    isVoiceEnabled,
    speechQueue,
    processSpeechQueue,
    prependText = '',
    appendText = '',
    replaceLast = false,
    applyStripDdx = false,
    postProcess = (t) => t
}: StreamOptions): Promise<void> {
    if (setLoading) setLoading(true);
    if (setIsTalking) setIsTalking(true);

    if (!replaceLast) {
        setMessages(prev => [...prev, { role: 'assistant', content: prependText + '⏳ *En cours...*' }]);
    }

    try {
        // Build context object with level_label for the system prompt
        const contextPayload = niveau
            ? { level_label: getNiveauInfo(niveau).label, raw: baseContext || '' }
            : (baseContext || undefined);

        const response = await fetch('/api/perplexity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, context: contextPayload }),
        });

        if (!response.ok) {
            let errMsg = `Erreur API (HTTP ${response.status})`;
            try { const j = await response.json(); errMsg += ': ' + (j.error || j.details || JSON.stringify(j)); } catch {}
            console.error('[StreamHandler] /api/perplexity error:', errMsg);
            throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Reader non disponible');

        const decoder = new TextDecoder();
        let aiText = '';
        let currentSentence = '';
        let lastUpdate = 0;
        let lineBuffer = '';
        let inMathBlock = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const rawChunk = decoder.decode(value, { stream: true });
            lineBuffer += rawChunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.substring(6);
                if (jsonStr === '[DONE]') break;

                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) {
                        aiText += content;
                        currentSentence += content;

                        const now = Date.now();
                        // Throttle react updates
                        if (now - lastUpdate > 300) {
                            lastUpdate = now;
                            
                            let disp = prependText + postProcess(aiText);
                            if (applyStripDdx) disp = stripDdx(disp);
                            const fixedDisp = patchMarkdownTables(fixLatexContent(disp).content);

                            // We use requestAnimationFrame to prevent depth issues when rapidly streaming
                            requestAnimationFrame(() => {
                                setMessages(prev => {
                                    const u = [...prev];
                                    u[u.length - 1] = { role: 'assistant', content: fixedDisp };
                                    return u;
                                });
                            });
                        }

                        // Speech handling
                        if (isVoiceEnabled && speechQueue && processSpeechQueue) {
                            // Compter les occurrences (pas juste includes) — un chunk peut
                            // contenir $$...$$  complet (2 occurrences = pas de changement d'état)
                            const ddCount = (content.match(/\$\$/g) || []).length;
                            if (ddCount % 2 !== 0) inMathBlock = !inMathBlock;
                            const aaaCount = (content.match(/@@@/g) || []).length;
                            if (aaaCount % 2 !== 0) inMathBlock = !inMathBlock;
                            
                            if (!inMathBlock) {
                                const sentenceEndings = /[.!?](\s|$)/;
                                if (sentenceEndings.test(currentSentence) && currentSentence.trim().length > 15) {
                                    speechQueue.current.push(currentSentence.trim());
                                    currentSentence = '';
                                    processSpeechQueue();
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore JSON parse errors on partial chunks
                }
            }
        }

        // Final update
        if (lineBuffer.startsWith('data: ')) {
            const jsonStr = lineBuffer.substring(6);
            if (jsonStr !== '[DONE]') {
                try {
                    const content = JSON.parse(jsonStr).choices[0]?.delta?.content || '';
                    if (content) aiText += content;
                } catch (e) {}
            }
        }

        let finalDisp = prependText + postProcess(aiText) + appendText;
        if (applyStripDdx) finalDisp = stripDdx(finalDisp);
        const finalContent = patchMarkdownTables(fixLatexContent(finalDisp).content);

        setMessages(prev => {
            const u = [...prev];
            u[u.length - 1] = { role: 'assistant', content: finalContent };
            return u;
        });

        // Speech final sentence
        if (isVoiceEnabled && speechQueue && processSpeechQueue && currentSentence.trim().length > 0) {
            speechQueue.current.push(currentSentence.trim());
            processSpeechQueue();
        }

    } catch (error) {
        console.error('[StreamHandler] Streaming error:', error);
        if (!replaceLast) {
            setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: 'assistant', content: "Désolé, une erreur est survenue lors de la communication." };
                return u;
            });
        }
    } finally {
        if (setLoading) setLoading(false);
        if (setIsTalking) setIsTalking(false);
    }
}
