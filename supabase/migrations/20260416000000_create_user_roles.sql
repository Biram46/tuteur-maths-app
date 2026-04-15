-- ═══════════════════════════════════════════════════════════════
-- Migration : Rôles utilisateurs (admin, teacher, student)
-- Quand un rôle est modifié dans user_roles, le claim JWT est
-- automatiquement mis à jour via le trigger ci-dessous.
-- ═══════════════════════════════════════════════════════════════

-- 1. Table des rôles
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'teacher', 'admin')),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Tout utilisateur peut lire son propre rôle
CREATE POLICY "Users can read own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Fonction qui sync le rôle vers auth.users.app_metadata
--    → le claim 'role' est disponible dans le JWT sans requête supplémentaire
CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data =
        raw_app_meta_data || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger : à chaque INSERT ou UPDATE dans user_roles
DROP TRIGGER IF EXISTS on_role_change ON public.user_roles;
CREATE TRIGGER on_role_change
    AFTER INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_metadata();

-- 6. Insérer l'admin existant (biram26@yahoo.fr)
--    Remplacer l'UUID ci-dessous par le vrai user_id de l'admin
--    → SELECT id FROM auth.users WHERE email = 'biram26@yahoo.fr';
-- INSERT INTO public.user_roles (user_id, role) VALUES ('UUID_ADMIN_ICI', 'admin');
