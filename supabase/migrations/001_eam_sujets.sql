-- Création de la table eam_sujets
CREATE TABLE IF NOT EXISTS eam_sujets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    description TEXT,
    date_sujet DATE,
    niveau TEXT NOT NULL CHECK (niveau IN ('1ere_specialite', '1ere_gt', '1ere_techno')),
    sujet_pdf_url TEXT,
    sujet_latex_url TEXT,
    corrige_pdf_url TEXT,
    corrige_latex_url TEXT,
    corrige_disponible BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer Row Level Security
ALTER TABLE eam_sujets ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (tout le monde peut lire)
CREATE POLICY "Lecture publique des sujets EAM" ON eam_sujets
    FOR SELECT USING (true);

-- Politique d'écriture pour les admins
CREATE POLICY "Écriture admin des sujets EAM" ON eam_sujets
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Index pour optimiser les requêtes par date
CREATE INDEX IF NOT EXISTS idx_eam_sujets_date ON eam_sujets(date_sujet ASC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eam_sujets_updated_at
    BEFORE UPDATE ON eam_sujets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertion des 5 Bac Blancs
INSERT INTO eam_sujets (titre, description, date_sujet, niveau, sujet_pdf_url, sujet_latex_url, corrige_pdf_url, corrige_latex_url, corrige_disponible) VALUES
('Bac Blanc n°1', 'Sujet complet avec automatismes et problèmes', '2026-03-31', '1ere_specialite', '/eam/sujets/bac_blanc_1_sujet.pdf', '/eam/sujets/bac_blanc_1_sujet.tex', '/eam/sujets/bac_blanc_1_corrige.pdf', '/eam/sujets/bac_blanc_1_corrige.tex', true),
('Bac Blanc n°2', 'Sujet complet avec automatismes et problèmes', '2026-03-31', '1ere_specialite', '/eam/sujets/bac_blanc_2_sujet.pdf', '/eam/sujets/bac_blanc_2_sujet.tex', '/eam/sujets/bac_blanc_2_corrige.pdf', '/eam/sujets/bac_blanc_2_corrige.tex', true),
('Bac Blanc n°3', 'Sujet complet avec automatismes et problèmes', '2026-03-31', '1ere_specialite', '/eam/sujets/bac_blanc_3_sujet.pdf', '/eam/sujets/bac_blanc_3_sujet.tex', '/eam/sujets/bac_blanc_3_corrige.pdf', '/eam/sujets/bac_blanc_3_corrige.tex', true),
('Bac Blanc n°4', 'Sujet complet avec automatismes et problèmes', '2026-03-31', '1ere_specialite', '/eam/sujets/bac_blanc_4_sujet.pdf', '/eam/sujets/bac_blanc_4_sujet.tex', '/eam/sujets/bac_blanc_4_corrige.pdf', '/eam/sujets/bac_blanc_4_corrige.tex', true),
('Bac Blanc n°5', 'Sujet complet avec automatismes et problèmes', '2026-03-31', '1ere_specialite', '/eam/sujets/bac_blanc_5_sujet.pdf', '/eam/sujets/bac_blanc_5_sujet.tex', '/eam/sujets/bac_blanc_5_corrige.pdf', '/eam/sujets/bac_blanc_5_corrige.tex', true);
