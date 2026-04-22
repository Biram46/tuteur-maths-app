-- ═══════════════════════════════════════════════════════════════════════
-- Migration : Activation RLS sur toutes les tables non protégées
--
-- Contexte : alerte sécurité Supabase du 19 avril 2026
-- Tables concernées : quiz_results, qcm_results, chapters, levels,
--   resources, sequences, prof_chat_sessions, admin_trusted_devices
--
-- Note : supabaseServer utilise service_role → bypass RLS automatique
--   Ces policies ne cassent rien côté serveur.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- quiz_results
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Les élèves voient uniquement leurs propres résultats
CREATE POLICY "quiz_results: lecture propre"
    ON quiz_results FOR SELECT
    USING (auth.uid() IS NOT NULL AND student_email = auth.jwt()->>'email');

-- Les admins voient tout
CREATE POLICY "quiz_results: lecture admin"
    ON quiz_results FOR SELECT
    USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- Tout utilisateur connecté peut soumettre
CREATE POLICY "quiz_results: insertion authentifiée"
    ON quiz_results FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Suppression RGPD : admins uniquement
CREATE POLICY "quiz_results: suppression admin"
    ON quiz_results FOR DELETE
    USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ─────────────────────────────────────────────────────────────────────
-- qcm_results
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE qcm_results ENABLE ROW LEVEL SECURITY;

-- Les admins voient tout
CREATE POLICY "qcm_results: lecture admin"
    ON qcm_results FOR SELECT
    USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- Tout utilisateur connecté peut soumettre son QCM
CREATE POLICY "qcm_results: insertion authentifiée"
    ON qcm_results FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Suppression RGPD : admins uniquement
CREATE POLICY "qcm_results: suppression admin"
    ON qcm_results FOR DELETE
    USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ─────────────────────────────────────────────────────────────────────
-- chapters, levels, resources, sequences  (contenu pédagogique public)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE chapters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- Lecture publique (sitemap, navigation, élèves non connectés)
CREATE POLICY "chapters: lecture publique"  ON chapters  FOR SELECT USING (true);
CREATE POLICY "levels: lecture publique"    ON levels    FOR SELECT USING (true);
CREATE POLICY "resources: lecture publique" ON resources FOR SELECT USING (true);
CREATE POLICY "sequences: lecture publique" ON sequences FOR SELECT USING (true);

-- Écriture : admins uniquement (les opérations via service_role bypasse RLS de toute façon)
CREATE POLICY "chapters: écriture admin"  ON chapters  FOR ALL
    USING  (auth.jwt()->'app_metadata'->>'role' = 'admin')
    WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "levels: écriture admin"    ON levels    FOR ALL
    USING  (auth.jwt()->'app_metadata'->>'role' = 'admin')
    WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "resources: écriture admin" ON resources FOR ALL
    USING  (auth.jwt()->'app_metadata'->>'role' = 'admin')
    WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "sequences: écriture admin" ON sequences FOR ALL
    USING  (auth.jwt()->'app_metadata'->>'role' = 'admin')
    WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ─────────────────────────────────────────────────────────────────────
-- prof_chat_sessions  (accès exclusivement via service_role côté serveur)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE prof_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Chaque prof voit ses propres sessions
-- (accès principal via service_role qui bypass RLS — policies de sécurité publique)
CREATE POLICY "prof_chat_sessions: lecture propre"
    ON prof_chat_sessions FOR SELECT
    USING (auth.uid() IS NOT NULL AND teacher_id::uuid = auth.uid());

CREATE POLICY "prof_chat_sessions: écriture propre"
    ON prof_chat_sessions FOR ALL
    USING  (auth.uid() IS NOT NULL AND teacher_id::uuid = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND teacher_id::uuid = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- admin_trusted_devices  (2FA — accès strictement admin)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE admin_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Seul l'admin connecté voit ses propres appareils de confiance
CREATE POLICY "admin_trusted_devices: lecture admin"
    ON admin_trusted_devices FOR SELECT
    USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "admin_trusted_devices: écriture admin"
    ON admin_trusted_devices FOR ALL
    USING  (auth.jwt()->'app_metadata'->>'role' = 'admin')
    WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');
