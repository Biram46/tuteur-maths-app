-- Table pour le rate limiting API distribué (partagé entre instances Vercel)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,   -- user_id ou "ip:endpoint"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_rate_limits_identifier_created
  ON api_rate_limits(identifier, created_at DESC);

-- RPC atomique : compte + insère en une seule transaction
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_identifier TEXT,
  p_max_requests INT,
  p_window_ms BIGINT
) RETURNS TABLE(allowed BOOLEAN, remaining INT) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_window_start := NOW() - (p_window_ms * INTERVAL '1 millisecond');

  SELECT COUNT(*) INTO v_count
    FROM api_rate_limits
    WHERE identifier = p_identifier AND created_at > v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN QUERY SELECT FALSE, 0;
  ELSE
    INSERT INTO api_rate_limits(identifier) VALUES(p_identifier);
    -- Nettoyage des entrées > 1h pour éviter la croissance infinie
    DELETE FROM api_rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
    RETURN QUERY SELECT TRUE, (p_max_requests - v_count - 1)::INT;
  END IF;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
-- Seul le service role peut lire/écrire (pas d'accès élève direct)
