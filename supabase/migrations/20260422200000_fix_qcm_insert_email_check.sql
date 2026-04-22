-- ═══════════════════════════════════════════════════════════════════════
-- Migration : Renforcer la politique INSERT de qcm_results
--
-- Problème : la policy précédente vérifie uniquement auth.uid() IS NOT NULL
-- → un élève connecté peut soumettre un QCM sous l'email d'un autre élève.
--
-- Correction : exiger student_email = email du JWT.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "qcm_results: insertion authentifiée" ON qcm_results;

CREATE POLICY "qcm_results: insertion authentifiée"
    ON qcm_results FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND student_email = auth.jwt() ->> 'email'
    );
