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
        <div className="w-full mx-auto bg-slate-950 rounded-3xl border border-cyan-500/20 overflow-hidden flex flex-col h-[70vh] max-h-[800px] font-['Exo_2',_sans-serif] relative shadow-2xl">
            {/* Background Grid - Static */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:30px_30px]"></div>
            </div>

            {/* Header - Plus compact */}
            <div className="relative shrink-0 bg-slate-900/60 backdrop-blur-md border-b border-cyan-500/20 px-6 py-4 flex items-center gap-4 z-10">
                <div className="relative bg-slate-950 p-1 rounded-full ring-1 ring-cyan-500/30">
                    <RobotAvatar isTalking={isTalking} width={40} height={40} />
                </div>
                <div>
                    <h2 className="text-sm font-bold tracking-widest text-cyan-400 font-['Orbitron']">mimimaths@i</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-[8px] uppercase font-mono text-slate-500">{loading ? 'Analyse...' : 'Opérationnel'}</span>
                    </div>
                </div>
            </div>

            {/* Chat Zone - Static scrolling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <span className="text-3xl mb-2">🎓</span>
                        <p className="text-xs font-mono uppercase tracking-[0.3em]">En attente de question</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-4 text-[14px] rounded-2xl ${msg.role === 'user'
                            ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-tl-none'
                            }`}>
                            <MathFigure content={msg.content} />
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1 text-slate-300" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1 text-slate-300" {...props} />,
                                    h1: ({ ...props }) => <h1 className="text-lg font-bold mb-3 text-cyan-400 font-['Orbitron']" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-base font-bold mb-2 text-cyan-300" {...props} />,
                                    blockquote: ({ ...props }) => <blockquote className="border-l-2 border-cyan-500/50 pl-4 py-2 my-4 bg-cyan-500/5 italic" {...props} />,
                                    code: ({ node, className, ...props }) => (
                                        <code className="bg-slate-950/80 px-1.5 py-0.5 rounded text-xs font-mono text-cyan-300 border border-white/5" {...props} />
                                    ),
                                }}
                            >
                                {formatContent(msg.content)}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Zone - Plus petite et stable */}
            <div className="p-3 bg-slate-900 border-t border-cyan-500/20 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end max-w-4xl mx-auto">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl focus-within:border-cyan-500/50 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Pose ta question..."
                            className="w-full bg-transparent border-none text-slate-200 placeholder-slate-600 focus:ring-0 px-4 py-2.5 resize-none text-sm min-h-[40px] max-h-[120px] font-sans"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white p-2.5 rounded-xl transition-all h-[40px] w-[40px] flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/20"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
