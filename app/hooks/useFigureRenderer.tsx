'use client';

import React, { useCallback } from 'react';
import { FigureErrorBoundary } from '@/app/components/FigureErrorBoundary';
import MathGraph, { GraphPoint } from '@/app/components/MathGraph';
import MathTree, { TreeNode } from '@/app/components/MathTree';
import MathTable from '@/app/components/MathTable';
import IntervalAxis from '@/app/components/IntervalAxis';
import GeometryFigure from '@/app/components/GeometryFigure';
import { parseGeoScene } from '@/lib/geo-engine/parser';
import type { GeoObject, GeoScene } from '@/lib/geo-engine/types';
import GeoGebraPlotter from '@/app/components/GeoGebraPlotter';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

// ─── Hook de rendu des figures mathématiques et messages ─────────────────────

export function useFigureRenderer() {
    // Cache des blocs déjà parsés : évite de re-parser + re-dessiner D3 à chaque tick de streaming
    const figureCache = React.useRef(new Map<string, React.ReactNode>());

    // renderFigure : pas de dépendance externe → créée une seule fois
    const renderFigure = useCallback((rawBlock: string) => {
        // ── Cache hit : retourner le résultat déjà calculé ──
        if (figureCache.current.has(rawBlock)) {
            return figureCache.current.get(rawBlock);
        }
        const _cacheAndReturn = (node: React.ReactNode) => {
            figureCache.current.set(rawBlock, node);
            return node;
        };
        try {
            // Remplacement des tirets longs et espaces insécables
            const raw = rawBlock.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');

            // ─── CAS GEO : Bloc géométrique (généré par mimimaths@ai) ───────────
            // Format : "geo | title: ... | point: A, 0, 0 | segment: AB | ..."
            const firstToken = raw.split(/[|\n]/)[0].trim().toLowerCase();
            if (firstToken === 'geo' || firstToken.startsWith('geo ')) {
                // Les blocs geo sont affichés dans la fenêtre /geometre séparée.
                // Ici on affiche seulement un petit placeholder de confirmation.
                try {
                    const geoScene = parseGeoScene(raw);
                    const title = geoScene.title || 'Figure géométrique';
                    const objCount = geoScene.objects.length;
                    return (
                        <div key={`geo-${raw.slice(0, 30)}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono"
                            style={{
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                color: '#a5b4fc',
                            }}>
                            <span className="text-base">📐</span>
                            <span>{title} — {objCount} objet(s)</span>
                            <span style={{ color: 'rgba(148,163,184,0.5)' }}>→ fenêtre Géomètre</span>
                        </div>
                    );
                } catch {
                    return null;
                }
            }

            // Pour les tableaux, on normalise d'abord en remplaçant les retours à la ligne par des espaces
            // Puis on divise par | uniquement
            const isTableBlock = raw.toLowerCase().includes('table') ||
                raw.toLowerCase().includes('x:') ||
                raw.toLowerCase().includes('sign:') ||
                raw.toLowerCase().includes('var');

            const isTreeBlock = raw.toLowerCase().includes('arbre') || raw.toLowerCase().includes('tree');

            let sections: string[];
            if (isTableBlock) {
                // Pour les tableaux : remplacer \n par espace
                // IMPORTANT: Protéger || avant de diviser par |
                const normalized = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ');

                // Remplacer || par un placeholder, diviser par |, puis restaurer
                const DOUBLE_BAR_PLACEHOLDER = '___DOUBLE_BAR___';
                const protectedStr = normalized.replace(/\|\|/g, DOUBLE_BAR_PLACEHOLDER);
                sections = protectedStr.split('|').map(s => s.trim().replace(new RegExp(DOUBLE_BAR_PLACEHOLDER, 'g'), '||')).filter(s => s.length > 0);
            } else if (isTreeBlock) {
                // Pour les arbres : diviser UNIQUEMENT par \n (le | est utilisé dans P(B|A))
                sections = raw.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
            } else {
                // Pour les autres (graphiques) : diviser par | OU \n
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

            // --- CAS 0.6 : FIGURE GÉOMÉTRIQUE ANIMÉE (ancien format "figure|...") ---
            // ⛔ Exclure explicitement les blocs arbre — l'IA peut écrire "figure" même pour un arbre
            const isArbreBlock = raw.toLowerCase().includes('arbre') || raw.toLowerCase().includes('tree');
            if (sections[0].toLowerCase().includes('figure') && !isArbreBlock) {
                const objects: GeoObject[] = [];
                let figureTitle = '';

                sections.forEach(sec => {
                    const low = sec.toLowerCase().trim();
                    if (low.startsWith('title:')) {
                        figureTitle = sec.substring(sec.indexOf(':') + 1).trim();
                    } else if (low.startsWith('points:')) {
                        const pts = sec.substring(sec.indexOf(':') + 1)
                            .match(/([A-Z])\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g);
                        pts?.forEach(pt => {
                            const m = pt.match(/([A-Z])\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
                            if (m) objects.push({ kind: 'point', id: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]) });
                        });
                    } else if (low.startsWith('segments:')) {
                        const segs = sec.substring(sec.indexOf(':') + 1).match(/\[([A-Z])([A-Z])\]/g);
                        segs?.forEach((s, i) => {
                            const m = s.match(/\[([A-Z])([A-Z])\]/);
                            if (m) objects.push({ kind: 'segment', id: `seg${i}`, from: m[1], to: m[2] });
                        });
                    } else if (low.startsWith('lines:')) {
                        sec.substring(sec.indexOf(':') + 1).split(',').forEach((l, i) => {
                            const m = l.trim().match(/\(([A-Z])([A-Z])\)/);
                            if (m) objects.push({ kind: 'line', id: `line${i}`, type: 'line', through: [m[1], m[2]] as [string, string] });
                        });
                    } else if (low.startsWith('circles:')) {
                        const circs = sec.substring(sec.indexOf(':') + 1)
                            .match(/cercle\s*\(\s*([A-Z])\s*,\s*([\d.]+)\s*\)/g);
                        circs?.forEach((c, i) => {
                            const m = c.match(/cercle\s*\(\s*([A-Z])\s*,\s*([\d.]+)\s*\)/);
                            if (m) objects.push({ kind: 'circle', id: `circ${i}`, center: m[1], radiusValue: parseFloat(m[2]) });
                        });
                    }
                });

                if (objects.some(o => o.kind === 'point')) {
                    const geoScene: GeoScene = { objects, title: figureTitle, repere: 'none', showGrid: false };
                    return <GeometryFigure key={rawBlock} scene={geoScene} />;
                }
            }

            // --- CAS 1 : ARBRE DE PROBABILITÉS ---

            if (sections[0].toLowerCase().includes('tree') || sections[0].toLowerCase().includes('arbre')) {
                const treeNodesMap = new Map<string, TreeNode>();
                const title = sections[0].split(':')[1]?.trim() || "Arbre de Probabilités";
                treeNodesMap.set('root', { id: 'root', label: 'Ω' });

                // Normalisation Unicode robuste
                const normalize = (s: string): string => {
                    return s
                        .normalize('NFD')
                        // Unifier combinant macron (U+0304) et combinant overline (U+0305)
                        .replace(/\u0304/g, '\u0305')
                        .replace(/\\(bar|overline)\{([^}]*)\}/g, '$2\u0305')
                        .replace(/\\(bar|overline)\s+([a-zA-Z0-9])/g, '$2\u0305')
                        .replace(/([a-zA-Z0-9])\^\{(c|\\complement)\}/g, '$1\u0305')
                        .replace(/([a-zA-Z0-9])\^c\b/g, '$1\u0305')
                        .replace(/\\text\{([^}]*)\}/g, '$1')
                        .replace(/\$/g, '')
                        .trim();
                };

                console.log('%c[Tree] ══ RAW BLOCK ══', 'color:lime;font-size:14px', '\n' + rawBlock);
                console.log('[Tree] Raw sections:', sections.slice(1));

                sections.slice(1).forEach(sec => {
                    if (sec.toLowerCase().includes(':root')) {
                        treeNodesMap.get('root')!.label = sec.split(':')[0].trim();
                        return;
                    }

                    const cleanSec = normalize(sec);
                    if (!cleanSec) return;

                    // Skip la ligne "Ω, 1" car Ω est déjà la racine
                    if (/^[Ωω]\s*,/.test(cleanSec) || cleanSec === 'Ω' || cleanSec === 'ω') return;

                    // Séparation chemin / probabilité
                    let pathPart = cleanSec;
                    let val: string | undefined = undefined;

                    // 1) Chercher une valeur numérique : fraction ou décimal
                    const probMatch = cleanSec.match(/,\s*(\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?)\s*$/);
                    // 2) Sinon, chercher P(...), P_X(...), ou ? 
                    const symbMatch = !probMatch ? cleanSec.match(/,\s*(P[_(\[][^\]]*[\])]?|\?)\s*$/) : null;

                    if (probMatch) {
                        pathPart = cleanSec.substring(0, probMatch.index!).trim();
                        val = probMatch[1];
                    } else if (symbMatch) {
                        // Valeur symbolique → on la supprime du chemin mais on ne l'affiche pas
                        pathPart = cleanSec.substring(0, symbMatch.index!).trim();
                        val = undefined; // ne pas afficher P(B|A) ou ?
                    }

                    console.log(`[Tree]   sec="${sec}" → path="${pathPart}", val="${val}"`);

                    // Remplacer TOUS les types de flèches par un séparateur unique
                    const normalizedPath = pathPart
                        .replace(/\s*→\s*/g, '§')    // Unicode →
                        .replace(/\s*->\s*/g, '§')   // ASCII ->
                        .replace(/\s*➜\s*/g, '§')    // Unicode ➜
                        .replace(/\s*⟶\s*/g, '§');   // Unicode ⟶

                    const parts = normalizedPath
                        .split('§')
                        .map(p => normalize(p))
                        .filter(p => p.length > 0);

                    if (parts.length === 0) return;

                    // ⚠️ Détecter un label manquant (ex: "R->R->," → dernier segment vide)
                    // Le filtre ci-dessus supprime les segments vides, donc une ligne
                    // comme "R->R->B" avec B absent est silencieusement tronquée.
                    // On vérifie si le chemin brut se termine par '->' (flèche pendante).
                    const hasTrailingArrow = /[-→➜⟶]\s*$/.test(pathPart);
                    if (hasTrailingArrow) {
                        console.warn(`[Tree] ⚠️ Label manquant détecté (flèche pendante): "${sec}" — branche ignorée`);
                        return;
                    }

                    let currentParentId = 'root';
                    let cumulativePath = 'root';

                    parts.forEach((label, idx) => {
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

                const nodes = Array.from(treeNodesMap.values());
                console.log('[Tree] Nodes:', nodes.map(n => `${n.label} [id:${n.id}] (parent:${n.parent}, val:${n.value})`));

                // Vérification : compter les enfants directs de root
                const rootChildren = nodes.filter(n => n.parent === 'root');
                console.log(`[Tree] Children of root: ${rootChildren.length}`, rootChildren.map(n => n.label));

                return _cacheAndReturn(<MathTree key={rawBlock} data={nodes} title={title} />);
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

                        // ── Garde 1 : ignorer les lignes en langage naturel ────────────────────
                        // Une ligne valide DOIT commencer par 'sign', 'var', ou être une expr math
                        const prefixLow = prefixAndLabel.toLowerCase();
                        const isExplicitSignOrVar = prefixLow.startsWith('sign') || prefixLow.startsWith('var');
                        // Heuristique : trop de mots = langage naturel (ex: "Décompose bien chaque...")
                        const wordCount = prefixAndLabel.trim().split(/\s+/).length;
                        const looksLikeNaturalLanguage = !isExplicitSignOrVar && wordCount > 5;
                        // Mots français courants en début de phrase = instruction élève parasite
                        const frenchInstructionWords = /^(décompose|donne|calcule|trouve|sur\s+ℝ|sur\s+r\b|note|donc|pour|sachant|puisque|comme|avec|en déduire|en\s+déduit)/i;
                        if (looksLikeNaturalLanguage || frenchInstructionWords.test(prefixAndLabel.trim())) {
                            console.warn('[Table] Ligne ignorée (langage naturel détecté):', prefixAndLabel.slice(0, 50));
                            return;
                        }

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

                        // ── Garde 2 : nettoyer le label des suffixes de domaine ────────────────
                        // Ex: "(2x-4)(x+3) sur ℝ" → "(2x-4)(x+3)"
                        label = label
                            .replace(/\s+sur\s+ℝ\s*$/i, '')
                            .replace(/\s+sur\s+R\s*$/i, '')
                            .replace(/\s+pour\s+tout\s+x\s*$/i, '')
                            .replace(/\s+∀x\s*$/i, '')
                            .trim();

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
                return _cacheAndReturn(
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // renderMessageContent : dépend de renderFigure (stable grâce à useCallback)
    const renderMessageContent = useCallback((content: string) => {
        if (!content) return null;

        // ── Contexte probabilité : détecter dans le message ENTIER ──────────────
        const contentLower = content.toLowerCase();
        const isProbabilityContext =
            contentLower.includes('arbre de probabilit') ||
            contentLower.includes('probabilit') && (
                contentLower.includes('urne') ||
                contentLower.includes('tirage') ||
                contentLower.includes('boule') ||
                contentLower.includes('dé') ||
                contentLower.includes('issue') ||
                contentLower.includes('événement') ||
                contentLower.includes('p(a') ||
                contentLower.includes('p(b')
            );

        // ── Détecteur : un @@@figure ou @@@geo est-il une tentative d'arbre probabiliste ? ──
        const isFakeProbabilityFigure = (rawBlock: string): boolean => {
            if (!isProbabilityContext) return false;
            const low = rawBlock.toLowerCase();
            const firstToken = low.split(/[|\n]/)[0].trim();

            // Détecter les blocs figure ET geo
            const isGeoBlock = firstToken === 'geo' || firstToken.startsWith('geo ');
            const isFigureBlock = low.startsWith('figure');
            if (!isGeoBlock && !isFigureBlock) return false;

            // Titre contient explicitement arbre/probabilit → toujours fausse figure
            if (low.includes('arbre') || low.includes('probabilit')) {
                console.warn('[Figure] ⚠️ Bloc supprimé (titre probabiliste):', firstToken);
                return true;
            }

            // Pour les blocs geo : si en contexte probabilité → toujours supprimer
            // (le format geo est réservé à la géométrie pure, JAMAIS aux arbres)
            if (isGeoBlock && isProbabilityContext) {
                console.warn('[Figure] ⚠️ @@@geo supprimé : contexte probabilité détecté');
                return true;
            }

            // Pour les blocs figure : heuristique structure d'arbre
            const hasRealGeometry = low.includes('circle') || low.includes('cercle') ||
                low.includes('angle') || low.includes('vecteur') || low.includes('vector') ||
                low.includes('triangle') || low.includes('quadrilat');
            if (hasRealGeometry) return false;
            const segmentCount = (rawBlock.match(/\[[A-Z][A-Z]\]/g) || []).length;
            const pointCount = (rawBlock.match(/[A-Z]\([^)]+\)/g) || []).length;
            return segmentCount >= 3 && pointCount >= 4 && segmentCount >= pointCount - 1;
        };

        // 1. Découpage par blocs @@@ ET Blocs de code math-table
        const sections = content.split(/(@@@[\s\S]*?@@@|```math-table[\s\S]*?```|```json[\s\S]*?```)/g);

        return sections.map((section, idx) => {
            // Bloc @@@
            if (section.startsWith('@@@') && section.endsWith('@@@')) {
                const rawBlock = section.substring(3, section.length - 3);

                // ── Intercepter les faux @@@figure (arbre probabiliste déguisé) ──
                if (isFakeProbabilityFigure(rawBlock.trim())) {
                    console.warn('[Figure] ⚠️ @@@figure supprimé : contexte probabilité détecté — utiliser @@@tree', rawBlock.slice(0, 80));
                    return null;
                }

                return (
                    <FigureErrorBoundary key={`fig-${idx}`} blockId={rawBlock}>
                        {renderFigure(rawBlock)}
                    </FigureErrorBoundary>
                );
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
                const figBlock = rawBlock.includes('|') ? `table | ${rawBlock}` : `table | ${rawBlock.replace(/\n/g, ' | ')}`;
                return (
                    <FigureErrorBoundary key={`tbl-${idx}`} blockId={figBlock}>
                        {renderFigure(figBlock)}
                    </FigureErrorBoundary>
                );
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
    }, [renderFigure]);


    return { renderFigure, renderMessageContent };
}