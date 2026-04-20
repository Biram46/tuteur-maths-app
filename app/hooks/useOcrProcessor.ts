'use client';

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/lib/perplexity';

// ─── Utilitaire : conversion PDF → images (côté client via pdfjs-dist) ────────

async function convertPdfToImages(file: File): Promise<{ base64: string; mimeType: string }[]> {
    const pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsModule.getDocument({ data: arrayBuffer }).promise;
    const images: { base64: string; mimeType: string }[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        images.push({ base64: canvas.toDataURL('image/jpeg', 0.9).split(',')[1], mimeType: 'image/jpeg' });
    }

    return images;
}

// ─── Hook useOcrProcessor ─────────────────────────────────────────────────────

export interface UseOcrProcessorReturn {
    isScanning: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handlePaste: (e: React.ClipboardEvent) => Promise<void>;
}

export function useOcrProcessor(
    onTranscription: (text: string, newMessages: ChatMessage[]) => Promise<void>,
    messages: ChatMessage[],
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setLoading: (v: boolean) => void,
    levelLabel?: string
): UseOcrProcessorReturn {
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null!);

    const processFile = useCallback(async (file: File) => {
        setIsScanning(true);
        setLoading(true);
        const isPdf = file.type === 'application/pdf';

        // Message visuel immédiat
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✨ *Analyse photonique en cours... Je scanne votre ${isPdf ? 'document PDF' : 'image (capture)'}.*`
        }]);

        try {
            if (file.size > 20 * 1024 * 1024) throw new Error('Le fichier est trop volumineux (max 20 Mo).');

            let imagesToProcess: { base64: string; mimeType: string }[];

            if (isPdf) {
                try {
                    imagesToProcess = await convertPdfToImages(file);
                } catch {
                    // Fallback : envoyer le PDF directement au serveur (pdf-parse + Gemini)
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/upload-homework', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.text) {
                        const userMessage: ChatMessage = { role: 'user', content: `📄 **Document PDF :**\n\n${data.text}` };
                        const newMessages = [...messages, userMessage];
                        setMessages(newMessages);
                        setIsScanning(false);
                        setLoading(false);
                        await onTranscription(data.text, newMessages);
                        return;
                    }
                    throw new Error("Impossible de lire le PDF. Essayez une capture d'écran.");
                }
            } else {
                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = () => reject(new Error("Erreur lors de la lecture de l'image."));
                });
                imagesToProcess = [{ base64: base64Data, mimeType: file.type }];
            }

            // Envoyer les images directement à Claude vision (sans transcription intermédiaire)
            const visionRes = await fetch('/api/vision-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: imagesToProcess, level_label: levelLabel }),
            });

            if (!visionRes.ok) {
                const err = await visionRes.json().catch(() => ({}));
                throw new Error(err.error || "Erreur lors de l'analyse visuelle");
            }

            // Supprimer le message de scanning
            setMessages(prev => prev.filter(m =>
                !(m.role === 'assistant' && m.content.includes('Analyse photonique en cours'))
            ));

            // Lire la réponse en streaming
            const reader = visionRes.body!.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';

            setMessages(prev => [...prev.filter(m =>
                !(m.role === 'assistant' && m.content.includes('Analyse photonique en cours'))
            ), { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                assistantContent += decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                });
            }

            setIsScanning(false);
            setLoading(false);
            return;

        } catch (error: any) {
            console.error('Scan Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ **Erreur :** ${error.message || 'Impossible de scanner le document.'}`
            }]);
            setIsScanning(false);
            setLoading(false);
        }
    }, [messages, setMessages, setLoading, onTranscription]);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
        e.target.value = ''; // reset pour permettre le même fichier
    }, [processFile]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1 || items[i].type === 'application/pdf') {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    await processFile(file);
                    break;
                }
            }
        }
    }, [processFile]);

    return { isScanning, fileInputRef, handleFileUpload, handlePaste };
}
