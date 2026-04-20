-- Ajout de student_hash pour conformité RGPD
-- SHA-256 de student_email : permet lookup/suppression sans stocker l'email en clair à terme

ALTER TABLE qcm_results ADD COLUMN IF NOT EXISTS student_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_qcm_results_student_hash ON qcm_results(student_hash);

COMMENT ON COLUMN qcm_results.student_hash IS 'SHA-256 de student_email — lookup et suppression RGPD sans email en clair';
