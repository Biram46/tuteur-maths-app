-- ============================================
-- NETTOYAGE ET CRÉATION DES TABLES 2FA
-- ============================================
-- Ce script supprime d'abord tout ce qui existe
-- puis recrée proprement toutes les tables
-- ============================================

-- ÉTAPE 1 : NETTOYAGE (suppression de l'existant)
-- ============================================

-- Supprimer les triggers
DROP TRIGGER IF EXISTS trigger_check_max_devices ON admin_trusted_devices;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS check_max_trusted_devices();
DROP FUNCTION IF EXISTS cleanup_expired_2fa_sessions();
DROP FUNCTION IF EXISTS cleanup_expired_devices();

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Service role only" ON admin_2fa_sessions;
DROP POLICY IF EXISTS "Service role only" ON admin_trusted_devices;
DROP POLICY IF EXISTS "Service role only" ON admin_2fa_audit_logs;

-- Supprimer les tables (CASCADE pour supprimer les dépendances)
DROP TABLE IF EXISTS admin_2fa_audit_logs CASCADE;
DROP TABLE IF EXISTS admin_trusted_devices CASCADE;
DROP TABLE IF EXISTS admin_2fa_sessions CASCADE;

-- ============================================
-- ÉTAPE 2 : CRÉATION DES TABLES
-- ============================================

-- Table pour les sessions 2FA (codes temporaires)
CREATE TABLE admin_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_admin_2fa_user ON admin_2fa_sessions(user_id);
CREATE INDEX idx_admin_2fa_code ON admin_2fa_sessions(code);
CREATE INDEX idx_admin_2fa_expires ON admin_2fa_sessions(expires_at);

-- Table pour les appareils de confiance
CREATE TABLE admin_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token VARCHAR(64) UNIQUE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_trusted_devices_user ON admin_trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_token ON admin_trusted_devices(device_token);
CREATE INDEX idx_trusted_devices_expires ON admin_trusted_devices(expires_at);

-- Table pour les logs d'audit 2FA
CREATE TABLE admin_2fa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  device_token VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX idx_2fa_audit_user ON admin_2fa_audit_logs(user_id);
CREATE INDEX idx_2fa_audit_created ON admin_2fa_audit_logs(created_at);
CREATE INDEX idx_2fa_audit_event ON admin_2fa_audit_logs(event_type);

-- ============================================
-- ÉTAPE 3 : FONCTIONS
-- ============================================

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_2fa_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les appareils expirés
CREATE OR REPLACE FUNCTION cleanup_expired_devices()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_trusted_devices
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour limiter le nombre d'appareils de confiance (max 5)
CREATE OR REPLACE FUNCTION check_max_trusted_devices()
RETURNS TRIGGER AS $$
DECLARE
  device_count INT;
BEGIN
  SELECT COUNT(*) INTO device_count
  FROM admin_trusted_devices
  WHERE user_id = NEW.user_id
    AND expires_at > NOW();
  
  IF device_count >= 5 THEN
    RAISE EXCEPTION 'Maximum de 5 appareils de confiance atteint';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 4 : TRIGGERS
-- ============================================

-- Trigger pour vérifier le nombre d'appareils avant insertion
CREATE TRIGGER trigger_check_max_devices
BEFORE INSERT ON admin_trusted_devices
FOR EACH ROW
EXECUTE FUNCTION check_max_trusted_devices();

-- ============================================
-- ÉTAPE 5 : ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE admin_2fa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Seul le service role peut accéder (server-side only)
CREATE POLICY "Service role only" ON admin_2fa_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON admin_trusted_devices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON admin_2fa_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ÉTAPE 6 : COMMENTAIRES
-- ============================================

COMMENT ON TABLE admin_2fa_sessions IS 'Sessions 2FA temporaires avec codes à 6 chiffres';
COMMENT ON TABLE admin_trusted_devices IS 'Appareils de confiance (pas de 2FA pendant 6 mois)';
COMMENT ON TABLE admin_2fa_audit_logs IS 'Logs d''audit pour toutes les actions 2FA';

-- ============================================
-- SUCCÈS !
-- ============================================
-- Si vous voyez ce message, tout s'est bien passé !
-- Vérifiez dans "Table Editor" que les 3 tables existent :
-- - admin_2fa_sessions
-- - admin_trusted_devices
-- - admin_2fa_audit_logs
-- ============================================
