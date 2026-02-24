'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';
import MathGraph, { GraphPoint } from './MathGraph';
import MathTree, { TreeNode } from './MathTree';
import MathTable from './MathTable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { fixLatexContent } from '@/lib/latex-fixer';


interface MathAssistantProps {
    baseContext?: string;
}

export default function MathAssistant({ baseContext }: MathAssistantProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

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

    // Fonction pour extraire et rendre les figures @@@
    const renderFigure = (rawBlock: string) => {
        try {
            // Remplacement des tirets longs et espaces insécables
            const raw = rawBlock.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');

            // Séparation par pipe | OU par retour à la ligne \n
            const sections = raw.split(/[|\n]/).map(s => s.trim()).filter(s => s.length > 0);

            if (sections.length === 0) return null;

            // --- CAS 1 : ARBRE DE PROBABILITÉS ---
            if (sections[0].toLowerCase().includes('tree') || sections[0].toLowerCase().includes('arbre')) {
                const treeNodesMap = new Map<string, TreeNode>();
                const title = sections[0].split(':')[1]?.trim() || "Arbre de Probabilités";
                treeNodesMap.set('root', { id: 'root', label: 'Ω' });

                sections.slice(1).forEach(sec => {
                    if (sec.toLowerCase().includes(':root')) {
                        treeNodesMap.get('root')!.label = sec.split(':')[0].trim();
                        return;
                    }

                    // Nettoyage LaTeX commun pour les labels (Probabilités)
                    const cleanSec = sec
                        .replace(/\\(bar|overline)\{([^}]*)\}/g, '$2\u0305') // \bar{C} -> C\u0305
                        .replace(/\\(bar|overline)\s+([a-zA-Z0-9])/g, '$2\u0305') // \bar C -> C\u0305
                        .replace(/([a-zA-Z0-9])\^\{(c|\\complement|\\complementaire)\}/g, '$1\u0305') // C^{c} -> C\u0305
                        .replace(/([a-zA-Z0-9])\^(c|\\complement|\\complementaire)/g, '$1\u0305') // C^c -> C\u0305
                        .replace(/\\text\{([^}]*)\}/g, '$1')
                        .replace(/\$/g, '')
                        .trim();

                    if (!cleanSec) return;

                    // Séparation Chemin / Valeur (on cherche la virgule ou le deux-points de séparation)
                    // Mais attention, en français on peut avoir "0,5" comme valeur.
                    // On privilégie la première occurrence qui ressemble à un séparateur de structure.
                    let pathPart = cleanSec;
                    let val: string | undefined = undefined;

                    // On cherche d'abord s'il y a un "Chemin, Valeur" ou "Chemin : Valeur"
                    // On splitte s'il y a une virgule suivie d'un chiffre ou d'un espace+chiffre
                    // Ou simplement la première virgule si on n'a pas de -> complexe.
                    const commaMatch = cleanSec.match(/,(\s*[\d\\])/);
                    const colonMatch = cleanSec.match(/:(\s*[\d\\])/);

                    let splitIndex = -1;
                    if (commaMatch) splitIndex = commaMatch.index!;
                    else if (colonMatch) splitIndex = colonMatch.index!;
                    else if (cleanSec.includes(',')) splitIndex = cleanSec.indexOf(',');

                    if (splitIndex !== -1) {
                        pathPart = cleanSec.substring(0, splitIndex).trim();
                        val = cleanSec.substring(splitIndex + 1).trim();
                    }

                    const parts = pathPart.split('->').map(p => p.trim());
                    let currentParentId = 'root';
                    let cumulativePath = 'root';

                    parts.forEach((label, idx) => {
                        // On crée un ID basé sur le chemin pour éviter les collisions entre nœuds de même nom
                        cumulativePath += `|${label}`;
                        const isLast = (idx === parts.length - 1);

                        if (!treeNodesMap.has(cumulativePath)) {
                            treeNodesMap.set(cumulativePath, {
                                id: cumulativePath,
                                label: label,
                                parent: currentParentId,
                                value: isLast ? val : undefined
                            });
                        } else if (isLast && val) {
                            treeNodesMap.get(cumulativePath)!.value = val;
                        }
                        currentParentId = cumulativePath;
                    });
                });
                return <MathTree key={rawBlock} data={Array.from(treeNodesMap.values())} title={title} />;
            }

            // --- CAS 3 : TABLEAU DE SIGNES / VARIATIONS ---
            const blockLower = rawBlock.toLowerCase();
            if (blockLower.includes('table') || sections.some(s => s.trim().toLowerCase().startsWith('x:'))) {
                let mainTitle = sections[0].toLowerCase().includes('table')
                    ? sections[0].split(':').slice(1).join(':').trim()
                    : "Tableau Mathématique";

                const tableGroups: { xValues: string[], rows: any[] }[] = [];
                let currentXValues: string[] = [];
                let currentRows: any[] = [];

                sections.forEach((sec) => {
                    const low = sec.trim().toLowerCase();
                    if (low.startsWith('x:')) {
                        if (currentXValues.length > 0 && currentRows.length > 0) {
                            tableGroups.push({ xValues: currentXValues, rows: currentRows });
                            currentRows = [];
                        }
                        const valPart = sec.split(':').slice(1).join(':').trim();
                        // Support virgules OU espaces
                        currentXValues = valPart.split(/[\s,]+/).map(v => v.trim()).filter(v => v.length > 0);
                    } else if (low.includes(':') && !low.startsWith('table')) {
                        const rawContent = sec.substring(colonIndex + 1);
                        const content = rawContent.includes(',')
                            ? rawContent.split(',').map(v => v.trim())
                            : rawContent.trim().split(/\s+/).filter(v => v.length > 0);

                        let type: 'sign' | 'variation' = 'sign';
                        let label = prefixAndLabel;

                        if (prefixAndLabel.toLowerCase().startsWith('sign')) {
                            const labelColon = prefixAndLabel.indexOf(':');
                            label = labelColon !== -1 ? prefixAndLabel.substring(labelColon + 1).trim() : prefixAndLabel.substring(4).replace(/^e/i, '').trim();
                            type = 'sign';
                        } else if (prefixAndLabel.toLowerCase().startsWith('var')) {
                            const labelColon = prefixAndLabel.indexOf(':');
                            label = labelColon !== -1 ? prefixAndLabel.substring(labelColon + 1).trim() : prefixAndLabel.substring(3).trim();
                            type = 'variation';
                        }

                        if (content.length > 0) {
                            currentRows.push({ label: label || prefixAndLabel, type, content });
                        }
                    }
                });

                if (currentXValues.length > 0 && currentRows.length > 0) {
                    tableGroups.push({ xValues: currentXValues, rows: currentRows });
                }

                if (tableGroups.length > 0) {
                    return (
                        <div key={rawBlock} className="flex flex-col gap-10 w-full items-center my-10 px-4">
                            {tableGroups.map((group, gIdx) => (
                                <MathTable
                                    key={`${rawBlock}-${gIdx}`}
                                    data={{ xValues: group.xValues, rows: group.rows }}
                                    title={group.rows[0]?.type === 'sign' ? "Tableau de Signes" : "Tableau de Variations"}
                                />
                            ))}
                        </div>
                    );
                }
            }

            // --- CAS 2 : GRAPHIQUE OU GÉOMÉTRIE ---
            const title = (sections[0]?.includes(',') || sections[0]?.includes(':') || sections[0]?.includes('domain:')) ? "Analyse Graphique" : sections[0];
            const points: GraphPoint[] = [];
            const entities: any[] = [];
            let domain = { x: [-5, 5] as [number, number], y: [-4, 4] as [number, number] };
            let hideAxesValue = false;

            // 1. D'abord les métadonnées et points
            sections.forEach(sec => {
                const low = sec.toLowerCase().trim();
                if (low === 'pure' || low === 'hideaxes' || low === 'geometry') hideAxesValue = true;
                else if (low.startsWith('domain:')) {
                    const d = low.replace('domain:', '').split(',').map(Number);
                    if (d.length >= 4) domain = { x: [d[0], d[1]], y: [d[2], d[3]] };
                } else if (low.startsWith('point:')) {
                    const p = sec.split(':')[1].split(',');
                    if (p.length >= 3) entities.push({ type: 'point', name: p[0].trim(), x1: parseFloat(p[1]), y1: parseFloat(p[2]) });
                }
            });

            // 2. Ensuite les entités dépendantes (vecteurs, segments, etc.)
            sections.forEach(sec => {
                const low = sec.toLowerCase().trim();
                if (low.startsWith('vector:')) {
                    const p = sec.split(':')[1].split(',');
                    if (p.length >= 5) {
                        entities.push({ type: 'vector', name: p[0].trim(), x1: parseFloat(p[1]), y1: parseFloat(p[2]), x2: parseFloat(p[3]), y2: parseFloat(p[4]) });
                    } else if (p.length === 3) {
                        const pName = p[0].trim();
                        const arg1 = p[1].trim();
                        const arg2 = p[2].trim();

                        const p1 = entities.find(e => e.type === 'point' && e.name === arg1);
                        const p2 = entities.find(e => e.type === 'point' && e.name === arg2);

                        if (p1 && p2) {
                            entities.push({ type: 'vector', name: pName, x1: p1.x1, y1: p1.y1, x2: p2.x1, y2: p2.y1 });
                        } else if (!isNaN(parseFloat(arg1)) && !isNaN(parseFloat(arg2))) {
                            // Format: vector:u,x,y -> part de (0,0)
                            entities.push({ type: 'vector', name: pName, x1: 0, y1: 0, x2: parseFloat(arg1), y2: parseFloat(arg2) });
                        }
                    }
                } else if (low.startsWith('segment:')) {
                    const p = sec.split(':')[1].split(',');
                    if (p.length === 2) {
                        const p1 = entities.find(e => e.type === 'point' && e.name === p[0].trim());
                        const p2 = entities.find(e => e.type === 'point' && e.name === p[1].trim());
                        if (p1 && p2) entities.push({ type: 'segment', x1: p1.x1, y1: p1.y1, x2: p2.x1, y2: p2.y1 });
                    } else if (p.length >= 4) {
                        entities.push({ type: 'segment', x1: parseFloat(p[0]), y1: parseFloat(p[1]), x2: parseFloat(p[2]), y2: parseFloat(p[3]) });
                    }
                } else if (low.startsWith('triangle:')) {
                    const ps = sec.split(':')[1].split(',');
                    if (ps.length >= 3) {
                        const p1 = entities.find(e => e.type === 'point' && e.name === ps[0].trim());
                        const p2 = entities.find(e => e.type === 'point' && e.name === ps[1].trim());
                        const p3 = entities.find(e => e.type === 'point' && e.name === ps[2].trim());
                        if (p1 && p2 && p3) {
                            entities.push({ type: 'segment', x1: p1.x1, y1: p1.y1, x2: p2.x1, y2: p2.y1 });
                            entities.push({ type: 'segment', x1: p2.x1, y1: p2.y1, x2: p3.x1, y2: p3.y1 });
                            entities.push({ type: 'segment', x1: p3.x1, y1: p3.y1, x2: p1.x1, y2: p1.y1 });
                        }
                    }
                } else if (sec.includes(',') && !sec.includes(':')) {
                    const p = sec.split(',');
                    if (p.length >= 2 && !isNaN(parseFloat(p[0]))) {
                        points.push({ x: parseFloat(p[0]), y: parseFloat(p[1]), type: p[2]?.includes('open') ? 'open' : p[2]?.includes('closed') ? 'closed' : undefined });
                    }
                }
            });

            // Ancienne règle supprimée : if (entities.length > 0 && points.length === 0) hideAxesValue = true;

            if (points.length > 0 || entities.length > 0) {
                return (
                    <div key={rawBlock} className="w-full math-figure-container my-6">
                        <div className="animate-in zoom-in duration-700">
                            <MathGraph points={points} entities={entities} domain={domain} title={title} hideAxes={hideAxesValue} />
                        </div>
                    </div>
                );
            }
        } catch (e) {
            console.error("Erreur de rendu figure:", e);
        }
        return null;
    };

    // Rendu intelligent du message (Texte + Figures intercalées)
    const renderMessageContent = (content: string) => {
        if (!content) return null;

        // 1. Découpage par blocs @@@ ET Blocs de code math-table
        const sections = content.split(/(@@@[\s\S]*?@@@|```math-table[\s\S]*?```|```json[\s\S]*?```)/g);

        return sections.map((section, idx) => {
            // Bloc @@@
            if (section.startsWith('@@@') && section.endsWith('@@@')) {
                const rawBlock = section.substring(3, section.length - 3);
                return renderFigure(rawBlock);
            }

            // Bloc de code math-table ou format texte brut
            const isMathTable = section.includes('math-table') || (section.includes('x:') && (section.includes('sign:') || section.includes('var:')));
            if ((section.startsWith('```math-table') && section.endsWith('```')) || (isMathTable && !section.startsWith('@@@'))) {
                let rawBlock = section;
                if (section.startsWith('```math-table')) {
                    rawBlock = section.substring(13, section.length - 3).trim();
                } else if (section.startsWith('math-table')) {
                    rawBlock = section.substring(10).trim();
                }

                // On s'assure que c'est bien formaté pour renderFigure
                return renderFigure(rawBlock.includes('|') ? `table | ${rawBlock}` : `table | ${rawBlock.replace(/\n/g, ' | ')}`);
            }

            // Bloc JSON qui pourrait être un tableau
            if (section.startsWith('```json') && section.endsWith('```')) {
                try {
                    const rawJson = section.substring(7, section.length - 3);
                    const parsed = JSON.parse(rawJson);
                    if (parsed.xValues || parsed.x) {
                        return <MathTable key={idx} data={{
                            xValues: parsed.xValues || parsed.x || [],
                            rows: parsed.rows || parsed.lines || []
                        }} title={parsed.title || "Tableau JSON"} />;
                    }
                } catch (e) { /* Pas un tableau JSON */ }
            }

            // Rendu Markdown pour le reste
            if (!section.trim()) return null;

            return (
                <div key={idx} className="katex-scroll-wrapper overflow-x-auto overflow-y-visible py-2 custom-scrollbar-horizontal w-full">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed break-words" {...props} />,
                            code: ({ node, className, ...props }) => <code className="bg-black/60 px-1.5 py-0.5 rounded text-[13px] font-mono text-cyan-300" {...props} />
                        }}
                    >
                        {section}
                    </ReactMarkdown>
                </div>
            );
        });
    };


    const [isScanning, setIsScanning] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [speechVolume, setSpeechVolume] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const speechQueue = useRef<string[]>([]);
    const isSpeakingQueue = useRef(false);
    const lastSpokenIndex = useRef(-1);


    // --- RECONNAISSANCE VOCALE (STT) ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.lang = 'fr-FR';
                recognitionRef.current.interimResults = false;

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(prev => prev + (prev ? ' ' : '') + transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = () => setIsRecording(false);
                recognitionRef.current.onend = () => setIsRecording(false);
            }
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) return;
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setIsRecording(true);
            recognitionRef.current.start();
        }
    };

    // --- SYNTHÈSE VOCALE (TTS) ---
    const cleanMathForSpeech = (text: string) => {
        let clean = text
            .replace(/@@@[\s\S]*?@@@/g, '') // Cache les graphiques
            .replace(/\\\[|\\\]/g, ' ')
            .replace(/\$(.*?)\$/g, '$1');

        // FORCE LA PRONONCIATION DES NOMBRES À LA FRANÇAISE (1.7 -> 1 virgule 7) - On le fait tôt
        clean = clean.replace(/(\d)\.(\d)/g, '$1 virgule $2');

        // Traduction des symboles LaTeX (Ordre important : du plus long au plus court)
        const mathMap: Record<string, string> = {
            '\\\\Delta': ' delta ',
            '\\\\alpha': ' alpha ',
            '\\\\beta': ' béta ',
            '\\\\gamma': ' gamma ',
            '\\\\theta': ' théta ',
            '\\\\pi': ' pi ',
            // Racines carrées (gère les cas \sqrt{x}, \sqrt x, \sqrt{1.7}, etc.)
            '\\\\sqrt\\s*\\{([^}]*)\\}': ' racine carrée de $1 ',
            '\\\\sqrt\\s*(\\d+|[a-zA-Z])': ' racine carrée de $1 ',
            '\\\\frac\\{([^}]*)\\}\\{([^}]*)\\}': ' $1 sur $2 ',
            '\\\\left\\(': ' ',
            '\\\\right\\)': ' ',
            '\\\\times': ' fois ',
            '\\\\cdot': ' fois ',
            '\\\\ln': ' hélène ', // Prononciation mathématique courante "ln" -> "hélène" ou "logarithme népérien"
            '\\\\exp': ' exponentielle ',
            '\\\\mathbb\\{R\\}': ' l\'ensemble des réels ',
            '\\\\mathbb\\{N\\}': ' l\'ensemble des entiers naturels ',
            '\\\\mathbb\\{Z\\}': ' l\'ensemble des entiers relatifs ',
            '\\\\mathbb\\{Q\\}': ' l\'ensemble des rationnels ',
            '\\\\mathbb\\{C\\}': ' l\'ensemble des complexes ',
            '\\\\in': ' appartient à ',
            '\\\\notin': ' n\'appartient pas à ',
            '\\\\le': ' inférieur ou égal à ',
            '\\\\leq': ' inférieur ou égal à ',
            '\\\\ge': ' supérieur ou égal à ',
            '\\\\geq': ' supérieur ou égal à ',
            '\\\\neq': ' différent de ',
            '\\\\infty': ' l\'infini ',
            '\\\\approx': ' environ égal à ',
            '\\\\pm': ' plus ou moins ',
            '\\\\cap': ' inter ',
            '\\\\cup': ' union ',
            '\\\\forall': ' pour tout ',
            '\\\\exists': ' il existe ',
            '\\\\Rightarrow': ' implique ',
            '\\\\Leftrightarrow': ' équivaut à ',
            '\\^2': ' au carré ',
            '\\^3': ' au cube ',
            '\\^': ' puissance ',
            '_': ' indice ',
            '\\\\vec\\{([^}]*)\\}': ' vecteur $1 ',
            '\\\\overrightarrow\\{([^}]*)\\}': ' vecteur $1 ',
            '\\\\vec\\s+([a-zA-Z0-9]{1,2})': ' vecteur $1 ',
            '\\\\overrightarrow\\s+([a-zA-Z0-9]{1,2})': ' vecteur $1 ',
            '\\\\overline\\{([^}]*)\\}': ' $1 bar ',
            '\\\\text\\{([^}]*)\\}': ' $1 ',
            '\\\\begin\\{(?:p|b|v)?matrix\\}([\\s\\S]*?)\\\\end\\{(?:p|b|v)?matrix\\}': ' $1 ',
            '\\\\\\\\': ' ',
            '&': ' ',
            '=': ' égale ',
            '\\+': ' plus ',
            '\\b(w)\\b': ' double-vé '
        };

        for (const [pattern, replacement] of Object.entries(mathMap)) {
            try {
                const regex = new RegExp(pattern, 'g');
                clean = clean.replace(regex, replacement);
            } catch (e) {
                // Ignore silent errors for complex regex
            }
        }

        // Correction pour le "y" prononcé en anglais (on le remplace par "i grec" s'il est isolé comme variable)
        clean = clean.replace(/(^|[^a-zA-Z])y([^a-zA-Z]|$)/g, '$1 i-grec $2');

        // Correction pour les numéros de questions (ex: 1) -> "Question 1")
        clean = clean.replace(/(\d+)\)/g, ' $1 ');

        // Correction pour le signe moins "-" qui est parfois lu "dash" ou "minus" en anglais
        clean = clean.replace(/([^\w])(-)(\d|[a-zA-Z])/g, '$1 moins $3');
        clean = clean.replace(/^-(?=\d|[a-zA-Z])/g, 'moins ');
        clean = clean.replace(/(\s)-(\s)/g, ' moins ');

        // Force la prononciation des lettres isolées
        clean = clean.replace(/\b(x|n|k|i|j|a|b|c)\b/gi, (m) => ` ${m} `);

        // Correction pour f(x), g(x), h(x) -> "f de x"
        clean = clean.replace(/([fgh])\((x|t)\)/gi, '$1 de $2');

        // Nettoyage des accolades et backslashes restants
        clean = clean.replace(/\\/g, ' ').replace(/[\{\}]/g, ' ');

        // Forcer la prononciation des lettres séparées pour les vecteurs de type CD
        clean = clean.replace(/vecteur\s+([A-Z])([A-Z])\b/g, ' vecteur $1 $2 ');

        // Nettoyage final des répétitions "vecteur vecteur"
        clean = clean.replace(/vecteur\s+vecteur/gi, 'vecteur');

        // Nettoyage des résidus de commandes LaTeX
        clean = clean.replace(/overrightarrow|overarrow/gi, ' vecteur ');
        clean = clean.replace(/\\begin|\\end|pmatrix|bmatrix|vmatrix|matrix/gi, ' ');

        // Sécurité terminologique Éducation Nationale
        clean = clean.replace(/\bqueue\s+du\s+vecteur\b/gi, 'origine du vecteur');
        clean = clean.replace(/\btête\s+du\s+vecteur\b/gi, 'extrémité du vecteur');
        clean = clean.replace(/\bcomposantes\b/gi, 'coordonnées');

        // Forcer la prononciation de w en isolant les lettres dans les vecteurs
        clean = clean.replace(/\b([uvw])\b/gi, (match) => {
            const low = match.toLowerCase();
            if (low === 'w') return ' double-vé ';
            return ` ${low} `;
        });

        // Correction pour l'égalité et l'addition
        clean = clean.replace(/=/g, ' égale à ').replace(/\+/g, ' plus ');

        // Suppression des doubles espaces
        return clean.replace(/\s+/g, ' ').trim();
    };

    const speakMessage = async (text: string, index: number, audioData?: string): Promise<void> => {
        if (typeof window === 'undefined') return;

        if (speakingIndex === index && index !== -2) {
            audioElement?.pause();
            setSpeakingIndex(null);
            setIsTalking(false);
            return;
        }

        if (!isVoiceEnabled && index !== -1) return;

        audioElement?.pause();
        window.speechSynthesis.cancel();

        return new Promise(async (resolve) => {
            try {
                setSpeakingIndex(index);
                setIsTalking(true);

                let url = "";

                if (audioData) {
                    const byteCharacters = atob(audioData);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'audio/mp3' });
                    url = URL.createObjectURL(blob);
                } else {
                    const cleanedText = cleanMathForSpeech(text);
                    const truncatedText = cleanedText.length > 4000
                        ? cleanedText.substring(0, 4000) + " (texte tronqué)"
                        : cleanedText;

                    const response = await fetch('/api/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: truncatedText, voice: 'nova' }),
                    });

                    if (!response.ok) throw new Error('TTS API failure');
                    const blob = await response.blob();
                    url = URL.createObjectURL(blob);
                }

                const audio = new Audio(url);
                audio.crossOrigin = "anonymous";
                setAudioElement(audio);

                // --- CONFIGURATION ANALYSEUR AUDIO (REUTILISATION) ---
                if (!audioCtxRef.current) {
                    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                    audioCtxRef.current = new AudioContextClass();
                }

                const audioCtx = audioCtxRef.current!;
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                // Création/Reconnexion de l'analyseur
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 32;
                analyserRef.current = analyser;

                const source = audioCtx.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioCtx.destination);
                sourceRef.current = source;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const updateVolume = () => {
                    if (analyserRef.current && isTalking) {
                        analyserRef.current.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / bufferLength;
                        // On amplifie un peu le signal pour que la bouche bouge bien même à bas volume
                        setSpeechVolume(Math.min(1.2, average / 80));
                        animationFrameRef.current = requestAnimationFrame(updateVolume);
                    }
                };

                audio.onplay = () => {
                    setIsTalking(true);
                    updateVolume();
                };

                audio.onended = () => {
                    setSpeakingIndex(null);
                    setIsTalking(false);
                    setSpeechVolume(0);
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                    if (sourceRef.current) sourceRef.current.disconnect();
                    URL.revokeObjectURL(url);
                    if (index === -2) {
                        isSpeakingQueue.current = false;
                        processSpeechQueue();
                    }
                    resolve();
                };

                audio.onerror = () => {
                    setSpeakingIndex(null);
                    setIsTalking(false);
                    setSpeechVolume(0);
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                    if (sourceRef.current) sourceRef.current.disconnect();
                    // Fallback
                    const utterance = new SpeechSynthesisUtterance(cleanMathForSpeech(text));
                    utterance.lang = 'fr-FR';
                    utterance.onstart = () => setIsTalking(true);
                    utterance.onend = () => {
                        setIsTalking(false);
                        if (index === -2) {
                            isSpeakingQueue.current = false;
                            processSpeechQueue();
                        }
                        resolve();
                    };
                    window.speechSynthesis.speak(utterance);
                };

                audio.play().catch((err) => {
                    console.error("Playback failed:", err);
                    // Fallback immédiat si l'audio est bloqué
                    const utterance = new SpeechSynthesisUtterance(cleanMathForSpeech(text));
                    utterance.lang = 'fr-FR';
                    utterance.onstart = () => setIsTalking(true);
                    utterance.onend = () => {
                        setSpeakingIndex(null);
                        setIsTalking(false);
                        if (index === -2) {
                            isSpeakingQueue.current = false;
                            processSpeechQueue();
                        }
                        resolve();
                    };
                    window.speechSynthesis.speak(utterance);
                });
            } catch (error) {
                console.error('Erreur TTS:', error);
                const utterance = new SpeechSynthesisUtterance(cleanMathForSpeech(text));
                utterance.lang = 'fr-FR';
                utterance.onstart = () => setIsTalking(true);
                utterance.onend = () => {
                    setSpeakingIndex(null);
                    setIsTalking(false);
                    resolve();
                };
                window.speechSynthesis.speak(utterance);
            }
        });
    };

    // --- EXPORT BILAN EN PDF ---
    const handleExportBilan = async () => {
        if (messages.length === 0) return;

        try {
            setLoading(true);
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Fond
            doc.setFillColor(252, 252, 253);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // HEADER
            // HEADER PRO
            doc.setFillColor(248, 250, 252); // Slate 50
            doc.rect(0, 0, pageWidth, 45, 'F');
            doc.setDrawColor(34, 211, 238); // Cyan 400
            doc.setLineWidth(2);
            doc.line(0, 45, pageWidth, 45);

            doc.setTextColor(15, 23, 42); // Slate 900
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text("BILAN PÉDAGOGIQUE", pageWidth / 2, 22, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105); // Slate 600
            doc.text(`mimimaths@i • Rapport d'apprentissage personnalisé • ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 32, { align: 'center' });

            let yPos = 55;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            for (let i = 0; i < messages.length; i++) {
                const msgEl = document.getElementById(`msg-${i}`);
                if (!msgEl) continue;

                const speakBtn = msgEl.querySelector('button');
                if (speakBtn) (speakBtn as HTMLElement).style.visibility = 'hidden';

                try {
                    const canvas = await html2canvas(msgEl as HTMLElement, {
                        backgroundColor: '#ffffff',
                        scale: 3,
                        useCORS: true,
                        logging: false,
                        onclone: (clonedDoc) => {
                            const el = clonedDoc.getElementById(`msg-${i}`);
                            if (el) {
                                el.style.padding = '25px';
                                el.style.width = '800px';
                                el.style.backgroundColor = '#ffffff';
                                el.style.color = '#000000';
                                el.style.borderRadius = '0px';
                                el.style.border = '1px solid #e2e8f0';
                            }

                            // 1. Nettoyage des feuilles de style CORS-restricted (qui font planter html2canvas car illisibles)
                            const styleSheets = clonedDoc.styleSheets;
                            for (let k = styleSheets.length - 1; k >= 0; k--) {
                                try {
                                    // Si on ne peut pas lire cssRules, c'est une feuille cross-origin illisible
                                    // Elle contient probablement des oklch (Tailwind 4) -> on la supprime du clone
                                    const rules = styleSheets[k].cssRules;
                                    if (rules) {
                                        for (let j = rules.length - 1; j >= 0; j--) {
                                            const rule = rules[j];
                                            if (rule.cssText.includes('oklch') || rule.cssText.includes('lab') || rule.cssText.includes('oklab') || rule.cssText.includes('lch')) {
                                                (styleSheets[k] as CSSStyleSheet).deleteRule(j);
                                            }
                                        }
                                    }
                                } catch (e) {
                                    // Accès refusé -> On supprime carrément la feuille de style du clone
                                    const node = styleSheets[k].ownerNode;
                                    if (node && node.parentNode) {
                                        node.parentNode.removeChild(node);
                                    }
                                }
                            }

                            // 2. Injection d'un style de normalisation PDF (Force Light Mode & Safe Colors)
                            const styleTag = clonedDoc.createElement('style');
                            styleTag.innerHTML = `
                                * { 
                                    color-scheme: light !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                    text-shadow: none !important;
                                    box-shadow: none !important;
                                }
                                body, html, #msg-${i} { 
                                    background-color: #ffffff !important; 
                                    color: #000000 !important; 
                                }
                                .katex { color: #000000 !important; }
                                .katex-display { margin: 1em 0 !important; }
                                .text-cyan-400, .text-cyan-300, .text-slate-100, .text-blue-50 { color: #000000 !important; }
                                .bg-blue-600\\/10, .bg-slate-900\\/50, .bg-slate-900, .bg-slate-950, .bg-[#0f172a], .bg-[#020617] { 
                                    background-color: #ffffff !important; 
                                    border: 1px solid #e2e8f0 !important; 
                                }
                                
                                /* Figures Mathématiques */
                                .math-figure-container { 
                                    margin: 30px 0 !important; 
                                    background: white !important; 
                                    border: 1px solid #e2e8f0 !important; 
                                    border-radius: 12px !important; 
                                }
                                svg { background: white !important; }
                                svg text { fill: #000000 !important; font-weight: bold !important; }
                                svg line, svg path { stroke: #000000 !important; }
                                .grid line { stroke: #f1f5f9 !important; }
                                
                                /* Fix pour Tailwind 4 qui utilise des variables oklch par défaut */
                                :root {
                                    --tw-ring-color: #cbd5e1 !important;
                                    --tw-ring-shadow: none !important;
                                    --tw-shadow: none !important;
                                }

                                /* Fix Arrows and KaTeX SVGs */
                                .katex svg { fill: currentColor !important; display: inline-block !important; }
                                .katex .vlist-t { border-color: currentColor !important; }
                            `;
                            clonedDoc.head.appendChild(styleTag);

                            // 3. Nettoyage récursif des styles inline oklch/lab sur tous les éléments
                            const allElements = clonedDoc.getElementsByTagName('*');
                            const colorRegex = /(oklch|oklab|lab|lch|hwb)\([^)]*\)/g;
                            for (let j = 0; j < allElements.length; j++) {
                                const element = allElements[j] as HTMLElement;

                                // Nettoyage de l'attribut style inline
                                const inlineStyle = element.getAttribute('style') || '';
                                if (colorRegex.test(inlineStyle)) {
                                    element.setAttribute('style', inlineStyle.replace(colorRegex, '#000000'));
                                }

                                // Forcer la visibilité des textes d'assistant qui pourraient être blancs sur blanc
                                if (window.getComputedStyle(element).color === 'rgb(255, 255, 255)' || element.classList.contains('text-slate-100')) {
                                    element.style.color = '#000000';
                                }
                            }
                        }
                    });

                    if (speakBtn) (speakBtn as HTMLElement).style.visibility = 'visible';

                    const imgData = canvas.toDataURL('image/png');
                    const imgHeight = (canvas.height * contentWidth) / canvas.width;

                    if (yPos + imgHeight > pageHeight - 30) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139);
                    doc.text(messages[i].role === 'user' ? "ÉLÈVE" : "MIMIMATHS@I - ASSISTANT", margin, yPos - 3);

                    doc.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
                    yPos += imgHeight + 15;

                } catch (e) {
                    console.error("Erreur capture message:", e);
                }
            }

            // FOOTER
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`${new Date().toLocaleString()} • Généré par mimimaths@i`, pageWidth / 2, pageHeight - 10, { align: 'center' });

            doc.save(`Bilan_Maths_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error("Erreur PDF:", error);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setLoading(false);
        }
    };

    const processFile = async (file: File) => {
        setIsScanning(true);
        setLoading(true);
        const isPdf = file.type === 'application/pdf';

        // Message visuel immédiat
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✨ *Analyse photonique en cours... Je scanne votre ${isPdf ? 'document PDF' : 'image (capture)'}.*`
        }]);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const mimeType = file.type;

                if (file.size > 10 * 1024 * 1024) {
                    throw new Error("Le fichier est trop volumineux (max 10 Mo).");
                }

                const response = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Data, mimeType })
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMsg = data.suggestion || data.error || data.message || "Erreur lors de l'analyse";
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `❌ **Oups ! Un petit souci technique...**\n\n${errorMsg}`
                    }]);
                    setIsScanning(false);
                    setLoading(false);
                    return;
                }

                const transcribedText = data.transcription;
                if (!transcribedText) {
                    throw new Error("Aucun texte n'a pu être extrait du document.");
                }

                const userMessage: ChatMessage = { role: 'user', content: transcribedText };
                const newMessages = [...messages, userMessage];
                setMessages(newMessages);
                setIsScanning(false);
                await startStreamingResponse(newMessages);
            };
            reader.onerror = () => {
                throw new Error("Erreur lors de la lecture du fichier local.");
            };
        } catch (error: any) {
            console.error("Scan Error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ **Erreur :** ${error.message || "Impossible de scanner le document."}`
            }]);
            setIsScanning(false);
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
        // Reset l'input pour permettre de uploader le même fichier si besoin
        e.target.value = '';
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1 || items[i].type === "application/pdf") {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault(); // Empêche de coller le texte si c'est une image
                    await processFile(file);
                    break;
                }
            }
        }
    };

    const startStreamingResponse = async (msgs: ChatMessage[]) => {
        setLoading(true);
        setIsTalking(true);

        // --- ACKNOWLEDGMENT VOCAL IMMÉDIAT ---
        if (isVoiceEnabled) {
            const acknowledgments = [
                "D'accord, je regarde ça tout de suite.",
                "Laisse-moi une seconde pour analyser ce problème.",
                "C'est une bonne question, je prépare une réponse détaillée.",
                "Je lance la recherche pour te donner une explication précise.",
                "D'accord, je commence l'analyse de ta demande."
            ];
            const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
            // On lance le TTS sans attendre qu'il finisse pour ne pas bloquer l'appel API
            speakMessage(randomAck, -1);
        }

        // On pré-ajoute le message de l'assistant (vide pour le stream)
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch('/api/perplexity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: msgs, context: baseContext }),
            });

            if (!response.ok) throw new Error('Erreur API');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Reader non disponible');

            const decoder = new TextDecoder();
            let fullText = "";
            let currentSentence = "";
            let inMathBlock = false;
            let lastUpdate = Date.now();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr === '[DONE]') break;
                        try {
                            const json = JSON.parse(jsonStr);
                            const content = json.choices[0]?.delta?.content || "";
                            if (content) {
                                fullText += content;
                                currentSentence += content;

                                // Mise à jour UI throttlée (max toutes les 60ms)
                                const now = Date.now();
                                if (now - lastUpdate > 60) {
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        updated[updated.length - 1] = {
                                            role: 'assistant',
                                            content: fullText
                                        };
                                        return updated;
                                    });
                                    lastUpdate = now;
                                }

                                // Détection de fin de phrase pour le TTS
                                // On évite de couper au milieu d'un bloc @@@ ou d'un bloc KaTeX $$
                                if (content.includes('@@@')) inMathBlock = !inMathBlock;
                                if (content.includes('$$')) inMathBlock = !inMathBlock;

                                if (!inMathBlock && isVoiceEnabled) {
                                    const sentenceEndings = /[.!?](\s|$)/;
                                    if (sentenceEndings.test(currentSentence) && currentSentence.trim().length > 15) {
                                        // On nettoie un peu la phrase avant de l'ajouter à la queue
                                        const sentenceToSpeak = currentSentence.trim();
                                        speechQueue.current.push(sentenceToSpeak);
                                        currentSentence = "";
                                        processSpeechQueue();
                                    }
                                }
                            }
                        } catch (e) {
                            // Erreur de parsing JSON ignorée sur les chunks
                        }
                    }
                }
            }

            // Fin du stream : application du fixFinal et lecture du reste
            const finalFixed = fixLatexContent(fullText).content;
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: finalFixed };
                return updated;
            });

            if (currentSentence.trim().length > 0 && isVoiceEnabled) {
                speechQueue.current.push(currentSentence.trim());
                processSpeechQueue();
            }

        } catch (error) {
            console.error('Erreur Assistant:', error);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: "Désolé, une erreur est survenue lors de la communication." };
                return updated;
            });
            setIsTalking(false);
        } finally {
            setLoading(false);
        }
    };

    const processSpeechQueue = () => {
        if (isSpeakingQueue.current || speechQueue.current.length === 0) return;
        isSpeakingQueue.current = true;
        const nextSentence = speechQueue.current.shift();
        if (nextSentence) {
            speakMessage(nextSentence, -2); // -2 code spécial pour la queue
        } else {
            isSpeakingQueue.current = false;
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
                </div>

                <div className="absolute top-4 right-6 z-10">
                    <button
                        onClick={handleExportBilan}
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
                    <div key={index} id={`msg-${index}`} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
                        <div className={`max-w-[90%] px-5 py-4 text-[15px] rounded-2xl leading-relaxed relative group ${msg.role === 'user'
                            ? 'bg-blue-600/10 border border-blue-500/20 text-blue-50 rounded-tr-none'
                            : 'bg-slate-900/50 border border-slate-800/50 text-slate-100 rounded-tl-none'}`}>

                            {msg.role === 'assistant' && msg.content !== '...' && (
                                <button
                                    onClick={() => speakMessage(msg.content, index, msg.audio)}
                                    className={`absolute -right-10 top-0 p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100 ${speakingIndex === index ? 'text-cyan-400 opacity-100' : ''}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                    </svg>
                                </button>
                            )}

                            <div className="prose prose-invert prose-cyan max-w-none prose-sm w-full overflow-hidden">
                                {msg.role === 'assistant' && (msg.content === '' || msg.content === '...') && loading ? (
                                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] animate-pulse py-4">
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                                        <span className="uppercase tracking-widest font-bold">Réflexion photonique...</span>
                                    </div>
                                ) : (
                                    <div className="message-content-wrapper space-y-4">
                                        {renderMessageContent(msg.content)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
                                onClick={toggleRecording}
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
