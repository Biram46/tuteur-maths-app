# Guide de Configuration de l'Authentification Google

Pour activer la connexion et l'inscription avec Google, vous devez configurer le fournisseur Google dans votre projet Supabase.

## Étape 1 : Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un nouveau projet ou sélectionnez-en un existant.
3. Allez dans **API et services** > **Écran d'accord OAuth**.
   - Choisissez **Externe** (si accessible publiquement).
   - Remplissez les informations de l'application (Nom, Email support, etc.).
   - Sauvegardez.
4. Allez dans **Identifiants** > **Créer des identifiants** > **ID client OAuth**.
   - Type d'application : **Application Web**.
   - Nom : `Tuteur Maths App` (ou autre).
   - **Origines JavaScript autorisées** :
     - `http://localhost:3000` (pour le développement local)
     - `https://votre-projet.vercel.app` (votre URL de production)
   - **URI de redirection autorisés** :
     - Vous devez récupérer l'URL de rappel de votre projet Supabase.
     - Allez sur votre Dashboard Supabase > Authentication > Providers > Google.
     - Copiez l'URL affichée sous "Callback URL (for your OAuth App)" (ex: `https://xyz.supabase.co/auth/v1/callback`).
     - Collez cette URL dans la console Google.
5. Cliquez sur **Créer**.
6. Copiez votre **ID Client** et votre **Code Secret Client**.

## Étape 2 : Dashboard Supabase

1. Allez dans votre projet Supabase.
2. Naviguez vers **Authentication** > **Providers**.
3. Sélectionnez **Google**.
4. Activez "Enable Google".
5. Collez l'**ID Client** et le **Code Secret Client** obtenus à l'étape précédente.
6. Cliquez sur **Save**.

## Étape 3 : Update URLs dans Supabase

1. Allez dans **Authentication** > **URL Configuration**.
2. Assurez-vous que votre **Site URL** est correct (ex: `https://votre-projet.vercel.app`).
3. Ajoutez les **Redirect URLs** suivantes :
   - `http://localhost:3000/auth/callback`
   - `https://votre-projet.vercel.app/auth/callback` (remplacez par votre vrai domaine Vercel)
   - `https://tuteur-maths-app.vercel.app/auth/callback` (si différent)

## C'est tout !

Une fois ces configurations effectuées, le bouton "Continuer avec Google" sur la page de connexion fonctionnera pour l'inscription et la connexion.
