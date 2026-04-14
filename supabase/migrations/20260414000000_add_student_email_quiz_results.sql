-- Ajouter la colonne student_email à la table quiz_results
ALTER TABLE quiz_results
ADD COLUMN IF NOT EXISTS student_email TEXT DEFAULT NULL;
