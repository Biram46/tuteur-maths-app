-- ═══════════════════════════════════════════════════════════════════
-- Migration : Restreindre rag_documents aux utilisateurs authentifiés
--
-- Contexte : la policy "Public read access" permettait à n'importe qui
-- avec l'anon key de lire tous les chunks du programme (scraping facile).
-- On exige maintenant auth.uid() IS NOT NULL pour SELECT.
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer l'ancienne policy ouverte
DROP POLICY IF EXISTS "Public read access for rag_documents" ON rag_documents;

-- Remplacer par : lecture réservée aux utilisateurs connectés
CREATE POLICY "rag_documents: lecture authentifiée"
ON rag_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

-- La fonction match_documents() est appelée via service_role côté serveur
-- → pas affectée par cette policy (service_role bypass RLS)
