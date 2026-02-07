'use client';

import { useState, useEffect, useRef } from 'react';
import { chatWithRobot, ChatMessage, AiResponse } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathAssistantProps {
    baseContext?: string;
}

/**
 * Composant Assistant Mathématique utilisant l'IA + Avatar Robot
 * Expérience immersive, ultra-stable et maximisée.
 */
export default function MathAssistant({ baseContext }: MathAssistantProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Correction de l'hydratation Next.js
    useEffect(() => {
        setMounted(true);
    }, []);

    // Scroll automatique vers le bas lors de nouveaux messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Effet pour simuler la parole quand le robot répond
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !loading) {
            setIsTalking(true);
            const duration = Math.min(Math.max(2000, lastMessage.content.length * 50), 10000);

            const timer = setTimeout(() => {
                setIsTalking(false);
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsTalking(false);
        }
    }, [messages, loading]);

    // Fonctions de formatage
    const formatContent = (content: string) => {
        const cleaned = content.replace(/\[FIGURE: .*?\]/g, '');
        return cleaned
            .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
            .replace(/\\\((.*?)\\\)/g, '$$$1$$')
            .replace(/\[(.*?)(?<!\\)\]/g, (match, p1) => {
                if (match.includes('](')) return match;
                if (/[=\+\-\\\^_{}]/.test(p1)) return `$$${p1}$$`;
                return match;
            });
    };

    const MathFigure = ({ content }: { content: string }) => {
        if (content.includes('[FIGURE: TrigonometricCircle]')) {
            return (
                <div className="my-6 p-6 bg-slate-900/80 rounded-2xl border border-cyan-500/30 flex flex-col items-center shadow-inner">
                    <span className="text-[10px] text-cyan-400 font-mono mb-6 uppercase tracking-[0.3em] font-bold">Modélisation Géométrique Active</span>
                    <svg width="220" height="220" viewBox="-130 -130 260 260" className="drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <circle cx="0" cy="0" r="100" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
                        <line x1="-120" y1="0" x2="120" y2="0" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="4" />
                        <line x1="0" y1="-120" x2="0" y2="120" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="4" />
                        <circle cx="0" cy="0" r="100" fill="none" stroke="url(#cyl-grad)" strokeWidth="4" />
                        <defs>
                            <linearGradient id="cyl-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#06b6d4' }} />
                                <stop offset="100%" style={{ stopColor: '#8b5cf6' }} />
                            </linearGradient>
                        </defs>
                        <circle cx="70.7" cy="-70.7" r="6" fill="#06b6d4" className="animate-pulse" />
                        <path d="M 30 0 A 30 30 0 0 0 21.2 -21.2" fill="none" stroke="cyan" strokeWidth="3" />
                    </svg>
                </div>
            )
        }
        return null;
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const currentInput = input;
        const userMessage: ChatMessage = { role: 'user', content: currentInput };
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setIsTalking(false);

        try {
            const result: AiResponse = await chatWithRobot(newMessages, baseContext);
            if (result.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai eu un problème réseau. Peux-tu reformuler ta question ?" }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Erreur critique de connexion. Vérifie ton réseau." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return <div className="w-full h-[80vh] bg-slate-950 rounded-3xl border border-cyan-500/20 animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-[#020617] rounded-3xl border border-cyan-500/10 overflow-hidden flex flex-col h-[95vh] max-h-[1100px] font-['Exo_2',_sans-serif] relative shadow-[0_0_100px_rgba(0,0,0,0.9)] isolate group/assistant transition-all duration-500">
            {/* Background Decor - Quantum Grid */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent)]">
                <div className="w-full h-full bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:60px_60px]"></div>
            </div>

            {/* Top Bar - Session Status */}
            <div className="shrink-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 px-8 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-4 h-4 bg-cyan-500/40 rounded-full blur-md animate-ping"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-cyan-400/80 font-['Orbitron']">mimimaths@i // Core.Quantum.Sync</span>
                </div>
                {loading && (
                    <div className="px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase animate-pulse tracking-widest">Calculs Stochastiques...</span>
                    </div>
                )}
            </div>

            {/* Chat Zone - Ultra-Spacious for Math */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar scroll-smooth overflow-x-hidden relative">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-[0.08] text-center px-10 select-none">
                        <div className="text-[140px] mb-10 transform scale-110 drop-shadow-2xl">📐</div>
                        <p className="text-sm font-mono uppercase tracking-[1em] text-cyan-400">Intelligence Tutorielle Active</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className={`max-w-[96%] px-10 py-8 text-[18px] rounded-[2.5rem] leading-relaxed shadow-2xl transition-all duration-300 ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 text-blue-50 rounded-tr-none'
                            : 'bg-slate-900/70 border border-slate-800 text-slate-100 rounded-tl-none ring-1 ring-white/5 backdrop-blur-xl'
                            }`}>
                            <MathFigure content={msg.content} />
                            <div className="prose prose-invert prose-cyan max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-6 last:mb-0 leading-[1.8]" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-8 mb-6 space-y-4 text-slate-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-8 mb-6 space-y-4 text-slate-300" {...props} />,
                                        h1: ({ ...props }) => <h1 className="text-3xl font-bold mb-8 text-cyan-300 font-['Orbitron'] border-b border-white/5 pb-4" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-2xl font-bold mb-6 text-cyan-400" {...props} />,
                                        h3: ({ ...props }) => <h3 className="text-xl font-bold mb-4 text-fuchsia-400" {...props} />,
                                        blockquote: ({ ...props }) => <blockquote className="border-l-4 border-fuchsia-500/50 pl-8 py-6 my-10 bg-fuchsia-500/5 italic text-slate-200 rounded-r-3xl shadow-lg" {...props} />,
                                        code: ({ node, className, ...props }) => (
                                            <code className="bg-black/60 px-2 py-1 rounded-lg text-[16px] font-mono text-cyan-300 border border-white/10" {...props} />
                                        ),
                                        table: ({ ...props }) => (
                                            <div className="overflow-x-auto my-10 rounded-[2rem] border border-white/10 bg-black/40 p-2 shadow-2xl">
                                                <table className="min-w-full divide-y divide-white/5" {...props} />
                                            </div>
                                        ),
                                        th: ({ ...props }) => <th className="px-6 py-4 text-left text-xs font-bold text-cyan-400 uppercase tracking-widest bg-slate-800/30" {...props} />,
                                        td: ({ ...props }) => <td className="px-6 py-4 text-[16px] border-t border-white/5 text-slate-300" {...props} />
                                    }}
                                >
                                    {formatContent(msg.content)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-24" />
            </div>

            {/* Bottom Stable Zone - Avatar & Input */}
            <div className="shrink-0 p-10 bg-slate-950/95 backdrop-blur-3xl border-t border-white/5 relative z-30">

                {/* Robot Avatar - Massive & Fixed */}
                <div className="absolute -top-28 left-12 flex items-end gap-8 pointer-events-none transition-all duration-700">
                    <div className="relative group/robot">
                        <div className="absolute -inset-6 bg-cyan-400/20 rounded-full blur-3xl animate-pulse group-hover/robot:bg-cyan-400/30 transition-all duration-1000"></div>
                        <div className="relative bg-black p-2 rounded-full ring-[6px] ring-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.6)] transform group-hover/robot:scale-105 transition-transform duration-500">
                            <RobotAvatar isTalking={isTalking} width={110} height={110} />
                        </div>
                    </div>
                    {isTalking && (
                        <div className="mb-8 bg-cyan-500/10 backdrop-blur-2xl border border-cyan-500/20 px-6 py-3 rounded-[1.5rem] rounded-bl-none shadow-2xl animate-in zoom-in-50 duration-300">
                            <div className="flex gap-2">
                                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce"></span>
                                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex gap-6 items-end max-w-7xl mx-auto pl-36 relative"
                >
                    <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-[2.5rem] focus-within:border-cyan-500/50 focus-within:bg-black/60 focus-within:ring-[8px] focus-within:ring-cyan-500/10 transition-all duration-500 group shadow-2xl">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Interrogez votre tuteur quantique..."
                            className="w-full bg-transparent border-none text-slate-50 placeholder-slate-700 focus:ring-0 px-10 py-6 resize-none text-[18px] min-h-[64px] max-h-[200px] font-sans scrollbar-hide"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 hover:from-cyan-500 hover:via-blue-600 hover:to-indigo-700 disabled:opacity-20 text-white rounded-[2rem] transition-all h-[64px] w-[70px] flex items-center justify-center shrink-0 shadow-[0_15px_40px_rgba(6,182,212,0.4)] active:scale-90 border border-white/10"
                    >
                        {loading ? (
                            <div className="w-8 h-8 border-[4px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
