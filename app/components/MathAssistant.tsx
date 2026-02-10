'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';
import MathGraph, { GraphPoint } from './MathGraph';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathAssistantProps {
    baseContext?: string;
}

export default function MathAssistant({ baseContext }: MathAssistantProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !loading) {
            setIsTalking(true);
            const duration = Math.min(Math.max(2000, lastMessage.content.length * 50), 10000);
            const timer = setTimeout(() => setIsTalking(false), duration);
            return () => clearTimeout(timer);
        } else {
            setIsTalking(false);
        }
    }, [messages, loading]);

    const formatContent = (content: string) => {
        // Cache les graphiques @@@...@@@ et les anciens tags FIGURE
        const cleaned = content.replace(/@@@[\s\S]*?@@@/g, '').replace(/\[FIGURE:[\s\S]*?\]/gi, '');
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
        // Détecteur spécial @@@ pour isoler le graphique
        const match = content.match(/@@@([\s\S]*?)@@@/);

        if (match) {
            try {
                const raw = match[1].replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');
                const sections = raw.split('|').map(s => s.trim()).filter(s => s.length > 0);

                const title = (sections[0]?.includes(',') || sections[0]?.includes('domain:')) ? "Analyse Graphique" : sections[0];
                const points: GraphPoint[] = [];
                let domain = { x: [-5, 5] as [number, number], y: [-4, 4] as [number, number] };

                sections.forEach(sec => {
                    const low = sec.toLowerCase();
                    if (low.startsWith('domain:')) {
                        const d = low.replace('domain:', '').split(',').map(Number);
                        if (d.length >= 4) domain = { x: [d[0], d[1]], y: [d[2], d[3]] };
                    } else if (sec.includes(',')) {
                        const p = sec.split(',');
                        if (p.length >= 2) {
                            points.push({
                                x: parseFloat(p[0]),
                                y: parseFloat(p[1]),
                                type: p[2]?.includes('open') ? 'open' : p[2]?.includes('closed') ? 'closed' : undefined
                            });
                        }
                    }
                });

                if (points.length > 0) {
                    return (
                        <div className="w-full animate-in zoom-in duration-700">
                            <MathGraph points={points} domain={domain} title={title} />
                        </div>
                    );
                }
            } catch (e) {
                console.error("Erreur décodeur @@@:", e);
            }
        }

        // Fallback Cercle Trigonométrique
        if (content.includes('TrigonometricCircle')) {
            const angleMatch = content.match(/angle=(-?\d+)/);
            const angleDeg = angleMatch ? parseInt(angleMatch[1]) : 45;
            const angleRad = (angleDeg * Math.PI) / 180;
            const px = 100 * Math.cos(angleRad);
            const py = -100 * Math.sin(angleRad);
            return (
                <div className="my-10 p-10 bg-slate-900/40 rounded-[3rem] border border-cyan-500/30 flex flex-col items-center shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                    <span className="text-[11px] text-cyan-400 font-mono mb-10 uppercase tracking-[0.6em] font-bold z-10">Cercle Trigonométrique • {angleDeg}°</span>
                    <svg width="280" height="280" viewBox="-140 -140 280 280" className="z-10 drop-shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                        <circle cx="0" cy="0" r="100" fill="none" stroke="#0891b2" strokeWidth="4" />
                        <line x1="0" y1="0" x2={px} y2={py} stroke="white" strokeWidth="2" />
                        <circle cx={px} cy={py} r="6" fill="#06b6d4" className="animate-pulse" />
                    </svg>
                </div>
            );
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
        setMessages(prev => [...prev, { role: 'assistant', content: "✨ *Analyse photonique en cours... Je scanne votre image.*" }]);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const mimeType = file.type;
                const { analyzeMathImage } = await import('@/lib/gemini');
                const transcribedText = await analyzeMathImage(base64Data, mimeType);

                const userMessage: ChatMessage = { role: 'user', content: `[IMAGE SCANNEE]\n\n${transcribedText}` };
                const newMessages = [...messages, userMessage];
                setMessages(newMessages);
                setIsScanning(false);
                await startStreamingResponse(newMessages);
            };
        } catch (error) {
            setIsScanning(false);
            setLoading(false);
        }
    };

    const startStreamingResponse = async (msgs: ChatMessage[]) => {
        setLoading(true);
        setIsTalking(true);
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch('/api/perplexity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: msgs, context: baseContext }),
            });

            if (!response.ok) throw new Error('Erreur Stream');
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    fullContent += chunk;
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                        return updated;
                    });
                }
            }
        } catch (error) {
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: "Désolé, une erreur est survenue." };
                return updated;
            });
        } finally {
            setLoading(false);
            setIsTalking(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || isScanning) return;
        const userMessage: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        await startStreamingResponse(newMessages);
    };

    if (!mounted) return <div className="w-full h-full bg-slate-950 rounded-3xl animate-pulse"></div>;

    return (
        <div className="w-full mx-auto bg-[#020617] rounded-3xl border border-cyan-500/10 overflow-hidden flex flex-col h-full font-['Exo_2',_sans-serif] relative shadow-2xl">
            <div className="shrink-0 bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 px-8 py-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-cyan-400/80 font-['Orbitron']">mimimaths@i</span>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Double IA Active</div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar relative">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-[0.08] select-none">
                        <div className="text-[120px] mb-8">📐</div>
                        <p className="text-sm font-mono uppercase tracking-[1em] text-cyan-400">Intelligence Active</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
                        <div className={`max-w-[96%] px-8 py-6 text-[18px] rounded-[2.5rem] leading-relaxed shadow-2xl ${msg.role === 'user'
                            ? 'bg-blue-600/10 border border-blue-500/20 text-blue-50 rounded-tr-none'
                            : 'bg-slate-900/70 border border-slate-800 text-slate-100 rounded-tl-none'}`}>
                            <MathFigure content={msg.content} />
                            <div className="prose prose-invert prose-cyan max-w-none">
                                {msg.role === 'assistant' && msg.content === '' && loading ? (
                                    <div className="flex items-center gap-3 text-cyan-400 font-mono text-sm animate-pulse">
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                        <span className="ml-2 uppercase tracking-widest text-[10px] font-bold">mimimaths@i réfléchit...</span>
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }) => <p className="mb-5 last:mb-0 leading-[1.8]" {...props} />,
                                            code: ({ node, className, ...props }) => <code className="bg-black/60 px-2 py-1 rounded-lg text-[15px] font-mono text-cyan-300" {...props} />
                                        }}
                                    >
                                        {formatContent(msg.content)}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-20" />
            </div>

            <div className="shrink-0 p-8 pt-12 bg-slate-950/95 border-t border-white/5 relative z-30">
                <div className="absolute -top-20 left-8 flex items-end gap-6 pointer-events-none">
                    <div className="relative bg-black p-1.5 rounded-full ring-[4px] ring-cyan-500/40 shadow-2xl">
                        <RobotAvatar isTalking={isTalking} width={100} height={100} />
                    </div>
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-4 items-end max-w-7xl mx-auto pl-32 relative">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-[2rem] flex items-center pr-4">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder={isScanning ? "Analyse..." : "Expliquez votre problème..."}
                            className="flex-1 bg-transparent border-none text-slate-50 px-8 py-5 resize-none text-[18px] min-h-[60px] max-h-[160px] focus:ring-0"
                            disabled={loading || isScanning}
                        />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 hover:text-cyan-400 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                        </button>
                    </div>
                    <button type="submit" disabled={loading || !input.trim() || isScanning} className="bg-gradient-to-br from-cyan-600 to-indigo-800 text-white rounded-full h-[64px] w-[64px] flex items-center justify-center shadow-lg active:scale-95 transition-all">
                        {loading && !isScanning ? (
                            <div className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
