'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';
import LevelSelector from './LevelSelector';
import MessageItem from './MessageItem';
import type { NiveauLycee } from '@/lib/niveaux';
import { resolveNiveau } from '@/lib/niveau-utils';
import { useSpeech } from '@/app/hooks/useSpeech';
import { usePdfExport } from '@/app/hooks/usePdfExport';
import { useOcrProcessor } from '@/app/hooks/useOcrProcessor';
import { useMathRouter } from '@/app/hooks/useMathRouter';
import { useFigureRenderer } from '@/app/hooks/useFigureRenderer';
// KaTeX CSS chargé globalement ici pour couvrir tous les blocs de rendu
import 'katex/dist/katex.min.css';


interface MathAssistantProps {
    baseContext?: string;
}

export default function MathAssistant({ baseContext }: MathAssistantProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [selectedNiveau, setSelectedNiveau] = useState<NiveauLycee | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Hooks ───────────────────────────────────────────────────────────────────
    const {
        isRecording, speakingIndex, speechVolume,
        isTalking, setIsTalking,
        toggleRecording: toggleRecordingHook,
        speakMessage: speakMessageHook,
        processSpeechQueue: processSpeechQueueHook,
        speechQueue: speechQueueHook,
    } = useSpeech(isVoiceEnabled);

    const { handleExportBilan: handleExportBilanHook } = usePdfExport(messages, setLoading);

    // useOcrProcessor câblé via ref pour éviter la forward-reference
    const sendMessageRef = useRef<(text: string, msgs: ChatMessage[]) => Promise<void>>(async () => { });

    // Callback OCR mémoïsée — la ref garantit que handleSendMessageWithText
    // est toujours la dernière version sans recréer la callback
    const ocrCallback = useCallback(
        (text: string, msgs: ChatMessage[]) => sendMessageRef.current(text, msgs),
        [] // sendMessageRef est un ref → stable
    );

    const { isScanning, fileInputRef, handleFileUpload, handlePaste } = useOcrProcessor(
        ocrCallback,
        messages,
        setMessages,
        setLoading,
        selectedNiveau
    );

    // resolveNiveau mémoïsée : recalculée seulement si selectedNiveau change
    const resolveNiveauCallback = useCallback(
        (msg: string) => resolveNiveau(msg, selectedNiveau, setSelectedNiveau),
        [selectedNiveau]
    );

    const { handleSendMessageWithText } = useMathRouter({
        setMessages,
        setLoading,
        setIsTalking,
        isVoiceEnabled,
        speakMessage: speakMessageHook,
        processSpeechQueue: processSpeechQueueHook,
        speechQueue: speechQueueHook,
        baseContext,
        selectedNiveau,
        resolveNiveau: resolveNiveauCallback,
    });

    const { renderMessageContent } = useFigureRenderer();

    // Câblage de sendMessageRef (pattern stable pour éviter les cycles)
    sendMessageRef.current = handleSendMessageWithText;

    // onSpeak mémoïsé : référence stable pour que MessageItem.memo soit efficace
    const onSpeak = useCallback(
        (content: string, index: number, audio?: string) => speakMessageHook(content, index, audio),
        [speakMessageHook]
    );

    useEffect(() => { setMounted(true); }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);


    useEffect(() => {
        // ⚠️ Ne pas modifier isTalking pendant le streaming (évite "Maximum update depth exceeded")
        if (loading) return;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant') {
            setIsTalking(true);
            const duration = Math.min(Math.max(2000, lastMessage.content.length * 50), 10000);
            const timer = setTimeout(() => setIsTalking(false), duration);
            return () => clearTimeout(timer);
        } else {
            setIsTalking(false);
        }
    }, [messages, loading]);

    const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || isScanning) return;
        const userMessage: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        const savedInput = input;
        setInput('');
        await handleSendMessageWithText(savedInput, newMessages);
    }, [input, loading, isScanning, messages, handleSendMessageWithText]);

    if (!mounted) return <div className="w-full h-full bg-slate-950 rounded-3xl animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-[#020617] overflow-hidden flex flex-col h-full font-['Exo_2',_sans-serif] relative shadow-2xl">
            {/* SECTION 1: ROBOT VIDEO COLUMN (FIXED TOP) */}
            <div className="shrink-0 h-[160px] bg-slate-900/40 border-b border-white/5 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
                <div className="absolute top-4 left-6 flex items-center gap-3 z-10">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">Live</span>
                    </div>
                    <LevelSelector
                        selectedLevel={selectedNiveau}
                        onLevelChange={setSelectedNiveau}
                        compact
                    />
                </div>

                <div className="absolute top-4 right-6 z-10">
                    <button
                        onClick={handleExportBilanHook}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-bold text-cyan-400 uppercase tracking-widest transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        PDF
                    </button>
                </div>

                {/* Avatar Video Frame */}
                <div className="relative group mt-4">
                    <div className={`absolute -inset-6 rounded-full blur-3xl transition-all duration-1000 ${isTalking ? 'bg-cyan-500/30 scale-110' : 'bg-blue-500/10'}`}></div>
                    <div className="relative bg-black/60 p-1.5 rounded-full ring-2 ring-slate-800 shadow-[0_0_20px_rgba(6,182,212,0.1)] overflow-hidden">
                        <RobotAvatar isTalking={isTalking} volume={speechVolume} width={85} height={85} />
                    </div>
                    {isTalking && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            <div className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1s_infinite]"></div>
                            <div className="w-1 h-6 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.1s]"></div>
                            <div className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
                        </div>
                    )}
                </div>

                <div className="mt-2 text-center z-10">
                    <h3 className="text-[9px] font-black text-white uppercase tracking-[0.4em] font-['Orbitron'] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">mimimaths@i</h3>
                    <div className="flex items-center justify-center gap-4 mt-0.5">
                        <label className="relative inline-flex items-center cursor-pointer pointer-events-auto">
                            <input
                                type="checkbox"
                                checked={isVoiceEnabled}
                                onChange={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                            <span className="ms-2 text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">
                                {isVoiceEnabled ? 'Audio On' : 'Muet'}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* SECTION 2: CHAT AREA (FLEX-1) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative bg-[#020617]">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-[0.1] select-none text-center">
                        <div className="text-6xl mb-4">📐</div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.8em] text-cyan-400">Intelligence Active</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <MessageItem
                        key={index}
                        msg={msg}
                        index={index}
                        loading={loading}
                        speakingIndex={speakingIndex}
                        onSpeak={onSpeak}
                        renderContent={renderMessageContent}
                    />
                ))}

                <div ref={messagesEndRef} className="h-4" />
            </div>


            {/* SECTION 3: INPUT BAR (BOTTOM) */}
            <div className="shrink-0 p-4 bg-slate-950 border-t border-white/5">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center pr-2 focus-within:ring-1 focus-within:ring-cyan-500/30">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            onPaste={handlePaste}
                            placeholder="Écrivez ici ou collez une capture d'écran..."
                            className="flex-1 bg-transparent border-none text-slate-100 px-4 py-3 resize-none text-[15px] min-h-[44px] max-h-[120px] focus:ring-0 placeholder:text-slate-600"
                            disabled={loading || isScanning}
                        />
                        <div className="flex items-center shrink-0">
                            <button
                                type="button"
                                onClick={() => toggleRecordingHook((transcript) => setInput(prev => prev + (prev ? ' ' : '') + transcript))}
                                className={`p-2 transition-all rounded-full ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-slate-500 hover:text-cyan-400'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
                                className="p-2 text-slate-500 hover:text-cyan-400 transition-all"
                                title="Scanner un exercice (Image ou PDF)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={loading || !input.trim() || isScanning} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-[44px] w-[44px] flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0">
                        {loading && !isScanning ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                        )}
                    </button>
                </form>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" aria-hidden="true" />
            </div>
        </div>
    );
}
