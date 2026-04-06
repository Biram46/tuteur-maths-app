/**
 * ESPACE PROFESSEUR — Types
 * ==========================
 * Types partagés pour tout l'espace professeur :
 * séquences, chat sessions, grille de suivi, publication.
 */

// ─────────────────────────────────────────────────────────────
// STATUTS & ENUMS
// ─────────────────────────────────────────────────────────────

export type ResourceStatus = 'draft' | 'published';
export type SequenceStatus = 'draft' | 'partial' | 'published';

export type ProfResourceType =
    | 'cours'
    | 'exercices_1'
    | 'exercices_2'
    | 'exercices_3'
    | 'interactif'
    | 'ds'
    | 'eam';

/** Labels d'affichage pour chaque type de ressource */
export const RESOURCE_TYPE_LABELS: Record<ProfResourceType, string> = {
    cours: '📖 Cours',
    exercices_1: '📝 Feuille N°1',
    exercices_2: '📝 Feuille N°2',
    exercices_3: '📝 Feuille N°3',
    interactif: '🎮 Interactifs',
    ds: '📋 DS',
    eam: '🎓 EAM',
};

/** Descriptions courtes pour chaque type */
export const RESOURCE_TYPE_DESCRIPTIONS: Record<ProfResourceType, string> = {
    cours: 'Cours structuré I) II) III) avec exemples résolus',
    exercices_1: 'Application directe — calqué sur les exemples du cours',
    exercices_2: 'Intermédiaire — exercices complets + problèmes concrets',
    exercices_3: 'Synthèse — exercices transversaux, bilan de chapitre',
    interactif: '20 questions interactives générées par l\'AI',
    ds: 'Devoir Surveillé — format LaTeX officiel',
    eam: 'Épreuve Anticipée — Premières uniquement, 2h, multi-chapitres',
};

/** Classes éligibles aux EAM */
export const EAM_ELIGIBLE_LEVELS = ['premiere_spe', 'premiere_commune', 'premiere_techno'];

// ─────────────────────────────────────────────────────────────
// ENTITIES DB
// ─────────────────────────────────────────────────────────────

export interface Sequence {
    id: string;
    level_id: string;
    chapter_id: string;
    teacher_id: string;
    status: SequenceStatus;
    created_at: string;
    updated_at: string;
}

export interface ProfChatSession {
    id: string;
    teacher_id: string;
    sequence_id: string | null;
    resource_type: ProfResourceType;
    messages: ChatMessageProf[];
    generated_content: string | null;
    generated_latex: string | null;
    status: 'active' | 'completed';
    created_at: string;
    updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// CHAT PROFESSEUR
// ─────────────────────────────────────────────────────────────

export interface ChatMessageProf {
    role: 'user' | 'assistant';
    content: string;
    attachments?: ProfAttachment[];
    timestamp: string;
}

export interface ProfAttachment {
    type: 'image' | 'pdf' | 'tex' | 'docx';
    url: string;
    name: string;
    /** Base64 data pour upload initial (avant stockage) */
    data?: string;
}

// ─────────────────────────────────────────────────────────────
// GRILLE SÉQUENCES (VUE MATRICIELLE)
// ─────────────────────────────────────────────────────────────

/** État d'une cellule dans la grille */
export type CellStatus = 'published' | 'draft' | 'none';

/** Une ligne dans la grille = un chapitre avec l'état de chaque ressource */
export interface SequenceGridRow {
    chapter_id: string;
    chapter_title: string;
    chapter_position: number;
    sequence_id: string | null;
    cours: CellStatus;
    fe1: CellStatus;
    fe2: CellStatus;
    fe3: CellStatus;
    interactif: CellStatus;
    ds: CellStatus;
    eam?: CellStatus; // Premières uniquement
}

/** Colonnes de la grille (pour mapping générique) */
export const GRID_COLUMNS: { key: keyof Omit<SequenceGridRow, 'chapter_id' | 'chapter_title' | 'chapter_position' | 'sequence_id'>; label: string; resourceType: ProfResourceType }[] = [
    { key: 'cours', label: 'Cours', resourceType: 'cours' },
    { key: 'fe1', label: 'FE1', resourceType: 'exercices_1' },
    { key: 'fe2', label: 'FE2', resourceType: 'exercices_2' },
    { key: 'fe3', label: 'FE3', resourceType: 'exercices_3' },
    { key: 'interactif', label: 'Interac', resourceType: 'interactif' },
    { key: 'ds', label: 'DS', resourceType: 'ds' },
];

/** Colonne EAM (ajoutée conditionnellement pour les Premières) */
export const EAM_COLUMN = { key: 'eam' as const, label: 'EAM', resourceType: 'eam' as ProfResourceType };

// ─────────────────────────────────────────────────────────────
// CONTEXTE DE CRÉATION
// ─────────────────────────────────────────────────────────────

/** Contexte sélectionné par le professeur avant de générer */
export interface ProfContext {
    level_id: string;
    level_label: string;
    level_code: string;
    chapter_id: string;
    chapter_title: string;
    resource_type: ProfResourceType;
    sequence_id?: string;
}

/** Payload envoyé à l'API prof-chat */
export interface ProfChatRequest {
    messages: ChatMessageProf[];
    context: ProfContext;
    session_id?: string;
    existing_content?: string; // Pour itération sur un brouillon existant
}

// ─────────────────────────────────────────────────────────────
// RESOURCE ENRICHIE (avec nouveaux champs)
// ─────────────────────────────────────────────────────────────

export interface ResourceEnriched {
    id: string;
    chapter_id: string;
    kind: string;
    pdf_url: string | null;
    docx_url: string | null;
    latex_url: string | null;
    html_url: string | null;
    status: ResourceStatus;
    label: string | null;
    created_by: string | null;
    published_at: string | null;
    sequence_id: string | null;
    created_at: string;
}
