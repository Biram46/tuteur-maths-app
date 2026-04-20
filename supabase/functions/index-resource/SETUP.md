# Setup — Edge Function index-resource

## 1. Déployer la Edge Function

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref <TON_PROJECT_REF>

# Déployer
supabase functions deploy index-resource --no-verify-jwt
```

## 2. Configurer les secrets de la fonction

Dans Supabase Dashboard → Settings → Edge Functions → Secrets, ajouter :

| Clé | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | ta clé Anthropic |
| `OPENAI_API_KEY` | ta clé OpenAI |
| `WEBHOOK_SECRET` | un token aléatoire (ex: `openssl rand -hex 32`) |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

## 3. Créer le Database Webhook

Dans Supabase Dashboard → Database → Webhooks → Create a new hook :

- **Name** : `index-resource-on-change`
- **Table** : `public.resources`
- **Events** : `INSERT`, `UPDATE`, `DELETE`
- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://<TON_PROJECT_REF>.supabase.co/functions/v1/index-resource`
- **Headers** :
  - `Content-Type: application/json`
  - `Authorization: Bearer <WEBHOOK_SECRET>` (le même token qu'à l'étape 2)

## 4. Exécuter la migration SQL

Dans Supabase Dashboard → SQL Editor :

```sql
-- Coller le contenu de 20260420300000_rag_resource_index.sql
```

## 5. Ré-indexer les ressources existantes (optionnel)

Pour indexer toutes les ressources déjà publiées, exécuter ce SQL dans Supabase :

```sql
-- Déclencher un UPDATE factice pour chaque ressource publiée avec PDF
-- (cela activera le webhook pour chacune)
UPDATE resources
SET updated_at = now()
WHERE status = 'published' AND pdf_url IS NOT NULL;
```

Si la table n'a pas de colonne `updated_at`, utiliser :
```sql
UPDATE resources SET status = 'published' WHERE status = 'published' AND pdf_url IS NOT NULL;
```

## Vérification

- Dans Supabase Dashboard → Edge Functions → Logs : vérifier les logs de `index-resource`
- Dans Table Editor → `rag_documents` : les chunks apparaissent avec `metadata->>'source' = 'resource'`
