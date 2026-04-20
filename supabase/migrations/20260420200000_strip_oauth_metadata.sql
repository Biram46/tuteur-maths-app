-- Supprime les données personnelles OAuth (nom, photo) dès l'insertion ou la mise à jour d'un utilisateur.
-- Seul l'email (géré par Supabase Auth) est conservé.

CREATE OR REPLACE FUNCTION auth.strip_oauth_pii()
RETURNS TRIGGER AS $$
BEGIN
  NEW.raw_user_meta_data = NEW.raw_user_meta_data
    - 'full_name'
    - 'name'
    - 'avatar_url'
    - 'picture'
    - 'given_name'
    - 'family_name'
    - 'preferred_username';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS strip_oauth_pii_on_insert ON auth.users;
CREATE TRIGGER strip_oauth_pii_on_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.strip_oauth_pii();

DROP TRIGGER IF EXISTS strip_oauth_pii_on_update ON auth.users;
CREATE TRIGGER strip_oauth_pii_on_update
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.strip_oauth_pii();

-- Nettoyer les lignes existantes
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data
  - 'full_name' - 'name' - 'avatar_url' - 'picture' - 'given_name' - 'family_name' - 'preferred_username';
