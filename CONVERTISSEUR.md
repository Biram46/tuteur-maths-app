# 🔄 Module de Conversion de Fichiers

## Vue d'ensemble

Le module de conversion permet aux professeurs de convertir facilement des fichiers entre différents formats pédagogiques :
- **LaTeX (.tex)** → PDF
- **LaTeX (.tex)** → DOCX (Word)
- **DOCX** → LaTeX (.tex)
- **PDF** → autres formats (via conversions en chaîne)

## 📍 Accès

Le convertisseur est accessible depuis l'interface admin :
1. Connectez-vous en tant que professeur/admin
2. Allez dans l'espace **Admin**
3. Cliquez sur l'onglet **🔄 Convertisseur**

## ✨ Fonctionnalités

### Conversion LaTeX → PDF ✅
**Statut** : Fonctionnel avec Pandoc + pdflatex

Utilise **Pandoc** (installé localement) pour compiler vos fichiers `.tex` en PDF de manière fiable.

**Prérequis** :
1. **Pandoc** doit être installé
2. **pdflatex** (inclus dans MiKTeX ou TeX Live) doit être disponible

**Installation rapide** :
```powershell
# Windows
winget install --id JohnMacFarlane.Pandoc
winget install --id MiKTeX.MiKTeX
```

**Redémarrez votre terminal/serveur** après installation.

**Comment utiliser** :
1. Glissez-déposez votre fichier `.tex`
2. Sélectionnez "PDF" comme format de sortie
3. Cliquez sur "Convertir"
4. Le PDF sera téléchargé automatiquement

**Exemple de cas d'usage** :
- Convertir vos cours LaTeX en PDF pour distribution aux étudiants
- Générer rapidement des PDFs à partir de vos exercices

### Conversion LaTeX → DOCX ✅
**Statut** : Fonctionnel avec Pandoc

Cette conversion utilise Pandoc pour transformer vos documents LaTeX en fichiers Word modifiables.

**Prérequis** : Pandoc installé (voir ci-dessus)

### Conversion DOCX → LaTeX ✅
**Statut** : Fonctionnel avec Pandoc

Convertit vos documents Word en LaTeX pour une édition mathématique avancée.

## 🛠 Installation de Pandoc (Local)

Pour utiliser le convertisseur en local avec toutes les fonctionnalités :

### Windows
```powershell
winget install --id JohnMacFarlane.Pandoc
```

### macOS
```bash
brew install pandoc
```

### Linux
```bash
sudo apt-get install pandoc
```

**Après installation**, redémarrez votre terminal pour que Pandoc soit disponible.

## 🚀 Utilisation Technique

### API Endpoint

Le module expose une route API : `/api/convert`

**Requête** :
```javascript
const formData = new FormData();
formData.append('file', fichier);
formData.append('targetFormat', 'pdf'); // ou 'docx', 'tex'

const response = await fetch('/api/convert', {
    method: 'POST',
    body: formData,
});
```

**Réponse** :
- En cas de succès : Fichier binaire (PDF/DOCX) avec headers de téléchargement
- En cas d'erreur : JSON avec message d'erreur

### Conversions Supportées

| Source | Cible | Statut | Service utilisé |
|--------|-------|--------|-----------------|
| .tex | .pdf | ✅ Actif | LaTeX Online |
| .tex | .docx | ⚠️ Config | CloudConvert/Pandoc |
| .docx | .tex | ⚠️ Config | CloudConvert/Pandoc |
| .pdf | .tex | ❌ Non supporté | - |

## 🎨 Interface Utilisateur

L'interface du convertisseur comprend :
- **Zone de glisser-déposer** pour l'upload de fichiers
- **Sélecteur de format** de sortie
- **Bouton de conversion** avec indicateur de progression
- **Affichage d'erreurs** détaillé en cas de problème
- **Guide d'utilisation** intégré

## 🔧 Dépannage

### "Pandoc not found"
**Solution** : Installez Pandoc (voir section Installation ci-dessus)

### "LaTeX compilation failed"
**Causes possibles** :
- Erreurs de syntaxe dans votre fichier LaTeX
- Packages manquants
- Format de fichier invalide

**Solution** : Vérifiez que votre fichier `.tex` compile localement avant de le convertir

### "Conversion non supportée"
**Solution** : Vérifiez le tableau des conversions supportées ci-dessus

## 📝 Exemple de Workflow

### Workflow typique pour un professeur :

1. **Créer un cours en LaTeX**
   ```latex
   \documentclass{article}
   \begin{document}
   \section{Nombres Complexes}
   ...
   \end{document}
   ```

2. **Convertir en PDF** pour distribution
   - Upload du `.tex` dans le convertisseur
   - Sélection "PDF"
   - Téléchargement du résultat

3. **Convertir en DOCX** (optionnel) pour modification collaborative
   - Même fichier `.tex`
   - Sélection "DOCX"
   - Partage du fichier Word avec collègues

4. **Upload dans Resources**
   - Utilisez l'onglet "Ressources" pour uploader les fichiers convertis
   - Associez-les aux chapitres appropriés

## 🌐 Déploiement Production

### Sur Vercel

Le convertisseur LaTeX → PDF fonctionne immédiatement sur Vercel car il utilise une API externe.

Pour activer les conversions DOCX/LaTeX :
1. Configurez CloudConvert API
2. Ajoutez les variables d'environnement dans Vercel
3. Redéployez l'application

## 🤝 Contribution

Pour ajouter de nouveaux formats de conversion, modifiez :
- `/app/api/convert/route.ts` : Logique de conversion
- `/app/admin/AdminDashboard.tsx` : Interface utilisateur

## 📚 Ressources

- [LaTeX Online API](https://latexonline.cc/)
- [CloudConvert Documentation](https://cloudconvert.com/api/v2)
- [Pandoc Manual](https://pandoc.org/MANUAL.html)

## ⚡ Limites

- **Taille de fichier** : Maximum 50MB
- **LaTeX Online** : Limite de requêtes par IP (gratuit)
- **CloudConvert** : Plan gratuit limité à 25 conversions/jour

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2026-02-04
