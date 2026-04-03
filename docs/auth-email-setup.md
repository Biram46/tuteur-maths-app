# Configuration Emails Auth (Resend + Supabase)

## Ce qui a déjà été fait
- ✅ Edge Function `send-email` déployée sur Supabase
- ✅ `auth/actions.ts` corrigé (signup redirige vers page "vérifiez votre email")
- ✅ Templates HTML des emails (inscription + reset password) intégrés

## Étapes manuelles à faire dans le Dashboard Supabase

### Étape 1 : Ajouter le secret RESEND_API_KEY

1. Aller sur https://supabase.com/dashboard/project/yhicloevjgwpvlmzoifx/settings/functions
2. Ajouter le secret : `RESEND_API_KEY` = `re_CY5ZFU8a_L7t38pA4CrTHkNzHbAWLchZn`

### Étape 2 : Configurer le Hook "Send Email"

1. Aller sur https://supabase.com/dashboard/project/yhicloevjgwpvlmzoifx/auth/hooks
2. Cliquer "Add new hook"
3. Remplir :
   - **Hook type** : Send Email
   - **URL** : `https://yhicloevjgwpvlmzoifx.supabase.co/functions/v1/send-email`
   - Cliquer "Generate Secret" → copier le secret généré
4. Cliquer "Create"

### Étape 3 : Ajouter le secret du Hook

1. Revenir sur https://supabase.com/dashboard/project/yhicloevjgwpvlmzoifx/settings/functions
2. Ajouter le secret : `SEND_EMAIL_HOOK_SECRET` = `v1,whsec_XXXXX` (le secret généré à l'étape 2)

### Étape 4 (optionnel) : Vérifier que Resend peut envoyer depuis aimaths.app

1. Aller sur https://resend.com/domains
2. Vérifier que `aimaths.app` est un domaine vérifié
