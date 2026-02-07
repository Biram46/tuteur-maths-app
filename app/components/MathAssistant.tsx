'use client';

import { useState, useEffect, useRef } from 'react';
import { chatWithRobot, ChatMessage, AiResponse } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Composant Assistant Mathématique utilisant l'IA + Avatar Robot
 * Interface type "Chat" avec historique
 */
export default function MathAssistant() {
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

    // Fonctions de formatage et figure inchangées...
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
                <div className="my-4 p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30 flex flex-col items-center">
                    <span className="text-[9px] text-cyan-400 font-mono mb-4 uppercase tracking-[0.2em]">Visualisation Géométrique</span>
                    <svg width="180" height="180" viewBox="-130 -130 260 260">
                        <circle cx="0" cy="0" r="100" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
                        <line x1="-120" y1="0" x2="120" y2="0" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="4" />
                        <line x1="0" y1="-120" x2="0" y2="120" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="4" />
                        <circle cx="0" cy="0" r="100" fill="none" stroke="url(#cyl-grad)" strokeWidth="3" />
                        <defs>
                            <linearGradient id="cyl-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#22d3ee' }} />
                                <stop offset="100%" style={{ stopColor: '#d946ef' }} />
                            </linearGradient>
                        </defs>
                        <circle cx="70.7" cy="-70.7" r="5" fill="#d946ef" />
                        <path d="M 30 0 A 30 30 0 0 0 21.2 -21.2" fill="none" stroke="cyan" strokeWidth="2" />
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

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        setIsTalking(false);

        try {
            const result: AiResponse = await chatWithRobot([userMessage]);
            if (result.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai eu un problème. Reformule ta question ?" }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return <div className="w-full h-[70vh] bg-slate-950 rounded-3xl border border-cyan-500/20 animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-[#020617] rounded-3xl border border-cyan-500/10 overflow-hidden flex flex-col h-[90vh] max-h-[1000px] font-['Exo_2',_sans-serif] relative shadow-[0_0_80px_rgba(0,0,0,0.8)] isolate">
            {/* Background Decor - Static */}
            <div className="absolute inset-0 opacity-10 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1),transparent)]">
                <div className="w-full h-full bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* Top Bar - Ultra Minimal */}
            <div className="shrink-0 bg-slate-900/40 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80 font-['Orbitron']">mimimaths@i // Session Active</span>
                </div>
                {loading && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase animate-pulse">Traitement neuronal...</span>
                    </div>
                )}
            </div>

            {/* Chat Zone - Maximisée (3/4 de la page ou plus) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar scroll-smooth overflow-x-hidden relative">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-10 text-center px-10">
                        <div className="text-8xl mb-6">📐</div>
                        <p className="text-sm font-mono uppercase tracking-[0.5em]">Tuteur Mathématique IA</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[92%] px-6 py-5 text-[16px] rounded-2xl leading-relaxed shadow-xl ${msg.role === 'user'
                            ? 'bg-blue-600/10 border border-blue-500/30 text-blue-50 rounded-tr-none'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-none ring-1 ring-white/5'
                            }`}>
                            <MathFigure content={msg.content} />
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-5 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-5 space-y-2 text-slate-300" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-5 space-y-2 text-slate-300" {...props} />,
                                    h1: ({ ...props }) => <h1 className="text-2xl font-bold mb-6 text-cyan-300 font-['Orbitron'] border-b border-cyan-500/20 pb-2" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-xl font-bold mb-4 text-cyan-400" {...props} />,
                                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-cyan-500/40 pl-5 py-3 my-6 bg-cyan-500/5 italic text-slate-200 rounded-r-xl" {...props} />,
                                    code: ({ node, className, ...props }) => (
                                        <code className="bg-black/60 px-2 py-1 rounded text-[14px] font-mono text-cyan-300 border border-white/10" {...props} />
                                    ),
                                    table: ({ ...props }) => (
                                        <div className="overflow-x-auto my-6 rounded-2xl border border-white/10 bg-black/40 p-1">
                                            <table className="min-w-full divide-y divide-white/10" {...props} />
                                        </div>
                                    ),
                                    th: ({ ...props }) => <th className="px-5 py-3 text-left text-xs font-bold text-cyan-400 uppercase tracking-widest bg-slate-800/50" {...props} />,
                                    td: ({ ...props }) => <td className="px-5 py-3 text-sm border-t border-white/5 text-slate-300" {...props} />
                                }}
                            >
                                {formatContent(msg.content)}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-10" />
            </div>

            {/* Bottom Section - Robot et Input */}
            <div className="shrink-0 p-6 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 relative">

                {/* Robot Assistant - Placé au-dessus de l'input */}
                <div className="absolute -top-16 left-8 flex items-end gap-4 pointer-events-none transition-all duration-500">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-cyan-400/30 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative bg-black p-1 rounded-full ring-2 ring-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <RobotAvatar isTalking={isTalking} width={70} height={70} />
                        </div>
                    </div>
                    {isTalking && (
                        <div className="mb-4 bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 px-4 py-2 rounded-2xl rounded-bl-none animate-message">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex gap-4 items-end max-w-6xl mx-auto pl-20"
                >
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl focus-within:border-cyan-500/50 focus-within:bg-black transition-all group shadow-2xl">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Pose ta question au tuteur..."
                            className="w-full bg-transparent border-none text-slate-100 placeholder-slate-600 focus:ring-0 px-5 py-4 resize-none text-[16px] min-h-[60px] max-h-[160px] font-sans"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-30 text-white rounded-2xl transition-all h-[60px] w-[60px] flex items-center justify-center shrink-0 shadow-[0_8px_25px_rgba(6,182,212,0.4)] active:scale-95"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
