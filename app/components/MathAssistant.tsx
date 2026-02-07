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
        <div className="w-full mx-auto bg-[#020617] rounded-3xl border border-cyan-500/20 overflow-hidden flex flex-col h-[85vh] max-h-[900px] font-['Exo_2',_sans-serif] relative shadow-[0_0_50px_rgba(0,0,0,0.5)] isolate">
            {/* Background Decor - Static */}
            <div className="absolute inset-0 opacity-10 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1),transparent)] flex items-center justify-center">
                <div className="w-full h-full bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* Header - Plus spacieux mais équilibré */}
            <div className="relative shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-5 flex items-center gap-6 z-10">
                <div className="relative flex-shrink-0">
                    <div className="absolute -inset-2 bg-cyan-400/20 rounded-full blur-md animate-pulse"></div>
                    <div className="relative bg-black p-1.5 rounded-full ring-2 ring-cyan-500/40">
                        <RobotAvatar isTalking={isTalking} width={70} height={70} />
                    </div>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-[0.2em] text-cyan-50 font-['Orbitron']">mimimaths@i</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]'}`}></div>
                        <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-cyan-400/70">{loading ? 'Analyse intelligente...' : 'Module Opérationnel'}</span>
                    </div>
                </div>
            </div>

            {/* Chat Zone - Zone de réponse maximisée */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth overflow-x-hidden">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-10">
                        <div className="text-6xl mb-4">🎓</div>
                        <p className="text-sm font-mono uppercase tracking-[0.4em]">Prêt à t'accompagner</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] px-5 py-4 text-[15px] rounded-2xl leading-relaxed ${msg.role === 'user'
                            ? 'bg-cyan-600/10 border border-cyan-500/20 text-cyan-50 rounded-tr-none'
                            : 'bg-slate-900/60 border border-slate-800 text-slate-100 rounded-tl-none shadow-lg'
                            }`}>
                            <MathFigure content={msg.content} />
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-2 text-slate-300" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-2 text-slate-300" {...props} />,
                                    h1: ({ ...props }) => <h1 className="text-xl font-bold mb-4 text-cyan-400 font-['Orbitron'] border-b border-cyan-500/10 pb-2" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-lg font-bold mb-3 text-cyan-300" {...props} />,
                                    h3: ({ ...props }) => <h3 className="text-base font-bold mb-2 text-fuchsia-300" {...props} />,
                                    blockquote: ({ ...props }) => <blockquote className="border-l-3 border-fuchsia-500/40 pl-4 py-2 my-5 bg-fuchsia-500/5 italic text-fuchsia-50 rounded-r-lg" {...props} />,
                                    code: ({ node, className, ...props }) => (
                                        <code className="bg-black/40 px-1.5 py-0.5 rounded text-[13px] font-mono text-cyan-300 border border-white/5" {...props} />
                                    ),
                                    table: ({ ...props }) => (
                                        <div className="overflow-x-auto my-4 rounded-xl border border-white/5">
                                            <table className="min-w-full divide-y divide-white/5 bg-black/20" {...props} />
                                        </div>
                                    ),
                                    th: ({ ...props }) => <th className="px-4 py-2 text-left text-xs font-bold text-cyan-400 uppercase" {...props} />,
                                    td: ({ ...props }) => <td className="px-4 py-2 text-sm border-t border-white/5" {...props} />
                                }}
                            >
                                {formatContent(msg.content)}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Zone - Fixe en bas et stable */}
            <div className="p-4 bg-slate-950 border-t border-white/10 shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex gap-3 items-end max-w-5xl mx-auto"
                >
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl focus-within:border-cyan-500/50 focus-within:bg-black transition-all group shadow-inner">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Écris ton problème ici..."
                            className="w-full bg-transparent border-none text-slate-200 placeholder-slate-600 focus:ring-0 px-5 py-3.5 resize-none text-[15px] min-h-[50px] max-h-[150px] font-sans"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-30 text-white rounded-2xl transition-all h-[50px] w-[50px] flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(6,182,212,0.3)] active:scale-95"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
