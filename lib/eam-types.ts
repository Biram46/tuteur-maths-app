/**
 * Types pour les sujets EAM (Épreuve Anticipée de Mathématiques)
 */

export type EAMNiveau = '1ere_specialite' | '1ere_gt' | '1ere_techno';

export interface EAMSujet {
    id: string;
    titre: string;
    description: string | null;
    date_sujet: string; // ISO date
    niveau: EAMNiveau;
    // Fichiers Sujet
    sujet_pdf_url: string | null;
    sujet_latex_url: string | null;
    // Fichiers Corrigé
    corrige_pdf_url: string | null;
    corrige_latex_url: string | null;
    corrige_disponible: boolean;
    // Métadonnées
    created_at: string;
    updated_at: string;
}

export const EAM_NIVEAUX: { value: EAMNiveau; label: string }[] = [
    { value: '1ere_specialite', label: '1ère Spécialité Maths' },
    { value: '1ere_gt', label: '1ère GT (sans spé)' },
    { value: '1ere_techno', label: '1ère Technologique' },
];

/**
 * SQL pour créer la table dans Supabase :
 *
 * CREATE TABLE eam_sujets (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     titre TEXT NOT NULL,
 *     description TEXT,
 *     date_sujet DATE,
 *     niveau TEXT NOT NULL CHECK (niveau IN ('1ere_specialite', '1ere_gt', '1ere_techno')),
 *     sujet_pdf_url TEXT,
 *     sujet_latex_url TEXT,
 *     corrige_pdf_url TEXT,
 *     corrige_latex_url TEXT,
 *     corrige_disponible BOOLEAN DEFAULT false,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Activer RLS
 * ALTER TABLE eam_sujets ENABLE ROW LEVEL SECURITY;
 *
 * -- Politique de lecture publique
 * CREATE POLICY "Lecture publique des sujets EAM" ON eam_sujets
 *     FOR SELECT USING (true);
 *
 * -- Politique d'écriture pour les admins
 * CREATE POLICY "Écriture admin des sujets EAM" ON eam_sujets
 *     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
 *
 * -- Créer un bucket storage pour les fichiers EAM
 * INSERT INTO storage.buckets (id, name, public)
 * VALUES ('eam-files', 'eam-files', true);
 */
