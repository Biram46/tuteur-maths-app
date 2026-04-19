-- ═══════════════════════════════════════════════════════════════
-- Migration : Correction des policies RLS
--
-- Problèmes corrigés :
--   1. eam_sujets — policy write utilisait auth.jwt()->>'role'
--      mais le rôle est dans app_metadata → jamais vrai
--   2. rag_documents — policies write manquantes (INSERT/UPDATE/DELETE)
-- ═══════════════════════════════════════════════════════════════

-- ─── eam_sujets ──────────────────────────────────────────────

-- Supprimer l'ancienne policy write cassée
DROP POLICY IF EXISTS "Écriture admin des sujets EAM" ON eam_sujets;

-- Recréer avec le bon chemin JWT (rôle dans app_metadata)
CREATE POLICY "Admin write eam_sujets"
    ON eam_sujets FOR ALL
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    )
    WITH CHECK (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    );

-- ─── rag_documents ───────────────────────────────────────────

-- INSERT : service_role uniquement (bypass RLS) + admins connectés
CREATE POLICY "Admin insert rag_documents"
    ON rag_documents FOR INSERT
    WITH CHECK (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    );

-- UPDATE
CREATE POLICY "Admin update rag_documents"
    ON rag_documents FOR UPDATE
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    )
    WITH CHECK (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    );

-- DELETE
CREATE POLICY "Admin delete rag_documents"
    ON rag_documents FOR DELETE
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin'
    );
