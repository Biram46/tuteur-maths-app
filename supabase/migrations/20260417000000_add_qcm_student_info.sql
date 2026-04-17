-- Ajouter les colonnes prénom et classe aux résultats QCM
ALTER TABLE qcm_results ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE qcm_results ADD COLUMN IF NOT EXISTS student_class TEXT;
