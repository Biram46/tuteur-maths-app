'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/perplexity';
import RobotAvatar from './RobotAvatar';
import MathGraph, { GraphPoint } from './MathGraph';
import MathTree, { TreeNode } from './MathTree';
import MathTable from './MathTable';
import IntervalAxis from './IntervalAxis';
import GeometryFigure, { GeoPoint, GeoSegment, GeoLine, GeoCircle, GeoAnnotation } from './GeometryFigure';
import GeoGebraPlotter from './GeoGebraPlotter';
import LevelSelector from './LevelSelector';
import type { NiveauLycee } from '@/lib/niveaux';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { fixLatexContent } from '@/lib/latex-fixer';

/**
 * 🛡️ GARDE-FOU FORMAT TABLEAU
 * Détecte si l'IA a généré un tableau Markdown/ASCII au lieu du format @@@
 * et le convertit automatiquement. Permet de garder l'IA non-déterministe
 * (réponses naturelles et variées) tout en garantissant un rendu correct.
 */
function patchMarkdownTables(content: string): string {
    // Si la réponse contient déjà un @@@ table → rien à faire
    if (content.includes('@@@')) return content;

    // Cherche un bloc de type :
    // | x      | -∞ | -3 | 1  | 2  | +∞ |
    // |--------|----|----|----|----|-----|
    // | x+3    | -  | 0  | +  | +  | +  |
    const mdTableRegex = /(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g;
    const matches = content.match(mdTableRegex);

    if (!matches) return content;

    let patched = content;
    for (const match of matches) {
        try {
            const lines = match.trim().split('\n').filter(l => l.trim());
            if (lines.length < 3) continue;

            // Ligne 0 : en-têtes  |  x | -∞ | -3 | 1 | 2 | +∞ |
            const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
            // Ligne 1 : séparateurs -> ignorée
            // Lignes 2+ : données
            const dataLines = lines.slice(2);

            if (!headers[0]) continue;

            // Détecter la ligne x
            const xLineIdx = dataLines.findIndex(l => {
                const firstCell = l.split('|')[1]?.trim().toLowerCase() || '';
                return firstCell === 'x';
            });

            if (xLineIdx === -1) {
                // Essayer si les en-têtes contiennent les x-values (format horizontal)
                // | x | -∞ | -3 | 1 | 2 | +∞ |
                if (headers[0].toLowerCase() === 'x') {
                    const xValues = headers.slice(1)
                        .map(v => v.replace('−', '-').replace('∞', 'inf').replace('+∞', '+inf').replace('-∞', '-inf'))
                        .join(', ');

                    let tableBlock = `table |\nx: ${xValues} |\n`;
                    for (const dl of dataLines) {
                        const cells = dl.split('|').map(c => c.trim()).filter(c => c);
                        if (cells.length < 2) continue;
                        const label = cells[0];
                        const values = cells.slice(1).map(v =>
                            v.replace('−', '-').replace('≥', '').replace('∞', 'inf')
                                .replace('+∞', '+inf').replace('-∞', '-inf')
                        ).join(', ');
                        const isVariation = /↗|↘|nearrow|searrow/i.test(values);
                        const lineType = isVariation ? 'var' : 'sign';
                        tableBlock += `${lineType}: ${label} : ${values} |\n`;
                    }

                    const replacement = `@@@\n${tableBlock}@@@`;
                    patched = patched.replace(match, replacement);
                }
            }
        } catch (e) {
            console.warn('[patchMarkdownTables] Erreur conversion:', e);
        }
    }

    return patched;
}

// Convert PDF pages to images
async function convertPdfToImages(file: File): Promise<{ base64: string; mimeType: string }[]> {
    // Dynamically import pdfjs-dist (client-side only)
    const pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsModule.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsModule.getDocument({ data: arrayBuffer }).promise;
    const images: { base64: string; mimeType: string }[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) { // Max 5 pages
        const page = await pdf.getPage(pageNum);
        const scale = 2; // Higher resolution
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context!,
            viewport: viewport,
            canvas: canvas
        } as any).promise;

        const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        images.push({ base64, mimeType: 'image/jpeg' });
    }

    return images;
}


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
    const [selectedNiveau, setSelectedNiveau] = useState<NiveauLycee | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // ── Détection du niveau dans le message utilisateur ──
    function detectNiveauFromMessage(msg: string): NiveauLycee | null {
        const low = msg.toLowerCase();
        // Terminale expert
        if (/terminale\s*(maths?\s*)?expert/i.test(low)) return 'terminale_expert';
        // Terminale complémentaire
        if (/terminale\s*(maths?\s*)?comp/i.test(low)) return 'terminale_comp';
        // Terminale techno
        if (/terminale\s*(techno|sti|stl|stmg|st2s)/i.test(low)) return 'terminale_techno';
        // Terminale spé / générale
        if (/terminale|tle|term/i.test(low)) return 'terminale_spe';
        // Première techno
        if (/premi[eè]re\s*(techno|sti|stl|stmg|st2s)/i.test(low)) return 'premiere_techno';
        // Première spé
        if (/premi[eè]re\s*(sp[eé]|maths)/i.test(low)) return 'premiere_spe';
        // Première commune
        if (/premi[eè]re|1[eè]?re/i.test(low)) return 'premiere_commune';
        // Seconde STHR
        if (/seconde\s*sthr/i.test(low)) return 'seconde_sthr';
        // Seconde
        if (/seconde|2nde|2de/i.test(low)) return 'seconde';
        return null;
    }

    // ── Résolution du niveau effectif : sélecteur > détection message > défaut ──
    function resolveNiveau(userMessage: string): NiveauLycee {
        if (selectedNiveau) return selectedNiveau;
        const detected = detectNiveauFromMessage(userMessage);
        if (detected) {
            // Auto-sélectionner pour les prochains messages
            setSelectedNiveau(detected);
            return detected;
        }
        return 'premiere_spe'; // défaut
    }

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
        // ⚠️ Ne PAS toucher à isTalking pendant le streaming (loading=true)
        // car le streaming gère son propre état isTalking et cela crée
        // une boucle de re-render : "Maximum update depth exceeded"
        if (loading) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
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
        console.log('🔍 RAW BLOCK:', rawBlock);  // ← ajoutez cette ligne
        try {
            // Remplacement des tirets longs et espaces insécables
            const raw = rawBlock.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');

            // Pour les tableaux, on normalise d'abord en remplaçant les retours à la ligne par des espaces
            // Puis on divise par | uniquement
            const isTableBlock = raw.toLowerCase().includes('table') ||
                raw.toLowerCase().includes('x:') ||
                raw.toLowerCase().includes('sign:') ||
                raw.toLowerCase().includes('var');

            let sections: string[];
            if (isTableBlock) {
                // Pour les tableaux : remplacer \n par espace
                // IMPORTANT: Protéger || avant de diviser par |
                const normalized = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ');

                // Remplacer || par un placeholder, diviser par |, puis restaurer
                const DOUBLE_BAR_PLACEHOLDER = '___DOUBLE_BAR___';
                const protectedStr = normalized.replace(/\|\|/g, DOUBLE_BAR_PLACEHOLDER);
                sections = protectedStr.split('|').map(s => s.trim().replace(new RegExp(DOUBLE_BAR_PLACEHOLDER, 'g'), '||')).filter(s => s.length > 0);
            } else {
                // Pour les autres (arbres, graphiques) : diviser par | OU \n
                sections = raw.split(/[|\n]/).map(s => s.trim()).filter(s => s.length > 0);
            }

            if (sections.length === 0) return null;

            // --- CAS 0 : INTERVALLE ---
            if (sections[0].toLowerCase().includes('interval')) {
                let left: number | string = 0;
                let right: number | string = 5;
                let leftIncluded = true;
                let rightIncluded = false;

                sections.forEach(sec => {
                    const low = sec.toLowerCase().trim();
                    if (low.startsWith('left:')) {
                        const val = sec.split(':')[1].trim();
                        if (val === '-inf' || val === '-∞') left = -Infinity;
                        else left = parseFloat(val);
                    } else if (low.startsWith('right:')) {
                        const val = sec.split(':')[1].trim();
                        if (val === '+inf' || val === '+∞') right = Infinity;
                        else right = parseFloat(val);
                    } else if (low.startsWith('leftincluded:')) {
                        leftIncluded = sec.split(':')[1].trim().toLowerCase() === 'true';
                    } else if (low.startsWith('rightincluded:')) {
                        rightIncluded = sec.split(':')[1].trim().toLowerCase() === 'true';
                    }
                });

                return <IntervalAxis key={rawBlock} left={left} right={right} leftIncluded={leftIncluded} rightIncluded={rightIncluded} title="Intervalle" />;
            }

            // --- CAS 0.5 : GEOGEBRA ---
            if (sections[0].toLowerCase().includes('geogebra')) {
                let commands: string[] = [];

                sections.forEach(sec => {
                    const low = sec.toLowerCase().trim();
                    if (low.startsWith('commands:')) {
                        const cmdStr = sec.substring(sec.indexOf(':') + 1).trim();
                        commands = cmdStr.split(';').map(c => c.trim()).filter(c => c.length > 0);
                    }
                });

                if (commands.length > 0) {
                    return <GeoGebraPlotter key={rawBlock} commands={commands} title="Figure GeoGebra" />;
                }
            }

            // --- CAS 0.6 : FIGURE GÉOMÉTRIQUE ANIMÉE ---
            if (sections[0].toLowerCase().includes('figure')) {
                const geoPoints: GeoPoint[] = [];
                const geoSegments: GeoSegment[] = [];
                const geoLines: GeoLine[] = [];
                const geoCircles: GeoCircle[] = [];
                const geoAnnotations: GeoAnnotation[] = [];
                let hasCoordinates = true;
                let showSteps = true;
                let figureTitle = '';

                sections.forEach(sec => {
                    const low = sec.toLowerCase().trim();

                    if (low.startsWith('type:')) {
                        hasCoordinates = sec.split(':')[1].trim().toLowerCase() === 'coordinates';
                    } else if (low.startsWith('steps:')) {
                        showSteps = sec.split(':')[1].trim().toLowerCase() === 'true';
                    } else if (low.startsWith('points:')) {
                        // Format: points: A(2,3), B(-1,4), C(0,0)
                        const ptsStr = sec.substring(sec.indexOf(':') + 1);
                        const pts = ptsStr.match(/([A-Z])\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g);
                        if (pts) {
                            pts.forEach(pt => {
                                const match = pt.match(/([A-Z])\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
                                if (match) {
                                    geoPoints.push({
                                        name: match[1],
                                        x: parseFloat(match[2]),
                                        y: parseFloat(match[3])
                                    });
                                }
                            });
                        }
                    } else if (low.startsWith('segments:')) {
                        // Format: segments: [AB], [BC]
                        const segStr = sec.substring(sec.indexOf(':') + 1);
                        const segs = segStr.match(/\[([A-Z])([A-Z])\]/g);
                        if (segs) {
                            segs.forEach(seg => {
                                const match = seg.match(/\[([A-Z])([A-Z])\]/);
                                if (match) {
                                    geoSegments.push({ from: match[1], to: match[2] });
                                }
                            });
                        }
                    } else if (low.startsWith('vectors:')) {
                        // Format: vectors: vec{u}(3,2), vec{AB}
                        // Pour l'instant, on ajoute comme annotation
                    } else if (low.startsWith('lines:')) {
                        // Format: lines: (AB), d: y=2x+1
                        const lineStr = sec.substring(sec.indexOf(':') + 1);
                        const lines = lineStr.split(',');
                        lines.forEach(line => {
                            const match = line.trim().match(/\(([A-Z])([A-Z])\)/);
                            if (match) {
                                geoLines.push({ points: [match[1], match[2]] });
                            }
                        });
                    } else if (low.startsWith('circles:')) {
                        // Format: circles: cercle(A,3), cercle(O,A,B)
                        const circStr = sec.substring(sec.indexOf(':') + 1);
                        const circs = circStr.match(/cercle\s*\(\s*([A-Z])\s*,\s*([\d.]+)\s*\)/g);
                        if (circs) {
                            circs.forEach(circ => {
                                const match = circ.match(/cercle\s*\(\s*([A-Z])\s*,\s*([\d.]+)\s*\)/);
                                if (match) {
                                    geoCircles.push({ center: match[1], radius: parseFloat(match[2]) });
                                }
                            });
                        }
                    } else if (low.startsWith('annotations:')) {
                        // Format: annotations: milieu(A,B)=M, AB=5, angle(A,B,C)=90°
                        const annotStr = sec.substring(sec.indexOf(':') + 1);
                        // Milieu
                        const midpoints = annotStr.match(/milieu\s*\(\s*([A-Z])\s*,\s*([A-Z])\s*\)\s*=\s*([A-Z])/g);
                        if (midpoints) {
                            midpoints.forEach(mp => {
                                const match = mp.match(/milieu\s*\(\s*([A-Z])\s*,\s*([A-Z])\s*\)\s*=\s*([A-Z])/);
                                if (match) {
                                    geoAnnotations.push({ type: 'midpoint', points: [match[1], match[2]], value: match[3] });
                                }
                            });
                        }
                        // Angle
                        const angles = annotStr.match(/angle\s*\(\s*([A-Z])\s*,\s*([A-Z])\s*,\s*([A-Z])\s*\)\s*=\s*(\d+)/g);
                        if (angles) {
                            angles.forEach(ang => {
                                const match = ang.match(/angle\s*\(\s*([A-Z])\s*,\s*([A-Z])\s*,\s*([A-Z])\s*\)\s*=\s*(\d+)/);
                                if (match) {
                                    geoAnnotations.push({ type: 'angle', points: [match[1], match[2], match[3]], value: parseInt(match[4]) });
                                }
                            });
                        }
                        // Distance
                        const distances = annotStr.match(/([A-Z]{2})\s*=\s*([\d.]+)/g);
                        if (distances) {
                            distances.forEach(dist => {
                                const match = dist.match(/([A-Z]{2})\s*=\s*([\d.]+)/);
                                if (match) {
                                    geoAnnotations.push({ type: 'distance', points: [match[1][0], match[1][1]], value: match[2] });
                                }
                            });
                        }
                    }
                });

                if (geoPoints.length > 0) {
                    return (
                        <GeometryFigure
                            key={rawBlock}
                            points={geoPoints}
                            segments={geoSegments}
                            lines={geoLines}
                            circles={geoCircles}
                            annotations={geoAnnotations}
                            hasCoordinates={hasCoordinates}
                            showSteps={showSteps}
                            title={figureTitle}
                        />
                    );
                }
            }

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
                        const colonIndex = sec.lastIndexOf(':');
                        const prefixAndLabel = sec.substring(0, colonIndex).trim();
                        const rawContent = sec.substring(colonIndex + 1);

                        // Parsing robuste : séparer par virgules, mais préserver || comme élément unique
                        const rawValues = rawContent.includes(',')
                            ? rawContent.split(',').map(v => v.trim()).filter(v => v.length > 0)
                            : rawContent.trim().split(/\s+/).filter(v => v.length > 0);

                        // IMPORTANT : NE PAS dédupliquer les valeurs consécutives !
                        // Chaque valeur correspond à une colonne précise du tableau (2N-3 éléments).
                        // Supprimer les doublons casse l'alignement des signes avec les x-values.
                        const content = rawValues;


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
                            {tableGroups.map((group, gIdx) => {
                                // Déterminer le type de tableau : si une ligne est 'variation', c'est un tableau de variations
                                const hasVariation = group.rows.some((r: any) => r.type === 'variation');
                                const tableTitle = hasVariation ? "Tableau de Variations" : "Tableau de Signes";
                                return (
                                    <MathTable
                                        key={`${rawBlock}-${gIdx}`}
                                        data={{ xValues: group.xValues, rows: group.rows }}
                                        title={tableTitle}
                                    />
                                );
                            })}
                        </div>
                    );
                }
            }

            // --- CAS 2 : GRAPHIQUE OU GÉOMÉTRIE ---
            const title = (sections[0]?.includes(',') || sections[0]?.includes(':') || sections[0]?.includes('domain:')) ? "Analyse Graphique" : sections[0];
            const points: GraphPoint[] = [];
            const entities: any[] = [];
            const graphFunctions: { fn: string; color: string; domain?: [number, number] }[] = [];
            let graphAsymptotes: number[] = [];
            let domain = { x: [-5, 5] as [number, number], y: [-4, 4] as [number, number] };
            let hideAxesValue = false;

            // Palette de couleurs pour les fonctions multiples
            const fnColors = ['#3b82f6', '#f43f5e', '#34d399', '#fbbf24', '#a855f7', '#06b6d4'];

            // 1. D'abord les métadonnées, fonctions et points
            sections.forEach(sec => {
                const low = sec.toLowerCase().trim();
                if (low === 'pure' || low === 'hideaxes' || low === 'geometry') hideAxesValue = true;
                else if (low.startsWith('domain:')) {
                    const d = low.replace('domain:', '').trim().split(',').map(Number);
                    if (d.length >= 4) domain = { x: [d[0], d[1]], y: [d[2], d[3]] };
                } else if (low.startsWith('function:')) {
                    // Parser la ligne function: expression
                    const fnExpr = sec.substring(sec.indexOf(':') + 1).trim();
                    if (fnExpr) {
                        graphFunctions.push({
                            fn: fnExpr,
                            color: fnColors[graphFunctions.length % fnColors.length]
                        });
                    }
                } else if (low.startsWith('asymptotes:')) {
                    const asymStr = sec.substring(sec.indexOf(':') + 1).trim();
                    graphAsymptotes = asymStr.split(',').map(Number).filter(n => !isNaN(n));
                } else if (low.startsWith('points:')) {
                    // Format IA : points: (1,0), (3,0), (2,-1)
                    const ptsStr = sec.substring(sec.indexOf(':') + 1);
                    const ptMatches = ptsStr.match(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g);
                    if (ptMatches) {
                        ptMatches.forEach(pt => {
                            const m = pt.match(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
                            if (m) {
                                points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
                            }
                        });
                    }
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

            if (points.length > 0 || entities.length > 0 || graphFunctions.length > 0) {
                return (
                    <div key={rawBlock} className="w-full math-figure-container my-6">
                        <div className="animate-in zoom-in duration-700">
                            <MathGraph
                                points={points}
                                entities={entities}
                                functions={graphFunctions}
                                domain={domain}
                                title={title}
                                hideAxes={hideAxesValue}
                                asymptotes={graphAsymptotes}
                            />
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
                            code: ({ node, className, ...props }) => <code className="bg-black/60 px-1.5 py-0.5 rounded text-[13px] font-mono text-cyan-300" {...props} />,
                            a: ({ node, href, children, ...props }) => {
                                if (href === '/graph') {
                                    return (
                                        <a
                                            href="/graph"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg text-cyan-300 hover:text-cyan-100 hover:border-cyan-400 transition-all duration-200 no-underline font-medium text-sm"
                                            {...props}
                                        >
                                            📊 {children}
                                        </a>
                                    );
                                }
                                return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline" {...props}>{children}</a>;
                            },
                        }}
                    >
                        {section}
                    </ReactMarkdown>
                    {/* Bouton graphe visible si le contenu mentionne la courbe */}
                    {section.includes('bouton ci-dessous') && (
                        <div className="mt-3 mb-1">
                            <button
                                onClick={() => window.open('/graph', '_blank')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                📊 Ouvrir la courbe représentative
                            </button>
                        </div>
                    )}
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

                    if (!response.ok) {
                        // API TTS indisponible — fallback silencieux vers synthèse navigateur
                        const errBody = await response.json().catch(() => ({}));
                        console.warn(`TTS API indisponible (${response.status}):`, errBody?.details || 'erreur inconnue', '→ fallback navigateur');
                        const utterance = new SpeechSynthesisUtterance(truncatedText);
                        utterance.lang = 'fr-FR';
                        utterance.onstart = () => setIsTalking(true);
                        utterance.onend = () => {
                            setSpeakingIndex(null);
                            setIsTalking(false);
                            setSpeechVolume(0);
                            if (index === -2) {
                                isSpeakingQueue.current = false;
                                processSpeechQueue();
                            }
                            resolve();
                        };
                        window.speechSynthesis.speak(utterance);
                        return;
                    }
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

            // ── Récupérer les stylesheets KaTeX depuis le document principal ──
            const katexLinks: string[] = [];
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = (link as HTMLLinkElement).href;
                if (href.includes('katex') || href.includes('KaTeX')) {
                    katexLinks.push(`<link rel="stylesheet" href="${href}" />`);
                }
            });
            if (katexLinks.length === 0) {
                Array.from(document.styleSheets).forEach(ss => {
                    try {
                        if (ss.href && (ss.href.includes('katex') || ss.href.includes('KaTeX'))) {
                            katexLinks.push(`<link rel="stylesheet" href="${ss.href}" />`);
                        }
                    } catch { /* cross-origin */ }
                });
            }
            if (katexLinks.length === 0) {
                katexLinks.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />');
            }

            // ── Construire le contenu HTML (collecte légère, pas de querySelectorAll('*')) ──
            let messagesHtml = '';
            for (let i = 0; i < messages.length; i++) {
                const msgEl = document.getElementById(`msg-${i}`);
                if (!msgEl) continue;

                const role = messages[i].role;
                const roleLabel = role === 'user' ? 'ÉLÈVE' : 'MIMIMATHS@I — ASSISTANT';
                const roleBg = role === 'user' ? '#f0f9ff' : '#ffffff';
                const roleBorder = role === 'user' ? '#bae6fd' : '#e2e8f0';

                const clone = msgEl.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('button').forEach(b => b.remove());
                clone.querySelectorAll('[class*="avatar"], [class*="Avatar"], [class*="robot"]').forEach(a => a.remove());

                messagesHtml += `
                    <div class="msg-block">
                        <div class="role-label">${roleLabel}</div>
                        <div class="msg-content" style="background:${roleBg};border:1px solid ${roleBorder};">
                            ${clone.innerHTML}
                        </div>
                    </div>`;
            }

            const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = new Date().toLocaleString('fr-FR');

            const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bilan Pédagogique - mimimaths@i</title>
${katexLinks.join('\n')}
<style>
@page { size: A4; margin: 18mm 15mm 22mm 15mm; }
@media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .print-btn { display: none !important; }
}
* { box-sizing: border-box; }
body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    color: #0f172a;
    line-height: 1.55;
    margin: 0; padding: 0;
    background: #fff;
}
.print-header {
    text-align: center;
    border-bottom: 3px solid #22d3ee;
    padding-bottom: 14px;
    margin-bottom: 22px;
}
.print-header h1 {
    font-size: 22pt; font-weight: 800;
    color: #0f172a; margin: 0 0 5px;
    letter-spacing: 0.03em;
}
.print-header .sub { font-size: 9pt; color: #64748b; }
.msg-block {
    margin-bottom: 14px;
    page-break-inside: avoid;
}
.role-label {
    font-size: 8pt; color: #64748b;
    font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 3px;
}
.msg-content {
    border-radius: 6px;
    padding: 12px 16px;
    color: #000 !important;
}
.msg-content * { color: #000 !important; }
.katex { color: #000 !important; }
.katex-display { margin: 0.7em 0 !important; }
svg { max-width: 100% !important; height: auto !important; }
strong, b { font-weight: 700; }
h2, h3, h4 { margin-top: 0.8em; margin-bottom: 0.3em; }
ul, ol { margin: 0.4em 0; padding-left: 1.5em; }
li { margin-bottom: 0.15em; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
blockquote { border-left: 3px solid #94a3b8; margin: 0.5em 0; padding: 0.3em 0 0.3em 12px; color: #374151; }
img { max-width: 100%; height: auto; }
.print-footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    text-align: center; font-size: 7pt; color: #94a3b8;
    padding: 4px 0; border-top: 1px solid #e2e8f0;
}
.print-btn {
    display: block;
    margin: 16px auto;
    padding: 12px 32px;
    background: #22d3ee;
    color: #fff;
    font-size: 14pt;
    font-weight: 700;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}
.print-btn:active { background: #06b6d4; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">📄 Enregistrer en PDF</button>
<div class="print-header">
    <h1>BILAN PÉDAGOGIQUE</h1>
    <div class="sub">mimimaths@i · Rapport d'apprentissage · ${dateStr}</div>
</div>
${messagesHtml}
<div class="print-footer">mimimaths@i · ${timeStr}</div>
</body>
</html>`;

            // ── Ouvrir dans un nouvel onglet (non-bloquant pour la page principale) ──
            const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const printWin = window.open(blobUrl, '_blank');

            // Libérer le blob URL après un délai suffisant
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

            if (!printWin) {
                // Popups bloquées → fallback téléchargement direct du HTML
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'bilanmath.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }

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
            if (file.size > 20 * 1024 * 1024) {
                throw new Error("Le fichier est trop volumineux (max 20 Mo).");
            }

            let imagesToProcess: { base64: string; mimeType: string }[];

            // Convertir PDF en images
            if (isPdf) {
                try {
                    imagesToProcess = await convertPdfToImages(file);
                    console.log(`[PDF] Converti en ${imagesToProcess.length} image(s)`);
                } catch (pdfError: any) {
                    console.error("[PDF] Erreur conversion:", pdfError);
                    throw new Error("Impossible de lire le PDF. Essayez de prendre une capture d'écran à la place.");
                }
            } else {
                // Pour les images, lire directement en base64
                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = () => reject(new Error("Erreur lors de la lecture de l'image."));
                });
                imagesToProcess = [{ base64: base64Data, mimeType: file.type }];
            }

            // Analyser chaque image (pour PDF multi-pages, on combine les résultats)
            let combinedTranscription = "";
            for (let i = 0; i < imagesToProcess.length; i++) {
                const { base64, mimeType } = imagesToProcess[i];

                const response = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, mimeType })
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMsg = data.suggestion || data.error || data.message || "Erreur lors de l'analyse";
                    throw new Error(errorMsg);
                }

                if (data.transcription) {
                    if (imagesToProcess.length > 1) {
                        combinedTranscription += `**Page ${i + 1}:**\n${data.transcription}\n\n`;
                    } else {
                        combinedTranscription = data.transcription;
                    }
                }
            }

            if (!combinedTranscription) {
                throw new Error("Aucun texte n'a pu être extrait du document.");
            }

            // ── Supprimer le message "Analyse photonique en cours..." ──
            setMessages(prev => prev.filter(m =>
                !(m.role === 'assistant' && m.content.includes('Analyse photonique en cours'))
            ));

            // ── Afficher la transcription comme message user ──
            const userMessage: ChatMessage = { role: 'user', content: `📷 **Exercice scanné :**\n\n${combinedTranscription}` };
            const currentMessages = messages.filter(m =>
                !(m.role === 'assistant' && m.content.includes('Analyse photonique en cours'))
            );
            const newMessages = [...currentMessages, userMessage];
            setMessages(newMessages);
            setIsScanning(false);
            setLoading(false);

            // ── Router la transcription via handleSendMessage pour activer les moteurs mathématiques ──
            // (exercices multi-questions, tableaux de signes, variations, graphes, etc.)
            await handleSendMessageWithText(combinedTranscription, newMessages);

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
            let rafPending = false;

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

                                // Mise à jour UI throttlée (max toutes les 150ms via rAF)
                                const now = Date.now();
                                if (now - lastUpdate > 150 && !rafPending) {
                                    rafPending = true;
                                    // ✅ Appliquer fixLatexContent PENDANT le streaming
                                    // pour que \( \) \[ \] soient convertis en $ $$ pour KaTeX
                                    const snapshot = fixLatexContent(fullText).content;
                                    requestAnimationFrame(() => {
                                        setMessages(prev => {
                                            const updated = [...prev];
                                            updated[updated.length - 1] = {
                                                role: 'assistant',
                                                content: snapshot
                                            };
                                            return updated;
                                        });
                                        rafPending = false;
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
            // patchMarkdownTables : si l'IA a généré un tableau Markdown au lieu de @@@,
            // on le convertit automatiquement (garde-fou non-déterminisme)
            const finalFixed = patchMarkdownTables(fixLatexContent(fullText).content);
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

    // ═══════════════════════════════════════════════════════════════════
    // MOTEUR DE ROUTAGE : détecte le type de demande et active le bon moteur
    // Appelé par handleSendMessage (texte tapé) ET processFile (capture d'écran)
    // ═══════════════════════════════════════════════════════════════════
    const handleSendMessageWithText = async (inputText: string, newMessages: ChatMessage[]) => {
        // ── INTERCEPTION TABLEAU DE SIGNES (expression unique) ──
        const inputLower = inputText.toLowerCase();
        const wantsSignTable = /signe|sign|tableau\s*de\s*signe|étudier?\s*(le\s*)?signe/i.test(inputLower);
        // Détection exercice multi-questions (format 1) ... 2) ... OU 1. ... 2. ...)
        const isMultiExpr = /(?:^|[\n;])\s*\d+\s*[).]\s+[\s\S]*(?:\n|;)\s*\d+\s*[).]\s+/.test(inputText);

        // ═══════════════════════════════════════════════════════════
        // HANDLER EXERCICE MULTI-QUESTIONS
        // Flux pédagogique : IA explique → tableau SymPy en conclusion
        // ═══════════════════════════════════════════════════════════
        if (isMultiExpr) {
            try {
                // ── 1. Extraire l'expression commune du préambule ──
                let commonExpr = '';
                // Nettoyer le texte OCR : retirer les $ du LaTeX inline
                const cleanedInput = inputText.replace(/\$\$/g, '').replace(/\$/g, '');
                // Extraire tout ce qui suit '=' jusqu'au premier retour à la ligne
                // ⚠️ Ne PAS utiliser \d\) dans le lookahead car ça matche (2x-1) !
                // Supporte : "f(x) = ...", "Soit f(x) = ...", "définie par : f(x) = ...", "par : f(x) = ..."
                const preMatch = cleanedInput.match(/(?:soit|on\s+(?:consid[eè]re|pose|d[eé]finit)|d[eé]finie?\s+(?:sur\s+\S+\s+)?par\s*:?)?\s*(?:[fghk]\s*\(\s*x\s*\)|y)\s*=\s*(.+)/i);
                if (preMatch) {
                    // Prendre tout jusqu'au premier \n (l'expression est sur une seule ligne)
                    // ⚠️ Ne PAS utiliser split(/\d+\s*[).]/) car ça coupe "+1." dans l'expression !
                    commonExpr = preMatch[1].split('\n')[0].trim()
                        .replace(/[.!?]+$/, '')
                        // ⚠️ Retirer le texte français après l'expression
                        // Ex: "3/(x²+2x-3), et on note (Cf) sa courbe" → "3/(x²+2x-3)"
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|vous|c'est|puis|or|car|si|quand|donc|cette)\b.*$/i, '')
                        // Retirer aussi tout texte après "; " qui est un séparateur de phrase
                        .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                        .trim();
                }
                if (!commonExpr) {
                    const eqMatch = cleanedInput.match(/=\s*(.+)/);
                    if (eqMatch) commonExpr = eqMatch[1].split('\n')[0].trim()
                        .replace(/[.!?]+$/, '')
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|vous|c'est|puis|or|car|si|quand|donc|cette)\b.*$/i, '')
                        .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                        .trim();
                }

                const cleanMathExpr = (e: string) => {
                    let t = e;
                    // Retirer f(x) =
                    t = t.replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '');
                    // Retirer $ et \\ (double backslash LaTeX)
                    t = t.replace(/\$/g, '').replace(/\\\\/g, '');
                    // Unicode → ASCII
                    t = t.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4');
                    t = t.replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/');
                    // LaTeX fractions (plusieurs passes pour les imbriqués)
                    for (let pass = 0; pass < 3; pass++) {
                        t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
                    }
                    // LaTeX racines
                    t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^}]*)\}/g, '$1rt($2)');
                    t = t.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
                    // LaTeX commandes courantes
                    t = t.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
                    t = t.replace(/\\left/g, '').replace(/\\right/g, '');
                    t = t.replace(/\\infty/g, 'Infinity');
                    t = t.replace(/\\pi/g, 'pi');
                    // Nettoyer les accolades résiduelles
                    t = t.replace(/\{/g, '(').replace(/\}/g, ')');
                    // ⛔ Supprimer TOUTE commande LaTeX restante (\xxx)
                    t = t.replace(/\\[a-zA-Z]+/g, '');
                    // Traduction française
                    t = t.replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)');
                    t = t.replace(/\bln\s*\(/g, 'log(');
                    // Multiplication implicite
                    t = t.replace(/(\d)([a-zA-Z])/g, '$1*$2');   // 2x → 2*x
                    t = t.replace(/(\d)\(/g, '$1*(');             // 3( → 3*(
                    t = t.replace(/\)(\w)/g, ')*$1');             // )x → )*x
                    t = t.replace(/\)\(/g, ')*(');                // )( → )*(
                    // Filet de sécurité : texte français résiduel
                    t = t.replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '');
                    t = t.replace(/\s+(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\s+.*$/i, '');
                    return t.replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '').trim();
                };

                const prettifyExpr = (ex: string): string => ex
                    .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                    .replace(/\blog\(/g, 'ln(')
                    .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                    .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');

                // ── 2. Parser les questions numérotées ──
                interface ExQ { num: string; text: string; type: 'sign_table' | 'variation_table' | 'graph' | 'solve' | 'parity' | 'limits' | 'derivative_sign' | 'ai'; }
                const questions: ExQ[] = [];
                const qRegex = /(\d+)\s*[).]\s*(.+?)(?=\n\s*\d+\s*[).]|\s*$)/g;
                let qM;
                while ((qM = qRegex.exec(inputText)) !== null) {
                    const qText = qM[2].trim();
                    const qNorm = qText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                    // ── Détection des questions COMPOSÉES ──
                    // Ex: "Étudier la fonction (ensemble de définition, limites, signe de la dérivée, tableau de variations)"
                    // → doit générer PLUSIEURS sous-questions : derivative_sign + variation_table
                    const hasDerivSign = /deriv|f'\s*\(|signe.*deriv|deriv.*signe/i.test(qNorm);
                    const hasVariation = /variation|dresser.*variation|tableau.*variation/i.test(qNorm);
                    const hasSignTable = /signe|etudier.*signe|tableau.*signe/i.test(qNorm) && !/deriv|f'/i.test(qNorm);
                    const isStudyQuestion = /etudier|etude complète|etude complete/i.test(qNorm);

                    if (isStudyQuestion && (hasDerivSign || hasVariation)) {
                        // Question composite "Étudier la fonction" → générer tous les tableaux nécessaires
                        if (hasDerivSign) {
                            questions.push({ num: qM[1], text: qText, type: 'derivative_sign' });
                        }
                        if (hasVariation) {
                            questions.push({ num: qM[1], text: qText, type: 'variation_table' });
                        }
                        // Ajouter aussi la question AI pour l'explication complète
                        questions.push({ num: qM[1], text: qText, type: 'ai' });
                    } else {
                        let qType: ExQ['type'] = 'ai';
                        // Parité
                        if (/parit|pair|impair/i.test(qNorm)) qType = 'parity';
                        // Limites
                        else if (/limite|borne|comportement.*infini|branche.*infini/i.test(qNorm)) qType = 'limits';
                        // Dérivée + signe de f' → tableau de signes de la dérivée
                        else if (hasDerivSign) qType = 'derivative_sign';
                        // Tableau de signes de f
                        else if (hasSignTable) qType = 'sign_table';
                        // Tableau de variations
                        else if (hasVariation) qType = 'variation_table';
                        // Courbe
                        else if (/trace|courbe|graphe|graphique|represent|dessine/i.test(qNorm)) qType = 'graph';
                        // Résolution
                        else if (/resou|inequation|equation/i.test(qNorm)) qType = 'solve';
                        questions.push({ num: qM[1], text: qText, type: qType });
                    }
                }

                const exprClean = cleanMathExpr(commonExpr);
                console.log('[ExerciceMode] DEBUG commonExpr:', JSON.stringify(commonExpr), 'chars:', [...commonExpr].slice(0, 15).map(c => c.charCodeAt(0)));
                console.log('[ExerciceMode] DEBUG exprClean:', JSON.stringify(exprClean));
                console.log('[ExerciceMode]', { commonExpr, exprClean, questions: questions.map(q => `${q.num}) ${q.type}`) });

                if (questions.length >= 2 && exprClean) {
                    setLoading(true);
                    setIsTalking(true);

                    // ── 3. Pré-calculer tous les résultats déterministes ──
                    let signTableBlock = '';
                    let variationTableBlock = '';
                    let signCtx = '';
                    let tableOfValues = '';

                    for (const q of questions) {
                        if (q.type === 'sign_table') {
                            try {
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'sign_table', expression: exprClean, niveau: resolveNiveau(inputText) }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    signTableBlock = data.aaaBlock;
                                    // Construire un contexte riche avec la factorisation SymPy
                                    const ctxParts: string[] = [];
                                    if (data.factors?.length) {
                                        const numF = data.factors.filter((f: any) => f.type === 'numerator').map((f: any) => f.label);
                                        const denF = data.factors.filter((f: any) => f.type === 'denominator').map((f: any) => f.label);
                                        if (numF.length > 0) ctxParts.push(`Factorisation : f(x) = ${data.effectiveConst && data.effectiveConst < -1e-10 ? data.effectiveConst + ' × ' : ''}${numF.join(' × ')}`);
                                        if (denF.length > 0) ctxParts.push(`Dénominateur : ${denF.join(' × ')}`);
                                    }
                                    if (data.discriminantSteps?.length) {
                                        ctxParts.push('Discriminants :');
                                        for (const s of data.discriminantSteps) {
                                            ctxParts.push(`• ${s.factor} : ${s.steps.join(' ; ')}`);
                                        }
                                    }
                                    if (data.numZeros?.length) ctxParts.push(`Racines : x = ${data.numZeros.join(', ')}`);
                                    if (data.denZeros?.length) ctxParts.push(`Valeurs interdites : x = ${data.denZeros.join(', ')}`);
                                    signCtx = ctxParts.length ? '\n' + ctxParts.join('\n') : '';
                                }
                            } catch { /* AI fallback */ }
                        }
                        if (q.type === 'derivative_sign') {
                            // Calculer la dérivée avec mathjs, puis déléguer à SymPy via l'API
                            // ⚠️ On ne fait PAS de recherche de racines numérique côté client
                            // (causait un freeze par faux positifs quand f'(x) ≈ 0 partout).
                            // SymPy fait la factorisation et l'analyse de signe de façon EXACTE.
                            try {
                                const { derivative, simplify } = await import('mathjs');
                                const san = (e2: string) => e2
                                    .replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                                    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bln\b/g, 'log')
                                    .replace(/−/g, '-')
                                    .replace(/(\d)([a-zA-Z])/g, '$1*$2')   // 2x → 2*x
                                    .replace(/(\d)\(/g, '$1*(')             // 3( → 3*(
                                    .replace(/\)(\w)/g, ')*$1')             // )x → )*x
                                    .replace(/\)\(/g, ')*(');               // )( → )*(
                                const derivNode = derivative(san(exprClean), 'x');
                                const derivExpr = simplify(derivNode).toString()
                                    .replace(/\s+/g, ' ').trim();
                                console.log(`[ExerciceMode] Dérivée calculée: f'(x) = ${derivExpr}`);

                                // Envoyer directement à l'API (SymPy prioritaire, JS fallback)
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        type: 'sign_table',
                                        expression: derivExpr,
                                        niveau: resolveNiveau(inputText),
                                    }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    signTableBlock = data.aaaBlock
                                        .replace(/sign:\s*f\(x\)/g, "sign: f'(x)");
                                    signCtx = `\nInfo : f'(x) = ${derivExpr}` + (data.discriminantSteps?.length
                                        ? '\n' + data.discriminantSteps.map((s: any) => `- ${s.factor}: ${s.steps.join('; ')}`).join('\n')
                                        : '');
                                    console.log(`[ExerciceMode] ✅ Tableau de signes f'(x) via ${data.engine || 'moteur'}`);
                                } else {
                                    console.warn(`[ExerciceMode] ⚠️ Tableau de signes f'(x) échoué:`, data.error);
                                }
                            } catch (derivErr) {
                                console.warn('[ExerciceMode] Erreur calcul dérivée:', derivErr);
                            }
                        }
                        if (q.type === 'variation_table') {
                            try {
                                const res = await fetch('/api/math-engine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'variation_table', expression: exprClean, niveau: resolveNiveau(inputText) }),
                                });
                                const data = await res.json();
                                if (data.success && data.aaaBlock) {
                                    variationTableBlock = data.aaaBlock;
                                }
                            } catch { /* AI fallback */ }
                        }
                        if (q.type === 'graph') {
                            console.log(`[ExerciceMode] 📊 Handler GRAPH déclenché, exprClean="${exprClean}"`);
                            try {
                                const { compile: compileExpr } = await import('mathjs');
                                const san = (e2: string) => e2
                                    .replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                                    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bln\b/g, 'log')
                                    .replace(/−/g, '-')
                                    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
                                    .replace(/(\d)\(/g, '$1*(')
                                    .replace(/\)(\w)/g, ')*$1')
                                    .replace(/\)\(/g, ')*(');
                                const sanExpr = san(exprClean);
                                console.log(`[ExerciceMode] 📊 Expression sanitisée: "${sanExpr}"`);
                                const compiled = compileExpr(sanExpr);
                                const xVals = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
                                const rows: string[] = [];
                                for (const xv of xVals) {
                                    try {
                                        const yv = compiled.evaluate({ x: xv });
                                        if (typeof yv === 'number' && isFinite(yv)) {
                                            rows.push(`| ${xv} | ${Math.round(yv * 100) / 100} |`);
                                        }
                                    } catch { /* skip */ }
                                }
                                if (rows.length > 0) tableOfValues = `| x | f(x) |\n|---|---|\n${rows.join('\n')}`;
                                console.log(`[ExerciceMode] 📊 Tableau de valeurs: ${rows.length} points calculés`);
                            } catch (gErr) {
                                console.error('[ExerciceMode] 📊 ERREUR compilation expression:', gErr);
                            }

                            // Stocker les données du graphe pour ouverture via lien cliquable
                            try {
                                const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
                                const prettyName = exprClean
                                    .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                                    .replace(/\blog\(/g, 'ln(')
                                    .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                                    .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
                                const gs = {
                                    curves: [{ id: 'curve-0', expression: exprClean, name: `f(x) = ${prettyName}`, color: GRAPH_COLORS[0], interval: [-10, 10] as [number, number] }],
                                    intersections: [] as any[], positionsRelatives: [] as any[], tangent: null,
                                    title: `f(x) = ${prettyName}`,
                                };
                                localStorage.setItem('graphState', JSON.stringify(gs));
                                console.log(`[ExerciceMode] 📊 graphState stocké dans localStorage:`, JSON.stringify(gs).substring(0, 200));
                                // Envoyer via BroadcastChannel
                                try {
                                    const bch = new BroadcastChannel('mimimaths-graph');
                                    bch.postMessage({ type: 'UPDATE_GRAPH', state: gs }); bch.close();
                                    console.log('[ExerciceMode] 📊 BroadcastChannel envoyé');
                                } catch (bcErr) { console.warn('[ExerciceMode] 📊 BroadcastChannel échoué:', bcErr); }
                                // Essayer d'ouvrir le popup
                                try {
                                    const gw = window.open('/graph', 'mimimaths-graph', 'width=1100,height=700,menubar=no,toolbar=no');
                                    console.log(`[ExerciceMode] 📊 window.open résultat: ${gw ? 'ouvert' : 'bloqué'}`);
                                } catch { console.warn('[ExerciceMode] 📊 window.open échoué'); }
                            } catch (gsErr) {
                                console.error('[ExerciceMode] 📊 ERREUR stockage graphState:', gsErr);
                            }
                        }
                    }

                    // ── 4. Prompt IA : expliquer puis [TABLE_SIGNES] / [TABLE_VARIATIONS] ──
                    const aiParts: string[] = [];
                    // Déterminer si la question composite "étudier" est présente
                    const hasStudyDerivSign = questions.some(q => q.type === 'derivative_sign');
                    const hasStudyVarTable = questions.some(q => q.type === 'variation_table');

                    for (const q of questions) {
                        if (q.type === 'parity') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nÉtudie la parité de f :\n- Précise le domaine de définition Df et vérifie qu'il est symétrique par rapport à 0.\n- Calcule f(-x) en détaillant chaque étape.\n- Compare f(-x) avec f(x) et f(-x) avec -f(x).\n- Conclus : f est paire (si f(-x) = f(x)), impaire (si f(-x) = -f(x)), ou ni paire ni impaire.\n- Si paire/impaire, indique la conséquence sur la courbe (axe de symétrie Oy / centre de symétrie O).`
                            );
                        } else if (q.type === 'limits') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCalcule les limites aux bornes du domaine de définition :\n- Pour chaque borne (±∞ ou points d'annulation du dénominateur), factorise par le terme de plus haut degré.\n- Utilise la notation lim avec flèche (pas de notation d/dx, c'est hors programme).\n- Interprète graphiquement chaque limite : asymptote horizontale, verticale, ou branche parabolique.\n- Rédige comme dans un programme de Terminale de l'Éducation Nationale.`
                            );
                        } else if (q.type === 'derivative_sign') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCalcule f'(x) :\n- Utilise les formules de dérivation du programme (dérivée d'une somme, d'un produit, d'un quotient, de xⁿ).\n- NE PAS utiliser la notation d/dx qui est HORS PROGRAMME Lycée. Utilise f'(x).\n- Factorise f'(x) au maximum.\n- Étudie le signe de f'(x) : trouve les valeurs où f'(x) = 0, détermine le signe sur chaque intervalle.\n- Présente le résultat dans un tableau de signes clair de f'(x).\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`
                            );
                        } else if (q.type === 'sign_table') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nExplique la méthode en suivant ces étapes :\n1. Factorisation : utilise EXACTEMENT la factorisation SymPy ci-dessous, NE la modifie PAS.\n${signCtx}\n2. Pour chaque facteur de degré 2 (trinôme) : calcule Δ = b² - 4ac. NE FACTORISE PAS le trinôme en produit de facteurs de degré 1 (ex: NE PAS écrire x²-1 = (x-1)(x+1)). Utilise la règle : signe de a à l'extérieur des racines, signe opposé entre les racines.\n3. Pour chaque facteur de degré 1 : indique le signe de part et d'autre de la racine.\n4. Applique la règle des signes du produit.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\\\\\begin{array})`
                            );
                        } else if (q.type === 'solve') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nCommence par : "D'après le tableau de signes de la question ${Number(q.num) - 1}), ..."\nUtilise le tableau pour lire les intervalles où f(x) vérifie l'inégalité.\nConclus OBLIGATOIREMENT par : **S = ]-∞ ; x₁] ∪ [x₂ ; +∞[** (avec les valeurs numériques des racines)`
                            );
                        } else if (q.type === 'variation_table') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nExplique : calcule f'(x) avec les formules programme Lycée (PAS de notation d/dx), étudie le signe de f'(x), détermine les intervalles de croissance et décroissance, calcule la valeur de l'extremum.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_VARIATIONS]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`
                            );
                        } else if (q.type === 'graph') {
                            aiParts.push(
                                `**${q.num})** ${q.text}\nLa courbe a été tracée automatiquement par le moteur graphique. Clique sur le bouton ci-dessous pour l'ouvrir.`
                            );
                        } else {
                            aiParts.push(`**${q.num})** ${q.text}\nRéponds de manière pédagogique en suivant strictement le programme de Terminale de l'Éducation Nationale (Bulletin Officiel).\nNe PAS utiliser de notation hors programme (comme d/dx, nabla, etc.).${hasStudyDerivSign ? '\n⚠️ Le tableau de signes de f\'(x) est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}${hasStudyVarTable ? '\n⚠️ Le tableau de variations est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}`);
                        }
                    }

                    const enrichedMessages: ChatMessage[] = [
                        ...newMessages,
                        {
                            role: 'user' as const,
                            content: `[SYSTÈME] Exercice complet sur f(x) = ${exprClean}.\nRéponds comme un élève modèle qui traite chaque question de l'exercice.\n\n${aiParts.join('\n\n')}\n\nRÈGLES ABSOLUES :\n- NE GÉNÈRE AUCUN bloc @@@ ni tableau ASCII\n- Écris [TABLE_SIGNES] et [TABLE_VARIATIONS] EXACTEMENT là où indiqué, sur une ligne seule\n- ⛔ NE GÉNÈRE JAMAIS de tableaux LaTeX \\begin{array} pour les signes ou les variations — c'est le moteur SymPy qui les insère\n- Pour chaque question commence par le numéro en gras\n- Détaille TOUTES les étapes de calcul\n- ⛔⛔⛔ NOTATION d/dx STRICTEMENT INTERDITE (HORS PROGRAMME LYCÉE) ⛔⛔⛔\n- ⛔ JAMAIS écrire d/dx, df/dx, dy/dx, d²f/dx²\n- ⛔ JAMAIS écrire \\\\frac{d}{dx} ou \\\\frac{df}{dx}\n- ✅ TOUJOURS utiliser f'(x) (notation de Lagrange, la SEULE au programme)\n- ✅ Écrire "La dérivée de f est f'(x) = ..." et PAS "d/dx(f) = ..."`
                        }
                    ];

                    // ── 5. Streaming + remplacement des placeholders ──
                    const header = `📝 **Exercice : f(x) = ${prettifyExpr(exprClean)}**\n\n---\n\n`;
                    setMessages(prev => [...prev, { role: 'assistant', content: header + '⏳ *Résolution en cours...*' }]);

                    try {
                        const response = await fetch('/api/perplexity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                        });
                        if (!response.ok) throw new Error('Erreur API');
                        const reader = response.body?.getReader();
                        if (!reader) throw new Error('Reader non disponible');
                        const decoder = new TextDecoder();
                        let aiText = '';
                        let lastUpdate = 0;
                        // ⛔ Fonction pour supprimer la notation d/dx (Leibniz → Lagrange)
                        // SÉCURISÉE : ne touche PAS au LaTeX normal (\frac{a}{b}, etc.)
                        const stripDdx = (t: string) => t
                            // Plaintext exact : d(expr)/dx → (expr)'
                            .replace(/\bd\(([^)]+)\)\/dx\b/gi, "($1)'")
                            // Plaintext exact : df/dx → f'(x)
                            .replace(/\bdf\/dx\b/gi, "f'(x)")
                            // Plaintext exact : d/dx → (supprimé)
                            .replace(/\bd\/dx\b/gi, "")
                            // d²f/dx² → f''(x)
                            .replace(/\bd[²2]f?\/dx[²2]/gi, "f''(x)");
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            for (const ln of decoder.decode(value).split('\n')) {
                                if (!ln.startsWith('data: ')) continue;
                                const js = ln.substring(6);
                                if (js === '[DONE]') break;
                                try {
                                    const c = JSON.parse(js).choices?.[0]?.delta?.content || '';
                                    if (c) {
                                        aiText += c;
                                        // Throttle : max 1 update / 400ms pour éviter 'Maximum update depth exceeded'
                                        const now = Date.now();
                                        if (now - lastUpdate > 400) {
                                            lastUpdate = now;
                                            let disp = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                                            if (signTableBlock) disp = disp.replace(/\[TABLE_SIGNES\]/g, '\n\n' + signTableBlock + '\n\n');
                                            if (variationTableBlock) disp = disp.replace(/\[TABLE_VARIATIONS\]/g, '\n\n' + variationTableBlock + '\n\n');
                                            const fixedDisp = fixLatexContent(header + disp).content;
                                            requestAnimationFrame(() => {
                                                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fixedDisp }; return u; });
                                            });
                                        }
                                    }
                                } catch { }
                            }
                        }
                        let finalText = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                        if (signTableBlock) finalText = finalText.replace(/\[TABLE_SIGNES\]/g, '\n\n' + signTableBlock + '\n\n');
                        if (variationTableBlock) finalText = finalText.replace(/\[TABLE_VARIATIONS\]/g, '\n\n' + variationTableBlock + '\n\n');
                        if (tableOfValues && !finalText.includes('| x | f(x) |')) {
                            finalText += '\n\n**Tableau de valeurs :**\n\n' + tableOfValues;
                        }
                        // Toujours ajouter le graphe pour un exercice sur une fonction
                        // (même si pas de question 'graph' explicite dans l'OCR)
                        try {
                            const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
                            const prettyName = exprClean
                                .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                                .replace(/\blog\(/g, 'ln(')
                                .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
                                .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
                            const gs = {
                                curves: [{ id: 'curve-0', expression: exprClean, name: `f(x) = ${prettyName}`, color: GRAPH_COLORS[0], interval: [-10, 10] as [number, number] }],
                                intersections: [] as any[], positionsRelatives: [] as any[], tangent: null,
                                title: `Courbe de f(x) = ${prettyName}`,
                            };
                            localStorage.setItem('graphState', JSON.stringify(gs));
                            try {
                                const bch = new BroadcastChannel('mimimaths-graph');
                                bch.postMessage({ type: 'UPDATE_GRAPH', state: gs }); bch.close();
                            } catch { /* ignore */ }
                            console.log(`[ExerciceMode] 📊 graphState stocké pour ${exprClean}`);
                        } catch { /* ignore */ }
                        finalText += '\n\n---\n\n📊 Clique sur le bouton ci-dessous pour voir la courbe.';
                        finalText = stripDdx(finalText);
                        const finalContent = patchMarkdownTables(fixLatexContent(header + finalText).content);
                        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: finalContent }; return u; });
                    } catch (error) {
                        console.error('[ExerciceMode] Erreur streaming:', error);
                    } finally {
                        setLoading(false);
                        setIsTalking(false);
                    }
                    return;
                }
            } catch (err) {
                console.warn('[ExerciceMode] Erreur, fallback standard:', err);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // HANDLER "ÉTUDIER UNE FONCTION" (auto-génère les sous-questions BO)
        // Programme Éducation Nationale : domaine → parité → limites → dérivée → variations → courbe
        // ═══════════════════════════════════════════════════════════
        const wantsStudyFunction = /(?:étudier?|etudie)\s+(?:la\s+)?(?:fonction\s+)?(?:[fghk]|cette\s+fonction)/i.test(inputLower)
            || /(?:étude\s+(?:complète|de\s+la\s+fonction))/i.test(inputLower);

        if (wantsStudyFunction && !isMultiExpr) {
            try {
                // Extraire l'expression
                let studyExpr = '';
                const eqMatch = inputText.match(/(?:[fghk]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s*$|\.)/i);
                if (eqMatch) studyExpr = eqMatch[1].trim()
                    .replace(/[.!?]+$/, '')
                    .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                    .trim();
                if (!studyExpr) {
                    const deMatch = inputText.match(/=\s*(.+)/);
                    if (deMatch) studyExpr = deMatch[1].split('\n')[0].trim()
                        .replace(/[.!?]+$/, '')
                        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                        .trim();
                }
                if (studyExpr && studyExpr.includes('x')) {
                    // Construire l'input avec sous-questions numérotées
                    const niveau = resolveNiveau(inputText);
                    const isTerminale = niveau.startsWith('terminale');

                    let generatedInput = `f(x) = ${studyExpr}\n`;
                    let qNum = 1;
                    generatedInput += `${qNum}. Déterminer le domaine de définition de f.\n`; qNum++;
                    generatedInput += `${qNum}. Étudier la parité de f.\n`; qNum++;
                    if (isTerminale) {
                        generatedInput += `${qNum}. Déterminer les limites de f aux bornes de son domaine de définition.\n`; qNum++;
                    }
                    generatedInput += `${qNum}. Calculer la fonction dérivée de f et étudier son signe.\n`; qNum++;
                    generatedInput += `${qNum}. Dresser le tableau de variations de f.\n`; qNum++;
                    generatedInput += `${qNum}. Tracer la courbe représentative de f.\n`;

                    console.log('[ÉtudeFunction] Auto-généré:', generatedInput);
                    // Relancer handleSendMessageWithText avec les sous-questions auto-générées
                    await handleSendMessageWithText(generatedInput, newMessages);
                    return;
                }
            } catch (err) {
                console.warn('[ÉtudeFunction] Erreur, fallback:', err);
            }
        }

        if (wantsSignTable && !isMultiExpr) {
            let expr = '';
            const eqMatch = inputText.match(/=\s*(.+)/);
            if (eqMatch) expr = eqMatch[1].trim();
            if (!expr) {
                const deMatch = inputText.match(/(?:de|du)\s+(?:[fghk]\s*\(x\)\s*)?(.+)/i);
                if (deMatch) expr = deMatch[1].trim().replace(/^=\s*/, '');
            }
            expr = expr
                .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
                .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                .replace(/\bln\s*\(/g, 'log(')
                // Retirer le texte français résiduel après l'expression
                .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');

            if (expr && expr.includes('x') && expr.length > 1) {
                console.log(`[MathEngine] 🎯 Tableau de signes pour: "${expr}"`);
                try {
                    const engineRes = await fetch('/api/math-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'sign_table', expression: expr, niveau: resolveNiveau(inputText) }),
                    });
                    const engineData = await engineRes.json();
                    if (engineData.success && engineData.aaaBlock) {
                        const tableBlock = engineData.aaaBlock;
                        console.log(`[MathEngine] ✅ Injection directe du tableau SymPy`);
                        const enrichedMessages: ChatMessage[] = [
                            ...newMessages,
                            {
                                role: 'user' as const,
                                content: (() => {
                                    const parts: string[] = [];
                                    parts.push(`[SYSTÈME] ⚠️ Le tableau de signes de f(x) = ${expr} est DÉJÀ AFFICHÉ au-dessus. NE GÉNÈRE AUCUN tableau.`);

                                    // Factorisation SymPy
                                    let factorizationStr = '';
                                    if (engineData.factors?.length) {
                                        const numFactors = engineData.factors.filter((f: any) => f.type === 'numerator').map((f: any) => f.label);
                                        const denFactors = engineData.factors.filter((f: any) => f.type === 'denominator').map((f: any) => f.label);
                                        const constPart = engineData.effectiveConst && Math.abs(engineData.effectiveConst - 1) > 1e-10 && Math.abs(engineData.effectiveConst + 1) > 1e-10
                                            ? `${engineData.effectiveConst} × ` : '';
                                        if (numFactors.length > 0) {
                                            factorizationStr = `${constPart}${numFactors.map((f: string) => `(${f})`).join(' × ')}`;
                                            parts.push(`\n📌 FACTORISATION IMPOSÉE : f(x) = ${factorizationStr}`);
                                        }
                                        if (denFactors.length > 0) {
                                            parts.push(`📌 DÉNOMINATEUR : ${denFactors.map((f: string) => `(${f})`).join(' × ')}`);
                                        }
                                    }

                                    // INTERDICTION EXPLICITE
                                    parts.push(`\n⛔⛔⛔ INTERDICTIONS ABSOLUES ⛔⛔⛔`);
                                    parts.push(`- NE FACTORISE PAS DAVANTAGE les trinômes (degré 2). Par exemple si un facteur est (x²-1), tu NE DOIS PAS écrire (x-1)(x+1). Tu gardes (x²-1) tel quel.`);
                                    parts.push(`- NE GÉNÈRE AUCUN tableau (ni @@@, ni markdown, ni LaTeX \\begin{array}).`);
                                    parts.push(`- Utilise UNIQUEMENT la factorisation ci-dessus, pas une autre.`);

                                    // Étapes discriminant Δ
                                    if (engineData.discriminantSteps?.length) {
                                        parts.push(`\n📐 MÉTHODE DU DISCRIMINANT pour chaque trinôme :`);
                                        for (const s of engineData.discriminantSteps) {
                                            parts.push(`\n▸ Pour le facteur ${s.factor} :`);
                                            for (const step of s.steps) {
                                                parts.push(`  ${step}`);
                                            }
                                        }
                                    }

                                    // Modèle pédagogique
                                    parts.push(`\n📝 MODÈLE D'EXPLICATION À SUIVRE (adapte les valeurs) :`);
                                    parts.push(`---`);
                                    parts.push(`**Étape 1 : Factorisation**`);
                                    parts.push(`On écrit f(x) = ${factorizationStr || expr}`);
                                    parts.push(``);
                                    parts.push(`**Étape 2 : Étude de chaque facteur**`);
                                    parts.push(`• Pour chaque facteur de degré 1 (ex: x) : s'annule en x=0, négatif avant, positif après.`);
                                    parts.push(`• Pour chaque facteur de degré 2 (trinôme ax²+bx+c) : calcule Δ = b²-4ac.`);
                                    parts.push(`  - Si Δ > 0 : deux racines x₁ et x₂. Le trinôme est du signe de a à l'extérieur des racines, du signe opposé entre les racines.`);
                                    parts.push(`  - Si Δ = 0 : une racine double. Le trinôme est du signe de a partout sauf en la racine.`);
                                    parts.push(`  - Si Δ < 0 : pas de racine réelle. Le trinôme est du signe de a pour tout x.`);
                                    parts.push(``);
                                    parts.push(`**Étape 3 : Règle des signes**`);
                                    parts.push(`On applique la règle des signes d'un produit sur chaque intervalle délimité par les racines.`);
                                    parts.push(``);
                                    parts.push(`**Étape 4 : Conclusion**`);
                                    parts.push(`On lit le signe de f(x) sur chaque intervalle à partir du tableau affiché ci-dessus.`);
                                    parts.push(`---`);
                                    parts.push(`\n⚠️ RAPPEL : les facteurs de degré 2 se traitent AVEC LE DISCRIMINANT Δ. Ne les factorise JAMAIS en produit de facteurs de degré 1.`);

                                    return parts.join('\n');
                                })()
                            }
                        ];
                        const tablePrefix = tableBlock + '\n\n';
                        // AJOUTER un nouveau message assistant (pas remplacer !)
                        setMessages(prev => [...prev, { role: 'assistant', content: tablePrefix }]);

                        setLoading(true);
                        setIsTalking(true);
                        try {
                            const response = await fetch('/api/perplexity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                            });
                            if (!response.ok) throw new Error('Erreur API');
                            const reader = response.body?.getReader();
                            if (!reader) throw new Error('Reader non disponible');
                            const decoder = new TextDecoder();
                            let aiText = '';
                            let lastSignUpdate = 0;
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                for (const line of decoder.decode(value).split('\n')) {
                                    if (!line.startsWith('data: ')) continue;
                                    const jsonStr = line.substring(6);
                                    if (jsonStr === '[DONE]') break;
                                    try {
                                        const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                                        if (c) {
                                            aiText += c;
                                            // Throttle : max 1 update / 250ms pour éviter 'Maximum update depth exceeded'
                                            const now = Date.now();
                                            if (now - lastSignUpdate > 250) {
                                                lastSignUpdate = now;
                                                const clean = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                                                const fixedClean = fixLatexContent(tablePrefix + clean).content;
                                                setMessages(prev => {
                                                    const u = [...prev];
                                                    u[u.length - 1] = { role: 'assistant', content: fixedClean };
                                                    return u;
                                                });
                                            }
                                        }
                                    } catch { }
                                }
                            }
                            const cleanFinal = aiText
                                .replace(/@@@[\s\S]*?@@@/g, '')
                                .replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, '')  // Supprimer tableaux LaTeX générés par l'IA
                                .replace(/\|\s*x\s*\|[^\n]*\n(?:\|[^\n]*\n)*/g, '');    // Supprimer tableaux markdown de signes
                            const finalContent = patchMarkdownTables(fixLatexContent(tablePrefix + cleanFinal).content);
                            setMessages(prev => {
                                const u = [...prev];
                                u[u.length - 1] = { role: 'assistant', content: finalContent };
                                return u;
                            });
                        } catch (error) {
                            console.error('Erreur streaming:', error);
                        } finally {
                            setLoading(false);
                            setIsTalking(false);
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('[MathEngine] Erreur, fallback IA:', err);
                }
            }
        }

        // ── INTERCEPTION TABLEAU DE VARIATIONS (expression unique) ──
        const wantsVariationTable = /variation|tableau\s*de\s*variation|étudier?\s*(les?\s*)?variation/i.test(inputLower);

        if (wantsVariationTable && !isMultiExpr) {
            let expr = '';
            const eqMatch = inputText.match(/=\s*(.+)/);
            if (eqMatch) expr = eqMatch[1].trim();
            if (!expr) {
                const deMatch = inputText.match(/(?:de|du)\s+(?:[fghk]\s*\(x\)\s*)?(.+)/i);
                if (deMatch) expr = deMatch[1].trim().replace(/^=\s*/, '');
            }
            expr = expr
                .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
                // Retirer le texte français résiduel après l'expression
                .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
                .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
                .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');

            if (expr && expr.includes('x') && expr.length > 1) {
                console.log(`[MathEngine] 🎯 Tableau de variations pour: "${expr}"`);
                try {
                    const engineRes = await fetch('/api/math-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'variation_table', expression: expr, niveau: resolveNiveau(inputText) }),
                    });
                    const engineData = await engineRes.json();
                    if (engineData.success && engineData.aaaBlock) {
                        const tableBlock = engineData.aaaBlock;
                        console.log(`[MathEngine] ✅ Injection directe du tableau de variations`);
                        const enrichedMessages: ChatMessage[] = [
                            ...newMessages,
                            {
                                role: 'user' as const,
                                content: `[SYSTÈME] Le tableau de variations de f(x) = ${expr} est DÉJÀ affiché au-dessus. ⛔ NE REPRODUIS PAS le tableau (ni en @@@, ni en texte, ni en markdown, ni en ASCII). Fais UNIQUEMENT les explications pédagogiques des étapes.\n${engineData.aiContext || 'Explique les étapes de l\'étude des variations sans refaire le tableau.'}`
                            }
                        ];
                        const tablePrefix = tableBlock + '\n\n';
                        setMessages(prev => [...prev, { role: 'assistant', content: tablePrefix }]);

                        setLoading(true);
                        setIsTalking(true);
                        try {
                            const response = await fetch('/api/perplexity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messages: enrichedMessages, context: baseContext }),
                            });
                            if (!response.ok) throw new Error('Erreur API');
                            const reader = response.body?.getReader();
                            if (!reader) throw new Error('Reader non disponible');
                            const decoder = new TextDecoder();
                            let aiText = '';
                            let lastVarUpdate = 0;
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                for (const line of decoder.decode(value).split('\n')) {
                                    if (!line.startsWith('data: ')) continue;
                                    const jsonStr = line.substring(6);
                                    if (jsonStr === '[DONE]') break;
                                    try {
                                        const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                                        if (c) {
                                            aiText += c;
                                            // Throttle : max 1 update / 200ms pour éviter 'Maximum update depth exceeded'
                                            const now = Date.now();
                                            if (now - lastVarUpdate > 200) {
                                                lastVarUpdate = now;
                                                const clean = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                                                const fixedClean = fixLatexContent(tablePrefix + clean).content;
                                                setMessages(prev => {
                                                    const u = [...prev];
                                                    u[u.length - 1] = { role: 'assistant', content: fixedClean };
                                                    return u;
                                                });
                                            }
                                        }
                                    } catch { }
                                }
                            }
                            const cleanFinal = aiText.replace(/@@@[\s\S]*?@@@/g, '');
                            const finalContent = patchMarkdownTables(fixLatexContent(tablePrefix + cleanFinal).content);
                            setMessages(prev => {
                                const u = [...prev];
                                u[u.length - 1] = { role: 'assistant', content: finalContent };
                                return u;
                            });
                        } catch (error) {
                            console.error('Erreur streaming:', error);
                        } finally {
                            setLoading(false);
                            setIsTalking(false);
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('[MathEngine] Erreur variation, fallback IA:', err);
                }
            }
        }

        // ── INTERCEPTION TRACÉ DE COURBE / GRAPHIQUE ──
        // Vocabulaire officiel BO Éducation Nationale (Seconde → Terminale)
        // On normalise l'input pour supprimer les accents (évite les problèmes d'encodage é/è/ê)
        const inputNorm = inputLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const wantsGraph = (
            /\btrace\b|\btracer\b|\btrace\b|\bdessine\b|\bdessin\b/i.test(inputNorm)
            || /\bcourbe\b|\bgraphe\b|\bgraphique\b|\bplot\b/i.test(inputNorm)
            || /represent/i.test(inputNorm)  // représente, représentation (sans accent)
            || /visualise|affiche|montre/i.test(inputNorm)
            || /lecture\s+graphique/i.test(inputNorm)
        ) && !/signe|variation/i.test(inputNorm);
        const wantsAddCurve = (
            // Mots-clés explicites : "ajoute", "rajoute", "superpose"
            (/ajoute|rajoute|superpose/i.test(inputNorm) && /courbe|fonction|graph|f\s*\(|g\s*\(|h\s*\(/i.test(inputNorm))
            // "sur ce graphe", "sur le même graphe/graphique", "sur le graphique"
            || /sur\s+(ce|le\s+meme|le)\s+(graph|graphe|graphique)/i.test(inputNorm)
            // "aussi", "en plus", "également" + tracé
            || (/aussi|en\s+plus|egalement/i.test(inputNorm) && /trace|dessine/i.test(inputNorm))
            // "et trace", "et dessine" (début de phrase ou après virgule)
            || /(?:,|et)\s+(?:trace|dessine)/i.test(inputNorm)
            // g(x) ou h(x) mentionné quand il y a déjà une courbe (= probable ajout)
            || (/[gh]\s*\(\s*x\s*\)/i.test(inputLower) && (() => {
                try {
                    const stored = localStorage.getItem('graphState');
                    if (stored) {
                        const s = JSON.parse(stored);
                        return s.curves && s.curves.length > 0;
                    }
                } catch { /* ignore */ }
                return false;
            })())
        );
        const wantsIntersection = /intersection|se\s+coup|crois|point\s*commun/i.test(inputNorm);
        const wantsResolve = /resou|resolution|resoudre/i.test(inputNorm)
            && /graphi|graph|courbe|=|>|<|\bx\b/i.test(inputNorm);
        const wantsTangente = /tangente|tangent/i.test(inputNorm);
        const wantsEffacerGraph = /efface.*graph|reset.*graph|nettoie.*graph|efface.*courbe|reset.*courbe/i.test(inputNorm);
        const wantsGraphAction = wantsGraph || wantsAddCurve || wantsIntersection || wantsResolve || wantsTangente || wantsEffacerGraph;


        if (wantsGraphAction) {
            try {
                // ── Fonctions utilitaires ──
                const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];

                // Extraction de l'intervalle
                let gInterval: [number, number] = [-10, 10];
                const intMatch = inputText.match(/\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]/);
                if (intMatch) gInterval = [parseFloat(intMatch[1]), parseFloat(intMatch[2])];
                const intMatch2 = inputText.match(/(?:entre|de)\s+([+-]?\d+(?:\.\d+)?)\s+(?:et|à)\s+([+-]?\d+(?:\.\d+)?)/i);
                if (intMatch2) gInterval = [parseFloat(intMatch2[1]), parseFloat(intMatch2[2])];

                // Formater une expression mathjs en notation lisible (pour affichage)
                const prettifyMath = (expr: string): string => {
                    return expr
                        // sqrt(expr) → √(expr)
                        .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
                        .replace(/\bsqrt\b/g, '√')
                        // log(x) → ln(x) en notation française
                        .replace(/\blog\(/g, 'ln(')
                        // e^(x) → eˣ — on laisse e^(...) pour lisibilité
                        // Puissances : ^2 → ², ^3 → ³, ^4 → ⁴
                        .replace(/\^2(?![0-9])/g, '²')
                        .replace(/\^3(?![0-9])/g, '³')
                        .replace(/\^4(?![0-9])/g, '⁴')
                        // Multiplication : * → ×
                        .replace(/\*/g, '×')
                        // pi → π
                        .replace(/\bpi\b/g, 'π')
                        // Espaces autour des opérateurs
                        .replace(/([^\s])([+\-])/g, '$1 $2')
                        .replace(/([+\-])([^\s])/g, '$1 $2')
                        // Nettoyage doubles espaces
                        .replace(/\s+/g, ' ').trim();
                };

                // Nettoyage d'expression commun (LaTeX, Unicode, français → mathjs)
                const cleanExpr = (e: string) => {
                    let c = e
                        // Retirer f(x)=, g(x)=, y= etc.
                        .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
                        .replace(/^\s*y\s*=\s*/i, '')
                        // LaTeX : \frac{a}{b} → (a)/(b)
                        .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
                        // LaTeX : \sqrt{expr} → sqrt(expr)
                        .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
                        .replace(/\\sqrt\s+(\w+)/g, 'sqrt($1)')
                        // LaTeX : \left( \right) → ( )
                        .replace(/\\left\s*[([]/g, '(').replace(/\\right\s*[)\]]/g, ')')
                        // LaTeX : \cdot \times → *
                        .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
                        // LaTeX : \text{...} → contenu
                        .replace(/\\text\s*\{([^}]*)\}/g, '$1')
                        // LaTeX : backslashes restants
                        .replace(/\\[,;:!]\s*/g, ' ')
                        .replace(/\\quad/g, ' ').replace(/\\qquad/g, ' ')
                        // Unicode : ², ³
                        .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
                        // Symboles
                        .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/')
                        // Français : racine carrée de → sqrt
                        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?\(([^)]+)\)/gi, 'sqrt($1)')
                        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)')
                        // Valeur absolue
                        .replace(/\|([^|]+)\|/g, 'abs($1)')
                        // ln → log pour mathjs
                        .replace(/\bln\s*\(/g, 'log(')
                        // exp(x) → e^(x)
                        .replace(/\bexp\s*\(/g, 'e^(')
                        // Ponctuation finale
                        .replace(/\s+$/g, '').replace(/[.!?]+$/g, '')
                        .trim();
                    return c;
                };

                // Charger l'état précédent du graphe
                let graphState: any = { curves: [], intersections: [], positionsRelatives: [], tangent: null, title: '' };
                try {
                    const stored = localStorage.getItem('graphState');
                    if (stored) graphState = JSON.parse(stored);
                } catch { /* ignore */ }

                // ═══════════════════════════════════════════════════════
                // CAS 0 : EFFACER LE GRAPHIQUE
                // ═══════════════════════════════════════════════════════
                if (wantsEffacerGraph) {
                    graphState = { curves: [], intersections: [], positionsRelatives: [], tangent: null, title: '' };
                    localStorage.setItem('graphState', JSON.stringify(graphState));
                    const ch = new BroadcastChannel('mimimaths-graph');
                    ch.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                    ch.close();
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `🗑️ Graphique effacé ! Tu peux tracer une nouvelle courbe.`
                    }]);
                    return;
                }

                // ═══════════════════════════════════════════════════════
                // CAS 1 : RÉSOLUTION GRAPHIQUE (équation / inéquation)
                // ═══════════════════════════════════════════════════════
                if (wantsResolve) {
                    // Chercher le pattern : expr1 OPERATOR expr2
                    const ops = ['>=', '<=', '≥', '≤', '>', '<', '='] as const;
                    const opMap: Record<string, string> = { '>=': '≥', '<=': '≤', '≥': '≥', '≤': '≤', '>': '>', '<': '<', '=': '=' };
                    let lhs = '', rhs = '', operator = '=';

                    // Retirer le préfixe "résous graphiquement" etc.
                    let mathPart = inputText
                        .replace(/résou\w*\s*(?:graphiquement\s*)?/i, '')
                        .replace(/résolution\s*(?:graphique\s*)?(?:de\s*)?/i, '')
                        .replace(/\s+sur\s+\[.*$/i, '')  // retirer l'intervalle
                        .replace(/\s+entre\s+.*$/i, '')
                        .replace(/\s+pour\s+.*$/i, '')
                        .trim();

                    // Chercher l'opérateur
                    for (const op of ops) {
                        const idx = mathPart.indexOf(op);
                        if (idx > 0) {
                            lhs = cleanExpr(mathPart.substring(0, idx));
                            rhs = cleanExpr(mathPart.substring(idx + op.length));
                            operator = opMap[op] || '=';
                            break;
                        }
                    }

                    if (lhs && lhs.includes('x')) {
                        // Si rhs pas d'expression, c'est une constante
                        if (!rhs) rhs = '0';

                        // Construire le graphState avec 2 courbes
                        const rhsIsConst = !rhs.includes('x');
                        graphState = {
                            curves: [
                                {
                                    id: 'curve-0',
                                    expression: lhs,
                                    name: `f(x) = ${prettifyMath(lhs)}`,
                                    color: GRAPH_COLORS[0],
                                    interval: gInterval,
                                },
                                {
                                    id: 'curve-1',
                                    expression: rhs.includes('x') ? rhs : rhs,
                                    name: rhsIsConst ? `y = ${rhs}` : `g(x) = ${prettifyMath(rhs)}`,
                                    color: GRAPH_COLORS[1],
                                    interval: gInterval,
                                }
                            ],
                            intersections: '__COMPUTE__',  // Signal pour calculer les intersections
                            positionsRelatives: [],
                            tangent: null,
                            title: `Résolution : ${lhs} ${operator} ${rhs}`,
                        };

                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `🔍 **Résolution graphique** de \`${lhs} ${operator} ${rhs}\` sur [${gInterval[0]}, ${gInterval[1]}]. Regarde la fenêtre graphique !`
                        }]);
                    } else {
                        // Pas d'expression parsable → fallback IA
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 2 : TANGENTE
                // ═══════════════════════════════════════════════════════
                else if (wantsTangente) {
                    // Extraire le point x0
                    let x0: number | null = null;
                    const x0Match = inputText.match(/(?:en\s+)?x\s*=\s*([+-]?\d+(?:\.\d+)?)/i);
                    if (x0Match) x0 = parseFloat(x0Match[1]);
                    else {
                        const x0Match2 = inputText.match(/en\s+([+-]?\d+(?:\.\d+)?)/i);
                        if (x0Match2) x0 = parseFloat(x0Match2[1]);
                    }

                    // Extraire l'expression (si fournie)
                    let tangExpr = '';
                    const tangEqMatch = inputText.match(/(?:tangente\s+(?:de\s+|à\s+)?)?(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s+en\s|$)/i);
                    if (tangEqMatch) tangExpr = cleanExpr(tangEqMatch[1]);
                    if (!tangExpr) {
                        const tangVerbMatch = inputText.match(/tangente\s+(?:de\s+|à\s+)?(.+?)(?:\s+en\s|$)/i);
                        if (tangVerbMatch) tangExpr = cleanExpr(tangVerbMatch[1]);
                    }

                    // Si pas d'expression, utiliser la dernière courbe
                    if (!tangExpr && graphState.curves.length > 0) {
                        tangExpr = graphState.curves[graphState.curves.length - 1].expression;
                    }

                    if (!tangExpr || !tangExpr.includes('x')) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ Quelle fonction ? Dis par exemple : « tangente de x² en x = 2 »`
                        }]);
                        return;
                    }

                    if (x0 === null) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ En quel point ? Dis par exemple : « tangente en x = 2 »`
                        }]);
                        return;
                    }

                    // Calculer la tangente numériquement (f'(x0) par différence finie)
                    try {
                        const { compile } = await import('mathjs');
                        const sanitize = (e: string) => e.replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bln\b/g, 'log');
                        const compiled = compile(sanitize(tangExpr));
                        const evalF = (xv: number) => {
                            try { const r = compiled.evaluate({ x: xv }); return typeof r === 'number' && isFinite(r) ? r : null; } catch { return null; }
                        };

                        const y0 = evalF(x0);
                        const h = 1e-7;
                        const yPlus = evalF(x0 + h);
                        const yMinus = evalF(x0 - h);

                        if (y0 !== null && yPlus !== null && yMinus !== null) {
                            const slope = (yPlus - yMinus) / (2 * h);
                            const slopeRound = Math.round(slope * 10000) / 10000;
                            const y0Round = Math.round(y0 * 10000) / 10000;
                            const interceptRound = Math.round((y0 - slope * x0) * 10000) / 10000;

                            // S'assurer que la courbe est tracée
                            if (!graphState.curves.some((c: any) => c.expression === tangExpr)) {
                                graphState = {
                                    curves: [{
                                        id: 'curve-0',
                                        expression: tangExpr,
                                        name: `f(x) = ${prettifyMath(tangExpr)}`,
                                        color: GRAPH_COLORS[0],
                                        interval: gInterval,
                                    }],
                                    intersections: [],
                                    positionsRelatives: [],
                                    tangent: null,
                                    title: `f(x) = ${prettifyMath(tangExpr)}`,
                                };
                            }

                            graphState.tangent = {
                                x0,
                                y0: y0Round,
                                slope: slopeRound,
                                equation: `T(x) = ${slopeRound}x + ${interceptRound}`,
                                interval: gInterval,
                            };
                            graphState.title = `Tangente à f(x) = ${tangExpr} en x = ${x0}`;

                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `📐 **Tangente** à f(x) = ${tangExpr} en x = ${x0} :\n\n- f(${x0}) = ${y0Round}\n- f'(${x0}) ≈ ${slopeRound}\n- **T(x) = ${slopeRound}x + ${interceptRound}**\n\nRegarde la fenêtre graphique !`
                            }]);
                        } else {
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `❌ Impossible de calculer la tangente en x = ${x0}. La fonction n'est peut-être pas définie en ce point.`
                            }]);
                            return;
                        }
                    } catch (err) {
                        console.warn('[Tangente] Erreur calcul:', err);
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 3 : INTERSECTION (courbes déjà tracées)
                // ═══════════════════════════════════════════════════════
                else if (wantsIntersection) {
                    if (graphState.curves.length >= 2) {
                        graphState.intersections = '__COMPUTE__';
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `📊 Recherche des intersections entre ${graphState.curves.map((c: any) => c.name).join(' et ')}. Regarde la fenêtre graphique !`
                        }]);
                    } else {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❓ Il faut au moins 2 courbes tracées pour chercher une intersection. Trace d'abord une courbe, puis ajoute-en une autre !`
                        }]);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // CAS 4 : TRACER / AJOUTER UNE COURBE
                // ═══════════════════════════════════════════════════════
                else {
                    // Extraire l'expression
                    let gExpr = '';
                    const gEqMatch = inputText.match(/(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s+(?:sur|pour|entre|de\s+-?\d)\s|$)/);
                    if (gEqMatch) gExpr = gEqMatch[1].trim();
                    if (!gExpr) {
                        // Pattern étendu avec tous les verbes/noms BO
                        const gVerbMatch = inputText.match(
                            /(?:trace|tracer|dessine|ajoute|rajoute|repr[eé]sente|visualise|affiche|montre)\s+(?:(?:la\s+)?(?:courbe\s+(?:repr[eé]sentative\s+)?|repr[eé]sentation\s+graphique\s+|fonction\s+|graphe\s+|graphique\s+)?(?:de\s+)?)?(.+?)(?:\s+(?:sur|pour|entre|dans)\s|$)/i
                        );
                        if (gVerbMatch) {
                            gExpr = gVerbMatch[1].trim()
                                .replace(/^(?:de\s+)?(?:[fgh]\s*\(x\)\s*=\s*)/, '')
                                .replace(/[.!?]+$/, '');
                        }
                    }
                    gExpr = cleanExpr(gExpr);

                    // Extraire le nom de la fonction
                    const nameMatch = inputText.match(/([fghFGH])\s*\(\s*x\s*\)/);
                    const funcName = nameMatch ? nameMatch[1] : (wantsAddCurve ? 'g' : 'f');

                    if (gExpr && gExpr.includes('x')) {
                        if (wantsAddCurve && graphState.curves.length > 0) {
                            // AJOUTER une courbe
                            const idx = graphState.curves.length;
                            graphState.curves.push({
                                id: `curve-${idx}`,
                                expression: gExpr,
                                name: `${funcName}(x) = ${prettifyMath(gExpr)}`,
                                color: GRAPH_COLORS[idx % GRAPH_COLORS.length],
                                interval: gInterval,
                            });
                            graphState.title = 'Graphique multi-courbes';
                            graphState.intersections = graphState.curves.length >= 2 ? '__COMPUTE__' : [];
                            graphState.tangent = null;
                        } else {
                            // TRACER une nouvelle courbe (efface les précédentes)
                            graphState = {
                                curves: [{
                                    id: 'curve-0',
                                    expression: gExpr,
                                    name: `${funcName}(x) = ${prettifyMath(gExpr)}`,
                                    color: GRAPH_COLORS[0],
                                    interval: gInterval,
                                }],
                                intersections: [],
                                positionsRelatives: [],
                                tangent: null,
                                title: `${funcName}(x) = ${prettifyMath(gExpr)}`,
                            };
                        }

                        const action = wantsAddCurve ? 'ajoutée' : 'tracée';
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `📊 Courbe ${action} : **${funcName}(x) = ${prettifyMath(gExpr)}** sur [${gInterval[0]}, ${gInterval[1]}]. Regarde la fenêtre graphique !`
                        }]);
                    } else {
                        // Pas d'expression trouvée → laisser l'IA gérer
                        await startStreamingResponse(newMessages);
                        return;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // ENVOI AU GRAPHIQUE + IA
                // ═══════════════════════════════════════════════════════
                localStorage.setItem('graphState', JSON.stringify(graphState));
                const graphChannel = new BroadcastChannel('mimimaths-graph');
                graphChannel.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                graphChannel.close();

                // Ouvrir la fenêtre si pas déjà ouverte
                const graphWin = window.open('/graph', 'mimimaths-graph', 'width=1100,height=700,menubar=no,toolbar=no');
                if (graphWin) {
                    setTimeout(() => {
                        const ch = new BroadcastChannel('mimimaths-graph');
                        ch.postMessage({ type: 'UPDATE_GRAPH', state: graphState });
                        ch.close();
                    }, 500);
                }

                // Demander à l'IA d'expliquer
                const curvesDesc = graphState.curves.map((c: any) => c.name).join(', ');
                let aiSystemPrompt = `[SYSTÈME] Un graphique a été ouvert dans une fenêtre séparée avec ${curvesDesc}. Ne génère AUCUN graphique toi-même.`;

                if (wantsResolve) {
                    aiSystemPrompt += ` Explique la résolution graphique : comment lire les solutions sur le graphique, méthode de résolution, ensemble solution.`;
                } else if (wantsTangente && graphState.tangent) {
                    aiSystemPrompt += ` La tangente ${graphState.tangent.equation} a été tracée en x=${graphState.tangent.x0}. Explique le calcul de la tangente : dérivée, coefficient directeur, ordonnée à l'origine.`;
                } else {
                    aiSystemPrompt += ` Explique brièvement la/les fonction(s) tracée(s) : domaine, comportement, points remarquables.`;
                }

                const graphPrompt: ChatMessage[] = [
                    ...newMessages,
                    { role: 'user' as const, content: aiSystemPrompt }
                ];
                await startStreamingResponse(graphPrompt);
                return;
            } catch (err) {
                console.warn('[Graph] Erreur, fallback IA:', err);
            }
        }

        // Pas de tableau détecté → flux normal (IA seule)
        await startStreamingResponse(newMessages);
    };

    // ═══════════════════════════════════════════════════════════════════
    // WRAPPER : appelé par le formulaire (texte tapé par l'élève)
    // ═══════════════════════════════════════════════════════════════════
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || isScanning) return;
        const userMessage: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        const savedInput = input;
        setInput('');
        await handleSendMessageWithText(savedInput, newMessages);
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
                    <LevelSelector
                        selectedLevel={selectedNiveau}
                        onLevelChange={setSelectedNiveau}
                        compact
                    />
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
                            ? 'bg-blue-600/10 border border-blue-500/20 rounded-tr-none'
                            : 'bg-slate-900/50 border border-slate-800/50 rounded-tl-none'}`}
                            style={{ color: msg.role === 'user' ? '#eff6ff' : '#e2e8f0' }}>

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

                            <div className="max-w-none w-full overflow-hidden text-[15px] leading-relaxed" style={{ color: '#e2e8f0' }}>
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
