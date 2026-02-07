-- ============================================
-- AUTHENTIFICATION 2FA POUR ADMIN
-- ============================================
-- Date: 2026-02-07
-- Description: Tables pour 2FA par email + appareils de confiance
-- ============================================

-- Table pour les sessions 2FA (codes temporaires)
CREATE TABLE IF NOT EXISTS admin_2fa_sessions (
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
CREATE INDEX IF NOT EXISTS idx_admin_2fa_user ON admin_2fa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_code ON admin_2fa_sessions(code);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_expires ON admin_2fa_sessions(expires_at);

-- Table pour les appareils de confiance
CREATE TABLE IF NOT EXISTS admin_trusted_devices (
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
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON admin_trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON admin_trusted_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON admin_trusted_devices(expires_at);

-- Table pour les logs d'audit 2FA
CREATE TABLE IF NOT EXISTS admin_2fa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'code_sent', 'code_verified', 'code_failed', 'device_added', 'device_revoked'
  device_token VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_2fa_audit_user ON admin_2fa_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_created ON admin_2fa_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_event ON admin_2fa_audit_logs(event_type);

-- Fonction pour nettoyer les sessions expirées (appelée automatiquement)
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

-- Trigger pour vérifier le nombre d'appareils avant insertion
CREATE TRIGGER trigger_check_max_devices
BEFORE INSERT ON admin_trusted_devices
FOR EACH ROW
EXECUTE FUNCTION check_max_trusted_devices();

-- RLS (Row Level Security) - Sécurité au niveau des lignes
ALTER TABLE admin_2fa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Seul le service role peut accéder (server-side only)
CREATE POLICY "Service role only" ON admin_2fa_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON admin_trusted_devices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON admin_2fa_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- INSTRUCTIONS D'INSTALLATION
-- ============================================
-- 1. Allez sur https://supabase.com/dashboard
-- 2. Sélectionnez votre projet
-- 3. Allez dans "SQL Editor"
-- 4. Créez une nouvelle query
-- 5. Copiez-collez ce fichier SQL
-- 6. Exécutez la query
-- 7. Vérifiez que toutes les tables sont créées dans "Table Editor"
-- ============================================

COMMENT ON TABLE admin_2fa_sessions IS 'Sessions 2FA temporaires avec codes à 6 chiffres';
COMMENT ON TABLE admin_trusted_devices IS 'Appareils de confiance (pas de 2FA pendant 6 mois)';
COMMENT ON TABLE admin_2fa_audit_logs IS 'Logs d''audit pour toutes les actions 2FA';
