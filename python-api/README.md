# API SymPy — Tableau de signes

API Flask pour le calcul déterministe de tableaux de signes avec SymPy.
Utilisée par l'application Tuteur Maths (Next.js).

## Développement local

```bash
cd python-api
pip install -r requirements.txt
python app.py
```

L'API sera accessible sur `http://localhost:5000`.

## Endpoints

### `GET /health`
Vérifie que l'API est en ligne.

### `POST /sign-table`
Calcule le tableau de signes d'une expression.

**Body JSON :**
```json
{
  "expression": "4*x - 4*x^3",
  "niveau": "terminale_spe"
}
```

**Réponse :**
```json
{
  "success": true,
  "aaaBlock": "@@@\ntable |\nx: -inf, -1, 0, 1, +inf |\nsign: -4 : -, -, -, -, -, -, - |\nsign: x - 1 : ...\nsign: f(x) : +, 0, -, 0, +, 0, - |\n@@@",
  "criticalPoints": [-1.0, 0.0, 1.0],
  "discriminantSteps": [],
  "fxValues": ["+", "0", "-", "0", "+", "0", "-"]
}
```

## Expressions supportées

- Polynômes : `x^2 - 4`, `3*x^3 + 2*x - 1`
- Fonctions rationnelles : `(x-1)/(x+2)`
- Exponentielles : `exp(x) - 1`, `x*exp(x)`
- Logarithmes : `ln(x) - 2`, `x*ln(x)`
- Racines : `sqrt(x) - 1`

## Déploiement sur Render.com (gratuit)

1. Allez sur [render.com](https://render.com) et créez un compte
2. Nouveau → **Web Service**
3. Connectez votre repo GitHub
4. Configurez :
   - **Root Directory :** `python-api`
   - **Runtime :** Python
   - **Build Command :** `pip install -r requirements.txt`
   - **Start Command :** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 30`
5. Déployez !
6. Copiez l'URL (ex: `https://mimimaths-sympy.onrender.com`)
7. Dans le `.env.local` de votre projet Next.js :
   ```
   SYMPY_API_URL=https://mimimaths-sympy.onrender.com
   ```
