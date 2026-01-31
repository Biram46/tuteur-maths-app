'use client';

import { useState, useEffect, useRef } from 'react';
import { chatWithRobot, ChatMessage, PerplexityResponse } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Composant Assistant Mathématique utilisant Perplexity AI + Avatar Robot
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
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Effet pour simuler la parole quand le robot répond
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !loading) {
            setIsTalking(true);
            // Le robot parle pendant environ 100ms par 10 caractères de réponse, max 10s
            // Minimum 2 secondes pour que ce soit vivant
            const duration = Math.min(Math.max(2000, lastMessage.content.length * 50), 10000);

            const timer = setTimeout(() => {
                setIsTalking(false);
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsTalking(false);
        }
    }, [messages, loading]);

    // Fonction pour nettoyer et formater le contenu LaTeX pour ReactMarkdown
    const formatContent = (content: string) => {
        return content
            // Remplace \[ ... \] par $$ ... $$ pour les blocs mathématiques (compatible multilignes)
            .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
            // Remplace \( ... \) par $ ... $ pour les maths en ligne
            .replace(/\\\((.*?)\\\)/g, '$$$1$$')
            // Parfois Perplexity renvoie des \[ sans le backslash échappé correctement dans le string JS
            .replace(/\[(.*?)(?<!\\)\]/g, (match, p1) => {
                // Évite de remplacer les liens markdown [texte](url)
                if (match.includes('](')) return match;
                // Vérifie si ça ressemble à une formule maths (contient =, +, -, \, etc)
                if (/[=\+\-\\\^_{}]/.test(p1)) return `$$${p1}$$`;
                return match;
            });
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };

        // Ajout immédiat du message utilisateur
        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setInput('');
        setLoading(true);
        setIsTalking(false); // Le robot écoute

        try {
            // Petit délai artificiel pour "réfléchir"
            await new Promise(r => setTimeout(r, 600));

            const result: PerplexityResponse = await chatWithRobot(newHistory);

            if (result.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai eu un petit problème technique. Peux-tu reformuler ?" }]);
            }
        } catch (error) {
            console.error('Erreur:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Oups, une erreur est survenue." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return <div className="w-full max-h-[600px] bg-slate-950 rounded-3xl border border-cyan-500/20 animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-slate-950 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-cyan-500/20 overflow-hidden flex flex-col max-h-[600px] min-h-[400px] font-['Exo_2',_sans-serif] relative group">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden ring-1 ring-cyan-500/20 rounded-3xl">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950"></div>
            </div>

            {/* Header / Cyber Professor Zone */}
            <div className="relative shrink-0 bg-slate-900/40 backdrop-blur-xl border-b border-cyan-500/20 p-6 flex flex-col items-center justify-center z-10 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-3xl"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-fuchsia-500/30 rounded-tr-3xl"></div>

                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-slate-950 p-1.5 rounded-full ring-2 ring-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        <RobotAvatar
                            isTalking={isTalking}
                            width={80}
                            height={80}
                        />
                    </div>
                    {/* Status Ring */}
                    <div className={`absolute -inset-1 border-2 border-dashed rounded-full ${isTalking ? 'border-fuchsia-500 animate-[spin_10s_linear_infinite]' : 'border-cyan-500/50 animate-[spin_20s_linear_infinite]'}`}></div>
                </div>

                <div className="text-center mt-4">
                    <h2 className="text-xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 uppercase font-['Orbitron',_sans-serif]">
                        Cyber-Tutor <span className="text-xs align-top opacity-50">PRO</span>
                    </h2>
                </div>

                <div className="absolute top-4 right-6">
                    {loading && (
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Zone de Chat */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-transparent text-slate-200 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="text-center mt-12 max-w-lg mx-auto">
                        <p className="mb-4 text-xl font-medium text-cyan-100">Initialisation du module pédagogique...</p>
                        <p className="text-sm text-slate-400 mb-10 font-mono">
                            // En attente de données d'entrée.<br />
                            // Prêt à analyser tes questions mathématiques.
                        </p>


                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex w-full animate-message ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`relative max-w-[85%] px-7 py-6 text-sm backdrop-blur-md border transition-all duration-300 ${msg.role === 'user'
                                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-50 rounded-2xl rounded-tr-none shadow-[0_0_30px_rgba(6,182,212,0.1)]'
                                : 'bg-slate-900/60 border-slate-700/50 text-slate-200 rounded-3xl rounded-tl-none shadow-2xl'
                                }`}
                            style={{
                                clipPath: msg.role === 'user'
                                    ? 'polygon(0% 0%, 95% 0%, 100% 15%, 100% 100%, 0% 100%)'
                                    : 'polygon(5% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 15%)'
                            }}
                        >
                            {/* Decorative Corner Tag */}
                            <div className={`absolute top-0 ${msg.role === 'user' ? 'right-0 bg-cyan-500' : 'left-0 bg-fuchsia-500'} w-1 h-6 opacity-50`}></div>

                            <div className={`leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap font-medium tracking-wide' : ''}`}>
                                {msg.role === 'user' ? (
                                    <div className="flex items-start gap-3">
                                        <span className="flex-1 font-['Exo_2',_sans-serif] text-lg text-cyan-50">
                                            {msg.content}
                                        </span>
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-mono text-cyan-400">ID</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-4 opacity-50">
                                            <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></div>
                                            <span className="text-[10px] uppercase tracking-widest font-mono">Transmitting...</span>
                                        </div>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-[15px] leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-2 text-slate-300" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-2 text-slate-300" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-6 mt-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 font-['Orbitron'] tracking-wide" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-200 font-['Orbitron']" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-3 mt-5 text-fuchsia-300 font-['Orbitron']" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-fuchsia-500/50 pl-6 py-4 my-6 bg-fuchsia-500/10 rounded-r-xl italic text-fuchsia-50 font-medium" {...props} />,
                                                code: ({ node, className, ...props }) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const isInline = !match && !String(props.children).includes('\n');
                                                    return isInline
                                                        ? <code className="bg-cyan-950/50 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 text-xs font-mono" {...props} />
                                                        : <div className="relative my-6 group">
                                                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 blur opacity-75"></div>
                                                            <code className="relative block bg-slate-950 p-6 rounded-xl text-xs font-mono overflow-x-auto border border-white/10 text-cyan-50" {...props} />
                                                        </div>;
                                                },
                                                a: ({ node, ...props }) => <a className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 transition-all" target="_blank" rel="noopener noreferrer" {...props} />
                                            }}
                                        >
                                            {formatContent(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Zone - Compact & Efficient */}
            <div className="p-4 bg-slate-900/90 backdrop-blur-3xl border-t border-cyan-500/40 shrink-0 z-20 relative">
                <form onSubmit={handleSendMessage} className="relative w-full mx-auto">
                    <div className="relative group overflow-hidden bg-black/40 border border-white/10 rounded-2xl p-2 transition-all duration-700 focus-within:border-cyan-400 focus-within:bg-black/60 focus-within:shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                        <div className="relative flex flex-col gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Pose ta question ici..."
                                className="w-full bg-transparent border-none text-slate-100 placeholder-slate-600 focus:ring-0 px-4 py-3 resize-none text-base leading-relaxed min-h-[60px] max-h-[150px] font-['Exo_2'] tracking-wide"
                                disabled={loading}
                            />

                            <div className="flex justify-between items-center px-2 pb-1">
                                <div className="flex items-center gap-2 text-[8px] text-slate-600 font-mono tracking-widest uppercase">
                                    <span className="flex items-center gap-1">
                                        <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
                                        System Active
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="relative flex items-center gap-2 px-6 py-2 group/btn overflow-hidden rounded-xl transition-all active:scale-95 disabled:opacity-30"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 group-hover/btn:from-cyan-500 group-hover/btn:to-blue-600 transition-all"></div>
                                    <span className="relative text-white font-bold tracking-wider uppercase text-xs">Envoyer</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="relative w-4 h-4 text-white transition-transform duration-300 group-hover/btn:translate-x-1">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
