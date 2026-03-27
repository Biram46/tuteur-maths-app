'use client';

/**
 * ══════════════════════════════════════════════════════════════════
 * PAGE /geometre — Fenêtre dédiée à la géométrie dynamique
 *
 * Reçoit les scènes de deux façons :
 *  1. BroadcastChannel 'mimimaths-geometre' (IA → ouverture auto)
 *  2. URL ?key=geo_scene_... → sessionStorage (fallback)
 *
 * Flux typique :
 *   Élève: "trace le cercle de centre O et de rayon 4"
 *   IA   : génère @@@geo|...@@@ → useMathRouter.ts ouvre /geometre
 *          et envoie la scène via BroadcastChannel
 *   Page : reçoit UPDATE_GEO → parse et affiche instantanément
 * ══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { GeoCanvas } from '@/app/components/GeometryFigure';
import type { GeoScene } from '@/lib/geo-engine/types';
import { parseGeoScene } from '@/lib/geo-engine/parser';

const GEO_CHANNEL = 'mimimaths-geometre';

// ─── Scène initiale (affichée avant la première figure de l'IA) ──────────────
const WAITING_SCENE: GeoScene = {
    title: 'En attente d\'une figure...',
    repere: 'none',
    showGrid: false,
    domain: { x: [-6, 6], y: [-5, 5] },
    objects: [],
    computed: [],
};

// ─── Heuristique repère ───────────────────────────────────────────────────────
// Même logique que dans useFigureRenderer :
// Si repere === 'none' mais qu'au moins un point a des coordonnées non-triviales
// (x≠0 ou y≠0, hors points auxiliaires), on force orthonormal + grille.
function applyRepereHeuristic(scene: GeoScene): GeoScene {
    // Respecte la directive repere: telle quelle — le post-traitement de useMathRouter
    // a déjà injecté le bon type (orthonormal si l'élève a donné des coords, none sinon).
    return scene;
}

// ─── Patch anti-hallucination vecteurs ───────────────────────────────────────
// Déclenché si le titre OU la ligne 'context: vecteurs' (injectée par le routeur)
// contient "vecteur(s)". Convertit TOUS les "segment: XY" en "vecteur: XY"
// sauf si triangle: ou polygon: sont présents dans le bloc.
function patchVecteurs(raw: string): string {
    const lines = raw.split(/[\n|]/);
    const titleLine = lines.find(l => l.toLowerCase().startsWith('title:')) || '';
    const contextLine = lines.find(l => l.toLowerCase().startsWith('context:')) || '';
    const hasVectorIntent = /vecteurs?\b/i.test(titleLine) || /vecteurs?\b/i.test(contextLine);
    if (!hasVectorIntent) return raw;

    // Ne pas toucher aux triangles/polygones
    if (/^\s*triangle\s*:/im.test(raw) || /^\s*polygon[eo]?\s*:/im.test(raw)) return raw;

    // Convertir "segment: AB" → "vecteur: AB"
    let patched = raw.replace(
        /(?:^|\n)(\s*)(?:segment|seg)\s*:\s*([A-Z]{2})\s*(?=\n|$)/gim,
        (match, indent, name) => `\n${indent}vecteur: ${name.toUpperCase()}`
    );
    // Convertir "segment: A, B" → "vecteur: AB"
    patched = patched.replace(
        /(?:^|\n)(\s*)(?:segment|seg)\s*:\s*([A-Z])\s*,\s*([A-Z])\s*(?=\n|$)/gim,
        (match, indent, a, b) => `\n${indent}vecteur: ${a.toUpperCase()}${b.toUpperCase()}`
    );
    if (patched !== raw) console.log('[Géomètre] vecteur patch applied (context:', contextLine || titleLine, ')');
    return patched;
}

// ─── Parser la payload reçue depuis le BroadcastChannel ──────────────────────
// Accepte 3 sources (par priorité) :\n//  1. raw: string  — texte brut geo à parser
//  2. scene: string — GeoScene JSON sérialisé (envoyé par la carte inline)
//  3. key: string   — clé localStorage (fallback)
function parsePayload(payload: { raw?: string; scene?: string; key?: string }): GeoScene | null {
    try {
        // Priorité 1 : texte brut geo
        if (payload.raw) {
            return applyRepereHeuristic(parseGeoScene(patchVecteurs(payload.raw)));
        }
        // Priorité 2 : scène JSON complète (plus fiable que localStorage)
        if (payload.scene) {
            try {
                const parsed = JSON.parse(payload.scene);
                if (parsed.raw) return applyRepereHeuristic(parseGeoScene(patchVecteurs(parsed.raw)));
                if (parsed.objects) return applyRepereHeuristic(parsed as GeoScene);
            } catch { /* JSON invalide, continuer */ }
        }
        // Priorité 3 : clé localStorage (partagé entre fenêtres, contrairement à sessionStorage)
        if (payload.key) {
            const stored = localStorage.getItem(payload.key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    localStorage.removeItem(payload.key); // nettoyage après lecture
                    if (parsed.raw) return applyRepereHeuristic(parseGeoScene(patchVecteurs(parsed.raw)));
                    return applyRepereHeuristic(parsed as GeoScene);
                } catch { /* JSON invalide */ }
            }
        }
    } catch (e) {
        console.warn('[Géomètre] Erreur de parse:', e);
    }
    return null;
}

export default function GeometrePage() {
    const [scene, setScene] = useState<GeoScene>(WAITING_SCENE);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('En attente d\'une figure depuis le chat...');
    const [isLive, setIsLive] = useState(false);
    const [windowSize, setWindowSize] = useState({ w: 1000, h: 720 });
    const [showInfo, setShowInfo] = useState(true);
    const [showHelp, setShowHelp] = useState(false);

    // ── 1. Écoute BroadcastChannel (IA → mise à jour en temps réel) ──────────
    const lastProcessedKey = useRef<string>('');

    useEffect(() => {
        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(GEO_CHANNEL);
            channel.onmessage = (e) => {
                const { type, ...payload } = e.data;
                if (type === 'UPDATE_GEO') {
                    // Anti-doublon : ignorer les retries du même envoi
                    const msgKey = payload.key || payload.raw?.slice(0, 50) || '';
                    if (msgKey && msgKey === lastProcessedKey.current) {
                        console.log('[Géomètre] BC doublon ignoré:', msgKey);
                        return;
                    }

                    console.log('[Géomètre] Payload:', JSON.stringify(payload).slice(0, 200));
                    const newScene = parsePayload(payload);
                    console.log('[Géomètre] Scene parsée:', newScene ? `${newScene.objects.length} objets` : 'NULL');
                    if (newScene) {
                        lastProcessedKey.current = msgKey;
                        console.log('[Géomètre] Objets:', newScene.objects.map(o => `${o.kind}:${o.id}`));
                        setScene(newScene);
                        setIsLive(true);
                        setStatus(`Figure mise à jour à ${new Date().toLocaleTimeString('fr-FR')}`);
                    }
                }
            };
        } catch {
            console.warn('[Géomètre] BroadcastChannel non supporté');
        }
        return () => { try { channel?.close(); } catch { } };
    }, []);

    // ── 2. Chargement initial via ?key= + purge anciennes clés localStorage ──
    useEffect(() => {
        setLoading(false); // déverrouiller immédiatement — le BC prend le relai
        const params = new URLSearchParams(window.location.search);
        const key = params.get('key');

        if (key) {
            const newScene = parsePayload({ key });
            if (newScene) {
                setScene(newScene);
                setIsLive(true);
                setStatus('Figure chargée depuis le chat');
            } else {
                setStatus('En attente de la figure depuis le chat...');
            }
        }

        // Purger les anciennes clés geo_scene_ (localStorage, ne pas laisser croître)
        try {
            const keysToRemove = Object.keys(localStorage)
                .filter(k => k.startsWith('geo_scene_') && k !== key);
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }
    }, []);

    // ── 3. Taille fenêtre responsive ──────────────────────────────────────────
    useEffect(() => {
        const update = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // ── 4. Titre dynamique de l'onglet ────────────────────────────────────────
    useEffect(() => {
        document.title = scene.title && !scene.title.includes('attente')
            ? `📐 ${scene.title} — mimimaths@ai`
            : '📐 Géomètre — mimimaths@ai';
    }, [scene.title]);

    const canvasW = showInfo ? windowSize.w - 288 : windowSize.w;
    const canvasH = windowSize.h - 56 - 24; // header + status bar

    if (loading) {
        return (
            <div className="w-screen h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-mono">Initialisation du géomètre...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-screen h-screen flex flex-col overflow-hidden"
            style={{ background: '#020617', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* ════ HEADER ════ */}
            <header className="h-14 shrink-0 flex items-center justify-between px-4 z-20"
                style={{ background: 'rgba(2,6,23,0.92)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

                {/* Branding */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.35)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            strokeWidth={1.5} stroke="#818cf8" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">
                            mimimaths<span style={{ color: '#818cf8' }}>@</span>ai
                        </p>
                        <p className="text-[10px] mt-[-1px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
                            {scene.title && !scene.title.includes('attente') ? scene.title : 'Géomètre Dynamique'}
                        </p>
                    </div>
                </div>

                {/* Badges scène */}
                <div className="hidden md:flex items-center gap-2">
                    {isLive && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono"
                            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                    {scene.objects.filter(o => o.kind === 'point' && !(o as any).id?.startsWith('_')).length} pts
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                        {scene.objects.length} objets
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowHelp(h => !h)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all"
                        style={{
                            background: showHelp ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                            border: showHelp ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: showHelp ? '#a5b4fc' : 'rgba(148,163,184,0.7)'
                        }}>?</button>

                    <button onClick={() => setShowInfo(s => !s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                        style={{
                            background: showInfo ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                            border: showInfo ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: showInfo ? '#a5b4fc' : 'rgba(148,163,184,0.7)'
                        }}>
                        ☰ Infos
                    </button>

                    <button onClick={() => window.close()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)' }}
                        onMouseEnter={e => {
                            (e.target as HTMLElement).style.color = '#f87171';
                            (e.target as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLElement).style.color = 'rgba(148,163,184,0.7)';
                            (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        }}>
                        ✕
                    </button>
                </div>
            </header>

            {/* ════ CORPS ════ */}
            <div className="flex flex-1 overflow-hidden">

                {/* Canvas */}
                <div className="flex-1 relative">
                    <GeoCanvas scene={scene} width={canvasW} height={canvasH} interactive />

                    {/* Overlay "En attente" */}
                    {!isLive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none">
                            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl"
                                style={{ background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                                <p className="text-[12px] font-mono" style={{ color: 'rgba(148,163,184,0.8)' }}>
                                    Discute avec mimimaths@ai pour générer une figure
                                </p>
                                <p className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>
                                    Ex : « trace le cercle de centre O et de rayon 4 »
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Aide navigation */}
                    {showHelp && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-3 rounded-2xl min-w-[280px]"
                            style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <p className="font-bold text-white text-[12px] mb-2">Navigation</p>
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px] font-mono">
                                <span style={{ color: '#a5b4fc' }}>Molette</span><span style={{ color: '#94a3b8' }}>Zoom</span>
                                <span style={{ color: '#a5b4fc' }}>Alt + Glisser</span><span style={{ color: '#94a3b8' }}>Déplacer</span>
                                <span style={{ color: '#a5b4fc' }}>Survol point</span><span style={{ color: '#94a3b8' }}>Coordonnées</span>
                                <span style={{ color: '#a5b4fc' }}>+  −  ↺</span><span style={{ color: '#94a3b8' }}>Bas droite</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════ PANNEAU LATÉRAL ════ */}
                {showInfo && (
                    <aside className="w-72 shrink-0 flex flex-col overflow-hidden"
                        style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2,6,23,0.7)' }}>

                        {/* En-tête */}
                        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a5b4fc' }}>
                                Objets de la scène
                            </p>
                        </div>

                        {/* Liste objets */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {scene.objects.length === 0 && (
                                <p className="text-center text-[11px] mt-8 font-mono" style={{ color: 'rgba(148,163,184,0.3)' }}>
                                    Aucun objet
                                </p>
                            )}
                            {scene.objects
                                .filter(o => !(o.kind === 'point' && (o as any).id?.startsWith('_')))
                                .map((obj, i) => {
                                const cfg: Record<string, { bg: string; border: string; text: string; label: string }> = {
                                    point: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', text: '#a5b4fc', label: 'Pt' },
                                    segment: { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', text: '#fda4af', label: 'Seg' },
                                    line: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', text: '#6ee7b7', label: 'Dr' },
                                    circle: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', text: '#fcd34d', label: 'Circ' },
                                    vector: { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', text: '#fda4af', label: 'Vec' },
                                    angle: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', text: '#fcd34d', label: '∠' },
                                    polygon: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: '#c4b5fd', label: 'Poly' },
                                    label: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', label: 'Txt' },
                                };
                                const c = cfg[obj.kind] || cfg.label;

                                const getName = (): string => {
                                    switch (obj.kind) {
                                        case 'point': return `${(obj as any).id}  (${(obj as any).x} ; ${(obj as any).y})`;
                                        case 'segment': return `[${(obj as any).from}${(obj as any).to}]`;
                                        case 'line': return (obj as any).label || `(${(obj as any).through?.join('')})`;
                                        case 'circle': return `⊙ ${(obj as any).center}  r=${(obj as any).radiusValue ?? '?'}`;
                                        case 'vector': return `→ ${(obj as any).from}${(obj as any).to}`;
                                        case 'angle': return `∠ ${(obj as any).vertex}`;
                                        default: return obj.kind;
                                    }
                                };

                                return (
                                    <div key={i}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono"
                                        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                                        <span className="text-[9px] font-bold uppercase shrink-0 opacity-60">{c.label}</span>
                                        <span className="truncate">{getName()}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Résultats exacts */}
                        {scene.computed && scene.computed.length > 0 && (
                            <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#34d399' }}>
                                    Résultats exacts
                                </p>
                                {scene.computed.map((r, i) => (
                                    <div key={i} className="flex flex-col px-3 py-2 rounded-xl"
                                        style={{ background: 'rgba(16,64,48,0.4)', border: '1px solid rgba(52,211,153,0.2)' }}>
                                        <span className="text-[10px]" style={{ color: '#64748b' }}>{r.label}</span>
                                        <span className="font-mono text-[13px] font-bold mt-0.5" style={{ color: '#34d399' }}>
                                            {r.latex}
                                        </span>
                                        {r.approx && (
                                            <span className="text-[10px] mt-0.5" style={{ color: '#475569' }}>≈ {r.approx}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[9px] text-center font-mono" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                Géomètre · mimimaths@ai
                            </p>
                        </div>
                    </aside>
                )}
            </div>

            {/* ════ BARRE DE STATUT ════ */}
            <div className="h-6 shrink-0 px-4 flex items-center gap-3 text-[10px] font-mono"
                style={{ background: 'rgba(2,6,23,0.9)', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(100,116,139,0.7)' }}>
                {isLive
                    ? <span style={{ color: '#34d399' }}>● {status}</span>
                    : <span>○ {status}</span>}
                <span>·</span>
                <span>{scene.objects.length} objet(s)</span>
                <span>·</span>
                <span>Molette: zoom · Alt+glisser: déplacer</span>
            </div>
        </div>
    );
}
