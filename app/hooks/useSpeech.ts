'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseSpeechReturn {
    isRecording: boolean;
    speakingIndex: number | null;
    speechVolume: number;
    isTalking: boolean;
    setIsTalking: (v: boolean) => void;
    toggleRecording: (onTranscript: (t: string) => void) => void;
    speakMessage: (text: string, index: number, audioData?: string) => Promise<void>;
    processSpeechQueue: () => void;
    speechQueue: React.MutableRefObject<string[]>;
}

// ─── Utilitaire : nettoyage du texte mathématique pour la voix ───────────────

export function cleanMathForSpeech(text: string): string {
    let clean = text
        .replace(/@@@[\s\S]*?@@@/g, '') // Supprime les blocs graphiques
        .replace(/\*\*([^*]+)\*\*/g, '$1') // gras appariés
        .replace(/\*\*/g, '')              // ** résiduels non appariés
        .replace(/(?<![a-z0-9])\*(?![a-z0-9*])/gi, '') // * isolés
        .replace(/#{1,6}\s+/g, '')         // titres markdown
        .replace(/^[-*+]\s+/gm, '')        // listes
        // {} et $ strippés APRÈS le mathMap pour que les conversions LaTeX fonctionnent

    // Nombres décimaux à la française
    clean = clean.replace(/(\d)\.(\d)/g, '$1 virgule $2');

    // Table de traduction LaTeX → voix
    const mathMap: Record<string, string> = {
        '\\\\Delta': ' delta ',
        '\\\\alpha': ' alpha ',
        '\\\\beta': ' béta ',
        '\\\\gamma': ' gamma ',
        '\\\\theta': ' théta ',
        '\\\\pi': ' pi ',
        '\\\\sqrt\\s*\\{([^}]*)\\}': ' racine carrée de $1 ',
        '\\\\sqrt\\s*(\\d+|[a-zA-Z])': ' racine carrée de $1 ',
        '\\\\frac\\{([^}]*)\\}\\{([^}]*)\\}': ' $1 sur $2 ',
        '\\\\left\\(': ' ',
        '\\\\right\\)': ' ',
        '\\\\times': ' fois ',
        '\\\\cdot': ' fois ',
        '\\\\ln': ' hélène ',
        '\\\\exp': ' exponentielle ',
        '\\\\mathbb\\{R\\}': " l'ensemble des réels ",
        '\\\\mathbb\\{N\\}': " l'ensemble des entiers naturels ",
        '\\\\mathbb\\{Z\\}': " l'ensemble des entiers relatifs ",
        '\\\\mathbb\\{Q\\}': " l'ensemble des rationnels ",
        '\\\\mathbb\\{C\\}': " l'ensemble des complexes ",
        '\\\\in': ' appartient à ',
        '\\\\notin': " n'appartient pas à ",
        '\\\\le': ' inférieur ou égal à ',
        '\\\\leq': ' inférieur ou égal à ',
        '\\\\ge': ' supérieur ou égal à ',
        '\\\\geq': ' supérieur ou égal à ',
        '\\\\neq': ' différent de ',
        '\\\\infty': " l'infini ",
        '\\\\approx': ' environ égal à ',
        '\\\\pm': ' plus ou moins ',
        '\\\\cap': ' inter ',
        '\\\\cup': ' union ',
        '\\\\forall': ' pour tout ',
        '\\\\exists': ' il existe ',
        '\\\\Rightarrow': ' implique ',
        '\\\\Leftrightarrow': ' équivaut à ',
        '\\^2': ' au carré ',
        '\\^3': ' au cube ',
        '\\^': ' puissance ',
        '_': ' indice ',
        '\\\\vec\\{([^}]*)\\}': ' vecteur $1 ',
        '\\\\overrightarrow\\{([^}]*)\\}': ' vecteur $1 ',
        '\\\\vec\\s+([a-zA-Z0-9]{1,2})': ' vecteur $1 ',
        '\\\\overrightarrow\\s+([a-zA-Z0-9]{1,2})': ' vecteur $1 ',
        '\\\\overline\\{([^}]*)\\}': ' $1 bar ',
        '\\\\text\\{([^}]*)\\}': ' $1 ',
        '\\\\begin\\{(?:p|b|v)?matrix\\}([\\s\\S]*?)\\\\end\\{(?:p|b|v)?matrix\\}': ' $1 ',
        '\\\\\\\\': ' ',
        '&': ' ',
        '=': ' égale ',
        '\\+': ' plus ',
        '\\b(w)\\b': ' double-vé ',
    };

    for (const [pattern, replacement] of Object.entries(mathMap)) {
        try {
            clean = clean.replace(new RegExp(pattern, 'g'), replacement);
        } catch { /* regex complexe, on ignore */ }
    }

    // Strip $ après conversion math (évite "dollar dollar" prononcé par OpenAI TTS)
    clean = clean.replace(/\$\$/g, '').replace(/\$/g, '');
    // Strip {} résiduels après conversion (notation set Python, accolades LaTeX non traitées)
    clean = clean.replace(/\{([^}]*)\}/g, '$1').replace(/[{}]/g, '');

    clean = clean.replace(/(^|[^a-zA-Z])y([^a-zA-Z]|$)/g, '$1 i-grec $2');
    clean = clean.replace(/(\d+)\)/g, ' $1 ');
    clean = clean.replace(/([^\w])(-)([\d|a-zA-Z])/g, '$1 moins $3');
    clean = clean.replace(/^-(?=\d|[a-zA-Z])/g, 'moins ');
    clean = clean.replace(/(\s)-(\s)/g, ' moins ');
    clean = clean.replace(/\b(x|n|k|i|j|a|b|c)\b/gi, (m) => ` ${m} `);
    clean = clean.replace(/([fgh])\((x|t)\)/gi, '$1 de $2');
    clean = clean.replace(/\\/g, ' ').replace(/[{}]/g, ' ');
    clean = clean.replace(/vecteur\s+([A-Z])([A-Z])\b/g, ' vecteur $1 $2 ');
    clean = clean.replace(/vecteur\s+vecteur/gi, 'vecteur');
    clean = clean.replace(/overrightarrow|overarrow/gi, ' vecteur ');
    clean = clean.replace(/\\begin|\\end|pmatrix|bmatrix|vmatrix|matrix/gi, ' ');
    clean = clean.replace(/\bqueue\s+du\s+vecteur\b/gi, 'origine du vecteur');
    clean = clean.replace(/\btête\s+du\s+vecteur\b/gi, 'extrémité du vecteur');
    clean = clean.replace(/\bcomposantes\b/gi, 'coordonnées');
    clean = clean.replace(/\b([uvw])\b/gi, (match) => {
        const low = match.toLowerCase();
        return low === 'w' ? ' double-vé ' : ` ${low} `;
    });
    clean = clean.replace(/=/g, ' égale à ').replace(/\+/g, ' plus ');

    return clean.replace(/\s+/g, ' ').trim();
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useSpeech(isVoiceEnabled: boolean): UseSpeechReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [speechVolume, setSpeechVolume] = useState(0);
    const [isTalking, setIsTalking] = useState(false);

    const recognitionRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const speechQueue = useRef<string[]>([]);
    const isSpeakingQueue = useRef(false);
    const prefetchCache = useRef<Map<string, string>>(new Map());

    // ── Setup STT (SpeechRecognition) ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'fr-FR';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onerror = () => setIsRecording(false);
        recognitionRef.current.onend = () => setIsRecording(false);
    }, []);

    const toggleRecording = useCallback((onTranscript: (t: string) => void) => {
        if (!recognitionRef.current) return;
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onTranscript(transcript);
                setIsRecording(false);
            };
            setIsRecording(true);
            recognitionRef.current.start();
        }
    }, [isRecording]);

    // ── prefetchTTS : lance la requête TTS en avance pour la prochaine phrase ──
    const prefetchTTS = useCallback(async (text: string) => {
        if (prefetchCache.current.has(text)) return;
        prefetchCache.current.set(text, '__loading__');
        try {
            const cleaned = cleanMathForSpeech(text);
            const truncated = cleaned.length > 1500 ? cleaned.substring(0, 1500) + '.' : cleaned;
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: truncated, voice: 'fable' }),
            });
            if (res.ok) {
                const url = URL.createObjectURL(await res.blob());
                prefetchCache.current.set(text, url);
            } else {
                prefetchCache.current.delete(text);
            }
        } catch {
            prefetchCache.current.delete(text);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── processSpeechQueue ──
    const processSpeechQueue = useCallback(() => {
        if (isSpeakingQueue.current || speechQueue.current.length === 0) return;
        isSpeakingQueue.current = true;
        const next = speechQueue.current.shift();
        if (next) {
            // Pré-charger la phrase suivante pendant que celle-ci est spoken
            if (speechQueue.current.length > 0) {
                prefetchTTS(speechQueue.current[0]);
            }
            speakMessage(next, -2);
        } else {
            isSpeakingQueue.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefetchTTS]);

    // ── speakMessage ──
    const speakMessage = useCallback(async (text: string, index: number, audioData?: string): Promise<void> => {
        if (typeof window === 'undefined') return;

        // Toggle off si on reclique sur le même message
        if (speakingIndex === index && index !== -2) {
            audioElement?.pause();
            setSpeakingIndex(null);
            setIsTalking(false);
            return;
        }

        if (!isVoiceEnabled && index !== -1) return;

        audioElement?.pause();
        window.speechSynthesis.cancel();

        const fallbackSpeak = (t: string, onDone?: () => void) => {
            const utterance = new SpeechSynthesisUtterance(cleanMathForSpeech(t));
            utterance.lang = 'fr-FR';
            utterance.onstart = () => setIsTalking(true);
            utterance.onend = () => {
                setSpeakingIndex(null);
                setIsTalking(false);
                setSpeechVolume(0);
                if (index === -2) {
                    isSpeakingQueue.current = false;
                    processSpeechQueue();
                }
                onDone?.();
            };
            window.speechSynthesis.speak(utterance);
        };

        return new Promise(async (resolve) => {
            try {
                setSpeakingIndex(index);
                setIsTalking(true);

                let url = '';

                if (audioData) {
                    const byteCharacters = atob(audioData);
                    const byteArray = new Uint8Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
                    url = URL.createObjectURL(new Blob([byteArray], { type: 'audio/mp3' }));
                } else {
                    const cleanedText = cleanMathForSpeech(text);
                    const truncatedText = cleanedText.length > 1500 ? cleanedText.substring(0, 1500) + '.' : cleanedText;

                    // Utiliser le cache de pré-chargement si disponible et prêt
                    const cached = prefetchCache.current.get(text);
                    if (cached && cached !== '__loading__') {
                        prefetchCache.current.delete(text);
                        url = cached;
                    } else {
                        // Attendre si pré-chargement en cours, sinon fetch direct
                        if (cached === '__loading__') {
                            await new Promise<void>(res => {
                                const interval = setInterval(() => {
                                    const ready = prefetchCache.current.get(text);
                                    if (ready && ready !== '__loading__') {
                                        clearInterval(interval);
                                        url = ready;
                                        prefetchCache.current.delete(text);
                                        res();
                                    } else if (!ready) {
                                        clearInterval(interval);
                                        res();
                                    }
                                }, 100);
                                setTimeout(() => { clearInterval(interval); res(); }, 5000);
                            });
                        }
                    }

                    if (!url) {
                        const response = await fetch('/api/tts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: truncatedText, voice: 'fable' }),
                        });

                        if (!response.ok) {
                            console.warn(`[TTS] API indisponible (${response.status}) → fallback navigateur`);
                            fallbackSpeak(truncatedText, resolve);
                            return;
                        }
                        const provider = response.headers.get('X-TTS-Provider') ?? 'inconnu';
                        console.log(`[TTS] Provider utilisé: ${provider}`);
                        url = URL.createObjectURL(await response.blob());
                    }
                }

                const audio = new Audio(url);
                audio.crossOrigin = 'anonymous';
                setAudioElement(audio);

                // Analyser audio (volume visualisation)
                if (!audioCtxRef.current) {
                    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                    audioCtxRef.current = new AudioContextClass();
                }
                const audioCtx = audioCtxRef.current!;
                if (audioCtx.state === 'suspended') await audioCtx.resume();

                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 32;
                analyserRef.current = analyser;

                const source = audioCtx.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioCtx.destination);
                sourceRef.current = source;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                // Stocker l'ObjectURL pour la révoquer plus tard
                const blobUrl = url;

                const updateVolume = () => {
                    if (analyserRef.current && isTalking) {
                        analyserRef.current.getByteFrequencyData(dataArray);
                        const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
                        setSpeechVolume(Math.min(1.2, avg / 80));
                        animationFrameRef.current = requestAnimationFrame(updateVolume);
                    }
                };

                const cleanup = () => {
                    setSpeakingIndex(null);
                    setIsTalking(false);
                    setSpeechVolume(0);
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                    if (sourceRef.current) sourceRef.current.disconnect();
                    // Révoquer l'ObjectURL pour libérer la mémoire
                    if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
                };

                audio.onplay = () => { setIsTalking(true); updateVolume(); };

                audio.onended = () => {
                    cleanup();
                    if (index === -2) { isSpeakingQueue.current = false; processSpeechQueue(); }
                    resolve();
                };

                audio.onerror = () => {
                    cleanup();
                    fallbackSpeak(text, resolve);
                };

                audio.play().catch(() => fallbackSpeak(text, resolve));

            } catch (error) {
                console.error('Erreur TTS:', error);
                fallbackSpeak(text, resolve);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speakingIndex, audioElement, isVoiceEnabled, isTalking]);

    return {
        isRecording,
        speakingIndex,
        speechVolume,
        isTalking,
        setIsTalking,
        toggleRecording,
        speakMessage,
        processSpeechQueue,
        speechQueue,
    };
}
