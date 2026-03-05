'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getAllNiveaux, getNiveauInfo, type NiveauLycee } from '@/lib/niveaux';

interface LevelSelectorProps {
    selectedLevel: NiveauLycee | null;
    onLevelChange: (niveau: NiveauLycee) => void;
    compact?: boolean;
}

const NIVEAU_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    seconde: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', dot: '#3b82f6' },
    premiere_commune: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', dot: '#22c55e' },
    premiere_spe: { bg: '#fefce8', border: '#eab308', text: '#854d0e', dot: '#eab308' },
    terminale_spe: { bg: '#fff7ed', border: '#f97316', text: '#9a3412', dot: '#f97316' },
    terminale_comp: { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce', dot: '#a855f7' },
    terminale_expert: { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239', dot: '#f43f5e' },
    seconde_sthr: { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e', dot: '#14b8a6' },
    premiere_techno: { bg: '#faf5ff', border: '#8b5cf6', text: '#6d28d9', dot: '#8b5cf6' },
    terminale_techno: { bg: '#f8fafc', border: '#64748b', text: '#334155', dot: '#64748b' },
};

const GROUPES: { label: string; niveaux: NiveauLycee[] }[] = [
    {
        label: '📘 Voie Générale',
        niveaux: ['seconde', 'premiere_commune', 'premiere_spe', 'terminale_spe', 'terminale_comp', 'terminale_expert'],
    },
    {
        label: '⚙️ Voie Technologique',
        niveaux: ['seconde_sthr', 'premiere_techno', 'terminale_techno'],
    },
];

export default function LevelSelector({ selectedLevel, onLevelChange, compact = false }: LevelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedInfo = selectedLevel ? getNiveauInfo(selectedLevel) : null;
    const selectedColors = selectedLevel ? NIVEAU_COLORS[selectedLevel] : null;

    // ─── Calcul de la position du dropdown (compatible mobile + desktop) ───────
    const computeDropdownPosition = useCallback(() => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const viewportW = window.innerWidth || document.documentElement.clientWidth;
        const viewportH = window.innerHeight || document.documentElement.clientHeight;

        const DROPDOWN_W = Math.min(288, viewportW - 16); // max viewport - marges
        const DROPDOWN_MAX_H = Math.min(420, viewportH - rect.bottom - 12);

        // Calcul de la position horizontale : éviter débordement à droite
        let left = rect.left;
        if (left + DROPDOWN_W > viewportW - 8) {
            left = viewportW - DROPDOWN_W - 8;
        }
        if (left < 8) left = 8;

        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            left,
            width: DROPDOWN_W,
            maxHeight: DROPDOWN_MAX_H,
            overflowY: 'auto',
            zIndex: 99999,
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            // Scrollbar fine sur webkit
            WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties);
    }, []);

    // ─── Ouvrir / fermer ────────────────────────────────────────────────────────
    const handleToggle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isOpen) {
            computeDropdownPosition();
        }
        setIsOpen(prev => !prev);
    }, [isOpen, computeDropdownPosition]);

    const close = useCallback(() => setIsOpen(false), []);

    // ─── Fermeture sur clic / touch extérieur (cross-browser) ──────────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            // Fermer si clic hors du bouton ET hors du dropdown
            const outsideButton = buttonRef.current && !buttonRef.current.contains(target);
            const outsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
            if (outsideButton && outsideDropdown) {
                close();
            }
        };

        // mousedown + touchstart pour couvrir desktop ET ios/android
        document.addEventListener('mousedown', handleOutside, { passive: true });
        document.addEventListener('touchstart', handleOutside, { passive: true });

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [isOpen, close]);

    // ─── Fermeture sur scroll ou resize (mobile : viewport change) ─────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => {
            // Sur mobile, recalculer la position plutôt que fermer
            // afin d'éviter de fermer à chaque micro-scroll iOS
            computeDropdownPosition();
        };

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
        window.addEventListener('resize', handleScrollOrResize, { passive: true });
        document.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [isOpen, close, computeDropdownPosition]);

    // ─── Sélection d'un niveau ──────────────────────────────────────────────────
    const handleSelect = useCallback((niveauId: NiveauLycee) => {
        onLevelChange(niveauId);
        close();
    }, [onLevelChange, close]);

    // ─── Style du bouton déclencheur ────────────────────────────────────────────
    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        // Taille minimale tactile 44px (Apple HIG + Material)
        minHeight: 44,
        minWidth: 44,
        padding: compact ? '0 14px' : '0 18px',
        background: selectedColors ? selectedColors.bg : 'rgba(255,255,255,0.08)',
        border: `2px solid ${selectedColors ? selectedColors.border : 'rgba(255,255,255,0.2)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: compact ? 13 : 14,
        fontWeight: 600,
        color: selectedColors ? selectedColors.text : '#94a3b8',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent', // Supprimer le flash bleu Android
        touchAction: 'manipulation',            // Éviter le double-tap iOS zoom
        userSelect: 'none',
        WebkitUserSelect: 'none',
        outline: 'none',
        transition: 'box-shadow 0.2s',
    };

    return (
        <>
            {/* Bouton déclencheur */}
            <button
                ref={buttonRef}
                onClick={handleToggle}
                onTouchEnd={handleToggle}        /* iOS : garantit la réponse tactile */
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={selectedInfo ? `Niveau : ${selectedInfo.label}` : 'Choisir mon niveau'}
                style={buttonStyle}
            >
                {/* Point coloré */}
                {selectedColors && (
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: selectedColors.dot, flexShrink: 0,
                        display: 'inline-block',
                    }} />
                )}
                {!selectedLevel && <span style={{ fontSize: 15 }}>🎓</span>}

                <span style={{ flex: 1 }}>
                    {selectedInfo ? selectedInfo.label : 'Mon niveau'}
                </span>

                {/* Chevron */}
                <svg
                    aria-hidden="true"
                    style={{
                        width: 14, height: 14, flexShrink: 0,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown — rendu en position fixed hors de tout parent clippant */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    aria-label="Sélection du niveau"
                    style={dropdownStyle}
                >
                    {/* Styles internes (CSS-in-JS, compatible SSR + tous navigateurs) */}
                    <style>{`
                        .lvl-item {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            width: 100%;
                            padding: 10px 10px;
                            background: transparent;
                            border: 1px solid transparent;
                            border-radius: 10px;
                            cursor: pointer;
                            text-align: left;
                            margin-bottom: 2px;
                            -webkit-tap-highlight-color: transparent;
                            touch-action: manipulation;
                            -webkit-user-select: none;
                            user-select: none;
                            transition: background 0.15s;
                            outline: none;
                        }
                        .lvl-item:hover,
                        .lvl-item:focus-visible {
                            background: rgba(255,255,255,0.07);
                        }
                        .lvl-item.selected {
                            border: 1px solid var(--lvl-border, rgba(255,255,255,0.2));
                        }
                        /* Scrollbar fine webkit */
                        .lvl-dropdown::-webkit-scrollbar { width: 4px; }
                        .lvl-dropdown::-webkit-scrollbar-track { background: transparent; }
                        .lvl-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
                        @keyframes lvlFadeIn {
                            from { opacity: 0; transform: translateY(-6px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    <div
                        className="lvl-dropdown"
                        style={{ animation: 'lvlFadeIn 0.15s ease' }}
                    >
                        {GROUPES.map((groupe) => (
                            <div key={groupe.label}>
                                {/* En-tête de groupe */}
                                <div style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    padding: '8px 10px 4px',
                                }}>
                                    {groupe.label}
                                </div>

                                {groupe.niveaux.map((niveauId) => {
                                    const info = getNiveauInfo(niveauId);
                                    const colors = NIVEAU_COLORS[niveauId];
                                    const isSel = selectedLevel === niveauId;

                                    return (
                                        <button
                                            key={niveauId}
                                            role="option"
                                            aria-selected={isSel}
                                            className={`lvl-item${isSel ? ' selected' : ''}`}
                                            onClick={() => handleSelect(niveauId)}
                                            onTouchEnd={(e) => {
                                                e.preventDefault();
                                                handleSelect(niveauId);
                                            }}
                                            style={{
                                                /* --lvl-border pour CSS var dans .selected */
                                                ['--lvl-border' as string]: `${colors.border}50`,
                                                background: isSel ? colors.bg : undefined,
                                            }}
                                        >
                                            {/* Dot couleur niveau */}
                                            <span style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: colors.dot, flexShrink: 0,
                                                display: 'inline-block',
                                            }} />

                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                <div style={{
                                                    fontSize: 13,
                                                    fontWeight: isSel ? 700 : 500,
                                                    color: isSel ? colors.text : '#e2e8f0',
                                                    lineHeight: 1.3,
                                                }}>
                                                    {info.label}
                                                </div>
                                                <div style={{
                                                    fontSize: 10,
                                                    color: '#64748b',
                                                    marginTop: 2,
                                                }}>
                                                    {info.horaire} · {info.bo.split(' ').slice(0, 3).join(' ')}
                                                </div>
                                            </div>

                                            {/* Coche si sélectionné */}
                                            {isSel && (
                                                <svg
                                                    aria-hidden="true"
                                                    style={{ width: 14, height: 14, flexShrink: 0, color: colors.text }}
                                                    viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" strokeWidth={3}
                                                    strokeLinecap="round" strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Lien programme officiel */}
                        {selectedInfo && (
                            <div style={{
                                marginTop: 10,
                                paddingTop: 10,
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <a
                                    href={selectedInfo.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 11,
                                        color: '#64748b',
                                        textDecoration: 'none',
                                        padding: '8px 8px',
                                        borderRadius: 8,
                                        minHeight: 36,
                                        WebkitTapHighlightColor: 'transparent',
                                    }}
                                >
                                    <svg style={{ width: 12, height: 12, flexShrink: 0 }}
                                        viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth={2}
                                    >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    Programme Eduscol — {selectedInfo.bo}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
