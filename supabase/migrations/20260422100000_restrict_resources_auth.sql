-- ═══════════════════════════════════════════════════════════════════════
-- Migration : Restreindre les ressources aux utilisateurs connectés
--
-- Contexte : avec USING (true), n'importe qui (y compris non connecté)
-- pouvait lister tous les fichiers via l'API Supabase.
-- On exige désormais auth.uid() IS NOT NULL (élève connecté).
-- Le sitemap et les routes serveur utilisent service_role → bypass RLS.
-- ═══════════════════════════════════════════════════════════════════════

-- ── resources ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "resources: lecture publique" ON resources;

CREATE POLICY "resources: lecture authentifiée"
    ON resources FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ── chapters & sequences : lecture authentifiée ──────────────────────
DROP POLICY IF EXISTS "chapters: lecture publique"  ON chapters;
DROP POLICY IF EXISTS "sequences: lecture publique" ON sequences;

CREATE POLICY "chapters: lecture authentifiée"
    ON chapters FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "sequences: lecture authentifiée"
    ON sequences FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ── levels : garder public (nécessaire pour la page d'accueil / SEO) ─
-- La liste des niveaux (Seconde, Première, Terminale) est publique :
-- elle s'affiche sur la landing page avant connexion.
-- (pas de changement)
