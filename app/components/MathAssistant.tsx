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
 * Expérience immersive, ultra-stable et plein écran.
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
        // Cercle Trigonométrique Dynamique Professionnel
        if (content.includes('[FIGURE: TrigonometricCircle')) {
            // Extraction de l'angle si présent, sinon 45° par défaut
            const angleMatch = content.match(/angle=(-?\d+)/);
            const angleDeg = angleMatch ? parseInt(angleMatch[1]) : 45;
            const angleRad = (angleDeg * Math.PI) / 180;

            // Coordonnées du point sur le cercle (rayon 100)
            const px = 100 * Math.cos(angleRad);
            const py = -100 * Math.sin(angleRad); // Inversion Y pour le SVG

            return (
                <div className="my-10 p-10 bg-slate-900/40 rounded-[3rem] border border-cyan-500/30 flex flex-col items-center shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
                    <span className="text-[11px] text-cyan-400 font-mono mb-10 uppercase tracking-[0.6em] font-bold z-10">
                        Cercle Trigonométrique • θ = {angleDeg}°
                    </span>

                    <svg width="280" height="280" viewBox="-140 -140 280 280" className="drop-shadow-[0_0_25px_rgba(6,182,212,0.3)] z-10">
                        {/* Axes avec flèches */}
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
                            </marker>
                        </defs>

                        <line x1="-130" y1="0" x2="130" y2="0" stroke="white" strokeWidth="1" opacity="0.3" markerEnd="url(#arrow)" />
                        <line x1="0" y1="130" x2="0" y2="-130" stroke="white" strokeWidth="1" opacity="0.3" markerEnd="url(#arrow)" />

                        {/* Le Cercle principal */}
                        <circle cx="0" cy="0" r="100" fill="none" stroke="#0891b2" strokeWidth="4" className="filter drop-shadow-[0_0_5px_#06b6d4]" />

                        {/* Projections du point */}
                        <line x1={px} y1="0" x2={px} y2={py} stroke="cyan" strokeWidth="1" strokeDasharray="4" opacity="0.6" />
                        <line x1="0" y1={py} x2={px} y2={py} stroke="cyan" strokeWidth="1" strokeDasharray="4" opacity="0.6" />

                        {/* Rayon vers le point */}
                        <line x1="0" y1="0" x2={px} y2={py} stroke="white" strokeWidth="2" opacity="0.8" />
                        <circle cx={px} cy={py} r="6" fill="#06b6d4" className="animate-pulse shadow-lg" />

                        {/* Labels Cos / Sin sur les axes */}
                        <text x={px} y={py > 0 ? -10 : 15} fill="cyan" fontSize="10" textAnchor="middle" fontWeight="bold">M</text>
                        <text x="120" y="-5" fill="#06b6d4" fontSize="10" opacity="0.8" fontWeight="bold">cos</text>
                        <text x="5" y="-120" fill="#06b6d4" fontSize="10" opacity="0.8" fontWeight="bold">sin</text>

                        {/* Graduations principales */}
                        {[0, 90, 180, 270].map((a) => {
                            const r = (a * Math.PI) / 180;
                            return (
                                <text
                                    key={a}
                                    x={115 * Math.cos(r)}
                                    y={-115 * Math.sin(r) + 4}
                                    fill="white"
                                    fontSize="10"
                                    textAnchor="middle"
                                    opacity="0.5"
                                >
                                    {a === 0 ? "0" : a === 90 ? "π/2" : a === 180 ? "π" : "3π/2"}
                                </text>
                            );
                        })}
                    </svg>

                    <div className="mt-8 flex gap-8">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Valeur Cosinus</span>
                            <span className="text-sm text-cyan-400 font-mono">{(Math.cos(angleRad)).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Valeur Sinus</span>
                            <span className="text-sm text-cyan-400 font-mono">{(Math.sin(angleRad)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            );
        }

        // Graphe de fonction (Simplifié)
        if (content.includes('[FIGURE: FunctionGraph:')) {
            const match = content.match(/\[FIGURE: FunctionGraph: (.*?)\]/);
            const func = match ? match[1] : 'f(x)';
            return (
                <div className="my-8 p-8 bg-slate-900/60 rounded-[2.5rem] border border-blue-500/20 flex flex-col items-center shadow-2xl backdrop-blur-md">
                    <span className="text-[11px] text-blue-400 font-mono mb-8 uppercase tracking-[0.4em] font-bold">Analyse Graphique : {func}</span>
                    <svg width="300" height="200" viewBox="-10 -100 220 120" className="overflow-visible">
                        {/* Axes */}
                        <line x1="0" y1="0" x2="200" y2="0" stroke="white" strokeWidth="1.5" opacity="0.3" />
                        <line x1="0" y1="20" x2="0" y2="-100" stroke="white" strokeWidth="1.5" opacity="0.3" />

                        {/* Courbe illustrative (Parabole ou Linéaire selon le texte) */}
                        <path
                            d={func.includes('x²') || func.includes('^2')
                                ? "M 20 -80 Q 100 20 180 -80"
                                : "M 20 -20 L 180 -80"}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />

                        {/* Points de données simulés */}
                        <circle cx="100" cy={func.includes('x²') ? "0" : "-50"} r="4" fill="#60a5fa" />
                    </svg>
                    <p className="mt-6 text-[10px] text-slate-500 italic">Représentation schématique du comportement de la fonction</p>
                </div>
            )
        }

        // Arbre de probabilités
        if (content.includes('[FIGURE: TreeDiagram')) {
            return (
                <div className="my-8 p-8 bg-slate-900/60 rounded-[2.5rem] border border-purple-500/20 flex flex-col items-center shadow-2xl backdrop-blur-md">
                    <span className="text-[11px] text-purple-400 font-mono mb-8 uppercase tracking-[0.4em] font-bold">Structure Stochastique</span>
                    <svg width="250" height="150" viewBox="0 0 250 150">
                        <line x1="20" y1="75" x2="100" y2="30" stroke="white" strokeWidth="1.5" opacity="0.3" />
                        <line x1="20" y1="75" x2="100" y2="120" stroke="white" strokeWidth="1.5" opacity="0.3" />
                        <circle cx="100" cy="30" r="15" fill="#a855f7" opacity="0.2" stroke="#a855f7" strokeWidth="1" />
                        <circle cx="100" cy="120" r="15" fill="#a855f7" opacity="0.2" stroke="#a855f7" strokeWidth="1" />
                        <text x="100" y="34" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">A</text>
                        <text x="100" y="124" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">B</text>
                        <text x="50" y="45" fill="#c084fc" fontSize="9" fontWeight="bold">p</text>
                        <text x="50" y="105" fill="#c084fc" fontSize="9" fontWeight="bold">1-p</text>
                    </svg>
                </div>
            )
        }
        return null;
    };

    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setLoading(true);
        setMessages(prev => [...prev, { role: 'assistant', content: "✨ *Analyse photonique en cours... Je scanne votre image pour extraire l'énoncé.*" }]);

        try {
            // Conversion en base64 pour Gemini
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const mimeType = file.type;

                try {
                    const { analyzeMathImage } = await import('@/lib/gemini');
                    const transcribedText = await analyzeMathImage(base64Data, mimeType);

                    // Envoyer le texte transcrit comme si l'utilisateur l'avait tapé
                    const userMessage: ChatMessage = {
                        role: 'user',
                        content: `[IMAGE SCANNEE]\n\n${transcribedText}`
                    };

                    const newMessages = [...messages, userMessage];
                    setMessages(newMessages);

                    const result: AiResponse = await chatWithRobot(newMessages, baseContext);
                    if (result.success) {
                        setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
                    } else {
                        setMessages(prev => [...prev, { role: 'assistant', content: "J'ai bien lu l'image, mais j'ai eu un souci pour l'analyser mathématiquement. Pouvez-vous préciser votre question ?" }]);
                    }
                } catch (err) {
                    setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, la lecture de l'image a échoué. Assurez-vous qu'elle est bien éclairée et lisible." }]);
                } finally {
                    setIsScanning(false);
                    setLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
        } catch (error) {
            setIsScanning(false);
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || isScanning) return;

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

    if (!mounted) return <div className="w-full h-full bg-slate-950 rounded-3xl border border-cyan-500/20 animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-[#020617] rounded-3xl border border-cyan-500/10 overflow-hidden flex flex-col h-full font-['Exo_2',_sans-serif] relative shadow-[0_0_100px_rgba(0,0,0,0.9)] isolate group/assistant">
            {/* Background Decor - Quantum Grid */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent)]">
                <div className="w-full h-full bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:60px_60px]"></div>
            </div>

            {/* Top Bar - Session Status */}
            <div className="shrink-0 bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 px-8 py-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-4 h-4 bg-cyan-500/40 rounded-full blur-md animate-ping"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-cyan-400/80 font-['Orbitron']">mimimaths@i // Core.Vision.Active</span>
                </div>
            </div>

            {/* Chat Zone - Ultra-Spacious for Math */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar scroll-smooth overflow-x-hidden relative">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-[0.08] text-center px-10 select-none">
                        <div className="text-[120px] mb-8 transform scale-110 drop-shadow-2xl">📐</div>
                        <p className="text-sm font-mono uppercase tracking-[1em] text-cyan-400">Intelligence Tutorielle Active</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className={`max-w-[96%] px-8 py-6 text-[18px] rounded-[2.5rem] leading-relaxed shadow-2xl transition-all duration-300 ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 text-blue-50 rounded-tr-none'
                            : 'bg-slate-900/70 border border-slate-800 text-slate-100 rounded-tl-none ring-1 ring-white/5 backdrop-blur-xl'
                            }`}>
                            <MathFigure content={msg.content} />
                            <div className="prose prose-invert prose-cyan max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-5 last:mb-0 leading-[1.8]" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-8 mb-4 space-y-2 text-slate-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-8 mb-4 space-y-2 text-slate-300" {...props} />,
                                        h1: ({ ...props }) => <h1 className="text-2xl font-bold mb-6 text-cyan-300 font-['Orbitron'] border-b border-white/5 pb-2" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-xl font-bold mb-4 text-cyan-400" {...props} />,
                                        blockquote: ({ ...props }) => <blockquote className="border-l-4 border-fuchsia-500/50 pl-6 py-4 my-8 bg-fuchsia-500/5 italic text-slate-200 rounded-r-3xl shadow-lg" {...props} />,
                                        code: ({ node, className, ...props }) => (
                                            <code className="bg-black/60 px-2 py-1 rounded-lg text-[15px] font-mono text-cyan-300 border border-white/10" {...props} />
                                        )
                                    }}
                                >
                                    {formatContent(msg.content)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-20" />
            </div>

            {/* Bottom Stable Zone - Avatar & Input */}
            <div className="shrink-0 p-8 pt-12 bg-slate-950/95 backdrop-blur-3xl border-t border-white/5 relative z-30">

                {/* Robot Avatar - Massive & Fixed */}
                <div className="absolute -top-20 left-8 flex items-end gap-6 pointer-events-none transition-all duration-700">
                    <div className="relative group/robot">
                        <div className="absolute -inset-4 bg-cyan-400/20 rounded-full blur-2xl animate-pulse group-hover/robot:bg-cyan-400/30 transition-all duration-1000"></div>
                        <div className="relative bg-black p-1.5 rounded-full ring-[4px] ring-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.5)] transform group-hover/robot:scale-105 transition-transform duration-500">
                            <RobotAvatar isTalking={isTalking} width={100} height={100} />
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex gap-4 items-end max-w-7xl mx-auto pl-32 relative"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />

                    <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-[2rem] focus-within:border-cyan-500/50 focus-within:bg-black/60 transition-all duration-500 group shadow-2xl flex items-center pr-4">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={isScanning ? "Analyse de la photo en cours..." : "Expliquez votre problème ou scannez un exercice..."}
                            className="flex-1 bg-transparent border-none text-slate-50 placeholder-slate-700 focus:ring-0 px-8 py-5 resize-none text-[18px] min-h-[60px] max-h-[160px] font-sans scrollbar-hide"
                            disabled={loading || isScanning}
                        />

                        {/* Camera/Scan Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || isScanning}
                            className="p-3 text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded-full transition-all duration-300"
                            title="Scanner un exercice"
                        >
                            {isScanning ? (
                                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !input.trim() || isScanning}
                        className="bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 hover:from-cyan-500 disabled:opacity-20 text-white rounded-[1.8rem] transition-all h-[64px] w-[64px] flex items-center justify-center shrink-0 shadow-[0_10px_30px_rgba(6,182,212,0.4)] active:scale-90 border border-white/10"
                    >
                        {loading && !isScanning ? (
                            <div className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
