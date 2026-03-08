'use client';

import React, { memo, useCallback } from 'react';
import { ChatMessage } from '@/lib/perplexity';

interface MessageItemProps {
    msg: ChatMessage;
    index: number;
    loading: boolean;
    speakingIndex: number | null;
    onSpeak: (content: string, index: number, audio?: string) => void;
    renderContent: (content: string) => React.ReactNode;
}

/**
 * Composant mémoïsé représentant un seul message du chat.
 *
 * La mémoïsation garantit que les anciens messages ne sont PAS re-rendus
 * lorsque l'utilisateur tape dans l'input (state 'input' change dans le parent)
 * ou pendant le streaming du dernier message.
 *
 * Un message ne se re-rend que si :
 *   - son contenu change (streaming du message courant)
 *   - speakingIndex change (bouton audio actif/inactif)
 *   - loading change (spinner de réflexion)
 */
const MessageItem = memo(function MessageItem({
    msg,
    index,
    loading,
    speakingIndex,
    onSpeak,
    renderContent,
}: MessageItemProps) {
    const handleSpeak = useCallback(() => {
        onSpeak(msg.content, index, msg.audio);
    }, [msg.content, msg.audio, index, onSpeak]);

    const isUser = msg.role === 'user';
    const isThinking = !isUser && (msg.content === '' || msg.content === '...') && loading;

    return (
        <div
            id={`msg-${index}`}
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}
        >
            <div
                className={`max-w-[90%] px-5 py-4 text-[15px] rounded-2xl leading-relaxed relative group ${isUser
                        ? 'bg-blue-600/10 border border-blue-500/20 rounded-tr-none'
                        : 'bg-slate-900/50 border border-slate-800/50 rounded-tl-none'
                    }`}
                style={{ color: isUser ? '#eff6ff' : '#e2e8f0' }}
            >
                {/* Bouton audio (messages assistant uniquement) */}
                {!isUser && msg.content !== '...' && (
                    <button
                        onClick={handleSpeak}
                        className={`absolute -right-10 top-0 p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100 ${speakingIndex === index ? 'text-cyan-400 opacity-100' : ''
                            }`}
                        aria-label="Écouter ce message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    </button>
                )}

                <div className="max-w-none w-full overflow-hidden text-[15px] leading-relaxed" style={{ color: '#e2e8f0' }}>
                    {isThinking ? (
                        /* Spinner "Réflexion photonique" */
                        <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] animate-pulse py-4">
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                            <span className="uppercase tracking-widest font-bold">Réflexion photonique...</span>
                        </div>
                    ) : (
                        <div className="message-content-wrapper space-y-4">
                            {renderContent(msg.content)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparaison personnalisée : ne re-rendre QUE si ces props changent
    return (
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.msg.role === nextProps.msg.role &&
        prevProps.speakingIndex === nextProps.speakingIndex &&
        prevProps.loading === nextProps.loading &&
        prevProps.renderContent === nextProps.renderContent &&
        prevProps.onSpeak === nextProps.onSpeak
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
