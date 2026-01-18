# 📤 Guide d'Upload de Fichiers - Supabase Storage

## 🎯 Vue d'ensemble

Votre application dispose maintenant d'un **système complet d'upload de fichiers** vers Supabase Storage. Les administrateurs peuvent uploader des ressources (PDF, DOCX, LaTeX, HTML) directement depuis l'interface admin.

---

## ✅ Configuration

### Étape 1 : Bucket Supabase créé

Vous avez déjà créé le bucket `ressources-cours` dans Supabase Storage. ✅

### Étape 2 : Variable d'environnement

Le fichier `.env.local` contient déjà :
```bash
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=ressources-cours
```

### Status : ✅ Configuration complète

---

## 🏗️ Architecture de l'upload

### Flux de données

```
Utilisateur (Admin)
    ↓
[Interface Admin] - Sélectionne un fichier
    ↓
[FormData] - Envoie vers Server Action
    ↓
[uploadResourceWithFile] - Server Action
    ↓
[Supabase Storage] - Upload du fichier
    ↓
[URL publique générée]
    ↓
[Base de données] - Enregistrement de la ressource
    ↓
[Redirection] - Retour à /admin
```

### Composants clés

1. **Formulaire d'upload** (`app/admin/page.tsx`)
   - Sélection du chapitre
   - Choix du type de ressource
   - Upload du fichier

2. **Server Action** (`app/admin/actions.ts`)
   - Fonction `uploadResourceWithFile`
   - Upload vers Supabase Storage
   - Création de la ressource en DB

3. **Supabase Storage**
   - Bucket : `ressources-cours`
   - Dossier : `resources/`
   - Nom de fichier : `{timestamp}-{nom_original}`

---

## 📝 Utilisation

### Depuis l'interface Admin

1. **Accédez à la page admin** : http://localhost:3000/admin

2. **Scrollez jusqu'à la section "Ressources du chapitre"**

3. **Trouvez le formulaire "📤 Uploader un fichier et créer la ressource"**

4. **Remplissez le formulaire** :
   - Sélectionnez le **chapitre** concerné
   - Choisissez le **type de ressource** :
     - Cours (PDF)
     - Cours (DOCX)
     - Cours (LaTeX)
     - Interactif (HTML)
   - **Sélectionnez le fichier** sur votre ordinateur

5. **Cliquez sur "📤 Uploader et créer la ressource"**

6. **Attendez la redirection** vers `/admin`

7. **Vérifiez** dans le tableau que la ressource apparaît avec son URL

---

## 🔧 Détails techniques

### Types de ressources supportés

| Type | Column DB | Extension recommandée |
|------|-----------|----------------------|
| `cours-pdf` | `pdf_url` | .pdf |
| `cours-docx` | `docx_url` | .docx |
| `cours-latex` | `latex_url` | .tex |
| `interactif` | `html_url` | .html |

### Naming des fichiers

Format automatique : `{timestamp}-{nom_original}`

Exemple :
```
1737149876543-cours-derivees.pdf
1737149912789-exercices-polynomes.docx
```

### Structure dans le bucket

```
ressources-cours/
└── resources/
    ├── 1737149876543-cours-derivees.pdf
    ├── 1737149912789-exercices-polynomes.docx
    ├── 1737149945123-interactif-limites.html
    └── ...
```

### URL publique générée

Format :
```
https://{project}.supabase.co/storage/v1/object/public/ressources-cours/resources/{timestamp}-{filename}
```

Exemple :
```
https://yhicloevjgwpvlmzoifx.supabase.co/storage/v1/object/public/ressources-cours/resources/1737149876543-cours-derivees.pdf
```

---

## 💻 Code Server Action

```typescript
export async function uploadResourceWithFile(formData: FormData) {
    const chapterId = formData.get("chapter_id") as string;
    const kind = (formData.get("kind") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!chapterId || !kind || !file) {
        throw new Error("Chapitre, type et fichier sont obligatoires.");
    }

    // Nom de fichier unique
    const filePath = `resources/${Date.now()}-${file.name}`;

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } =
        await supabaseServer.storage.from(bucketName).upload(filePath, file);

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    // Récupération de l'URL publique
    const { data: { publicUrl } } = 
        supabaseServer.storage.from(bucketName).getPublicUrl(filePath);

    // Attribution de l'URL à la bonne colonne
    let pdf_url = null, docx_url = null, latex_url = null, html_url = null;
    
    if (kind === "cours-pdf") pdf_url = publicUrl;
    else if (kind === "cours-docx") docx_url = publicUrl;
    else if (kind === "cours-latex") latex_url = publicUrl;
    else if (kind === "interactif") html_url = publicUrl;

    // Insertion en base de données
    const { error: insertError } = await supabaseServer
        .from("resources")
        .insert([{
            chapter_id: chapterId,
            kind,
            pdf_url,
            docx_url,
            latex_url,
            html_url,
        }]);

    if (insertError) {
        throw new Error(insertError.message);
    }

    redirect("/admin");
}
```

---

## 🛡️ Sécurité

### Validations actuelles

✅ **Validation des champs obligatoires**
- Chapitre requis
- Type requis
- Fichier requis

✅ **Server-side uniquement**
- Upload géré côté serveur
- Utilisation de la clé service-role

✅ **Noms de fichiers uniques**
- Timestamp pour éviter les collisions

### Améliorations recommandées

⚠️ **À ajouter** :

1. **Validation du type MIME**
   ```typescript
   const allowedTypes = ['application/pdf', 'application/msword', 'text/html'];
   if (!allowedTypes.includes(file.type)) {
       throw new Error("Type de fichier non autorisé");
   }
   ```

2. **Limite de taille de fichier**
   ```typescript
   const maxSize = 10 * 1024 * 1024; // 10 MB
   if (file.size > maxSize) {
       throw new Error("Fichier trop volumineux (max 10 MB)");
   }
   ```

3. **Sanitization du nom de fichier**
   ```typescript
   const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
   const filePath = `resources/${Date.now()}-${safeName}`;
   ```

4. **Authentification admin**
   ```typescript
   const session = await getServerSession();
   if (!session || !session.user.isAdmin) {
       throw new Error("Accès non autorisé");
   }
   ```

---

## 🔍 Gestion des erreurs

### Erreurs possibles

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Chapitre, type et fichier sont obligatoires" | Champ manquant | Remplir tous les champs |
| Upload error: "Payload too large" | Fichier trop grand | Réduire la taille |
| Upload error: "Invalid bucket" | Bucket inexistant | Vérifier la config |
| Insert error: "Foreign key violation" | Chapitre invalide | Vérifier que le chapitre existe |

### Debugging

Pour debugger les erreurs d'upload :

1. **Vérifiez les logs serveur** dans la console
2. **Vérifiez le bucket Supabase** dans le dashboard
3. **Vérifiez les permissions** du bucket (public/privé)

---

## 📊 Monitoring

### Dans Supabase Dashboard

1. **Storage** → `ressources-cours`
   - Voir tous les fichiers uploadés
   - Taille totale utilisée
   - Télécharger/supprimer des fichiers

2. **Database** → `resources` table
   - Voir toutes les ressources créées
   - Vérifier les URLs
   - Modifier/supprimer des entrées

---

## 🚀 Améliorations futures

### Court terme

1. **Indicateur de progression**
   ```tsx
   // Afficher une barre de progression pendant l'upload
   <progress value={uploadProgress} max="100" />
   ```

2. **Preview avant upload**
   ```tsx
   // Afficher un aperçu du fichier sélectionné
   {selectedFile && (
       <p>Fichier : {selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
   )}
   ```

3. **Messages de confirmation**
   ```tsx
   // Toast notification après upload réussi
   toast.success("Ressource uploadée avec succès !");
   ```

### Moyen terme

4. **Upload multiple**
   ```tsx
   <input type="file" name="files" multiple />
   ```

5. **Drag & Drop**
   ```tsx
   <DropZone onDrop={handleDrop} />
   ```

6. **Suppression de fichiers**
   ```typescript
   export async function deleteResource(resourceId: string) {
       // Supprimer le fichier du storage
       // Supprimer l'entrée de la DB
   }
   ```

### Long terme

7. **Compression automatique**
   - Compresser les PDF avant upload
   - Optimiser les images

8. **Conversion de formats**
   - Convertir DOCX en PDF automatiquement
   - Générer des thumbnails

9. **Versioning**
   - Garder l'historique des fichiers
   - Permettre de restaurer une version

---

## 📚 Exemples d'utilisation

### Uploader un cours en PDF

1. Créez d'abord un niveau (ex: "Terminale")
2. Créez un chapitre (ex: "Les dérivées")
3. Allez dans la section Upload
4. Sélectionnez le chapitre "Les dérivées"
5. Choisissez "Cours (PDF)"
6. Sélectionnez votre fichier `cours-derivees.pdf`
7. Cliquez sur "Uploader"

**Résultat** : Une nouvelle ressource avec l'URL du PDF

### Uploader un exercice interactif HTML

1. Sélectionnez le chapitre concerné
2. Choisissez "Interactif (HTML)"
3. Sélectionnez votre fichier `exercices-limites.html`
4. Cliquez sur "Uploader"

**Résultat** : L'URL sera dans la colonne `html_url`

---

## 🧪 Tests

### Test manuel

1. **Démarrez le serveur** : `npm run dev`
2. **Allez sur** : http://localhost:3000/admin
3. **Uploadez un fichier de test**
4. **Vérifiez dans Supabase Dashboard** :
   - Storage → fichier présent
   - Database → ressource créée
5. **Testez l'URL publique** dans le navigateur

### Test avec curl

```bash
curl -X POST http://localhost:3000/admin \
  -F "chapter_id=uuid-du-chapitre" \
  -F "kind=cours-pdf" \
  -F "file=@/path/to/file.pdf"
```

---

## 🐛 Problèmes connus

### Bucket non public

**Symptôme** : L'URL retourne 404

**Solution** :
1. Supabase Dashboard → Storage
2. Cliquez sur `ressources-cours`
3. Settings → Make bucket public

### Fichier trop grand

**Symptôme** : Erreur "Payload too large"

**Solution** : Augmenter la limite dans Supabase ou compresser le fichier

---

## 📖 Documentation Supabase

- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Upload Files](https://supabase.com/docs/guides/storage/uploads)
- [Public Buckets](https://supabase.com/docs/guides/storage/security/access-control)

---

## ✅ Checklist

Avant de déployer en production :

- [ ] Bucket `ressources-cours` créé et public
- [ ] Variable `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` configurée
- [ ] Permissions du bucket vérifiées
- [ ] Validation des types de fichiers ajoutée
- [ ] Limite de taille implémentée
- [ ] Authentification admin activée
- [ ] Tests d'upload effectués
- [ ] Gestion des erreurs testée

---

**Status actuel** : ✅ Fonctionnalité opérationnelle !

L'upload de fichiers vers Supabase Storage est maintenant **complètement fonctionnel** dans votre application !

---

*Guide créé le : 2026-01-17*  
*Version : 1.0.0*
