"""
Script Python déterministe pour tableaux de signes — Intégration chat
=====================================================================
Envoie le @@@table directement au chat via /api/python-table.
Le chat affiche automatiquement le tableau + explication IA en quelques secondes.

Usage : python sign_table.py "expression" "question"
Exemple: python sign_table.py "(x**2 - 4) / (x - 1)" "Étudier le signe de f(x)=(x²-4)/(x-1)"
"""

import sympy as sp
import requests
import sys

# ─── Configuration ─────────────────────────────────────────────
# URL de votre app Next.js (modifiez si nécessaire)
APP_URL = "http://localhost:3000"


def generer_tableau_lycee(expression_str: str, question: str = None) -> dict:
    """
    Génère un tableau de signes déterministe avec SymPy.
    Retourne un dict avec { aaaBlock, question } prêt à envoyer au chat.
    """
    x = sp.symbols('x', real=True)
    f = sp.sympify(expression_str)

    # 1. Analyse et Factorisation
    num, den = sp.fraction(f.factor())
    facteurs_num = sp.Mul.make_args(num)
    facteurs_den = sp.Mul.make_args(den)
    # Filtrer les constantes numériques
    tous_facteurs = [fac for fac in facteurs_num + facteurs_den if not fac.is_number]

    val_annulation = sorted(sp.solve(num, x))
    val_interdites = sorted(sp.solve(den, x))
    points_critiques = sorted(list(set(map(float, val_annulation + val_interdites))))

    # 2. Points de test (milieux des intervalles)
    points_test = []
    if points_critiques:
        points_test.append(points_critiques[0] - 1)
        for i in range(len(points_critiques) - 1):
            points_test.append((points_critiques[i] + points_critiques[i + 1]) / 2)
        points_test.append(points_critiques[-1] + 1)
    else:
        points_test = [0]

    # 3. Construction du bloc @@@table
    lignes = []

    # Ligne x
    def fmt(v):
        """Formate une valeur : fraction si rationnel, décimal sinon."""
        sym_v = sp.nsimplify(v, rational=True)
        if sym_v.is_rational:
            p, q = int(sym_v.p), int(sym_v.q)
            return f"{p}/{q}" if q != 1 else str(p)
        return str(round(float(v), 4))

    x_vals = ["-inf"] + [fmt(p) for p in points_critiques] + ["+inf"]
    lignes.append(f"x: {', '.join(x_vals)}")

    # Lignes des facteurs (format 2N-3)
    for fac in tous_facteurs:
        signes = []
        for i, pt in enumerate(points_test):
            val = fac.subs(x, pt)
            signes.append("+" if val > 0 else "-")
            if i < len(points_critiques):
                crit = points_critiques[i]
                val_crit = fac.subs(x, crit)
                signes.append("0" if val_crit == 0 else ("+" if val_crit > 0 else "-"))
        label = str(fac).replace("**", "^").replace("*", "")
        lignes.append(f"sign: {label} : {', '.join(signes)}")

    # Ligne f(x) (format 2N-3)
    signes_f = []
    for i, pt in enumerate(points_test):
        val_f = f.subs(x, pt)
        signes_f.append("+" if val_f > 0 else "-")
        if i < len(points_critiques):
            crit = points_critiques[i]
            crit_exact = sp.nsimplify(crit, rational=True)
            is_interdit = any(abs(float(vi) - float(crit)) < 1e-9 for vi in val_interdites)
            signes_f.append("||" if is_interdit else "0")
    lignes.append(f"sign: f(x) : {', '.join(signes_f)}")

    # Construction du bloc @@@
    aaa_lines = ["@@@", "table"]
    for ligne in lignes:
        aaa_lines.append(f"{ligne}")
    aaa_lines.append("@@@")

    # Séparateurs | entre les lignes (format attendu par le parseur)
    inner = " |\n".join(aaa_lines[1:-1])
    aaa_block = f"@@@\n{inner} |\n@@@"

    if question is None:
        question = f"Étudier le signe de f(x) = {expression_str}"

    return {"aaaBlock": aaa_block, "question": question}


def envoyer_au_chat(aaa_block: str, question: str) -> bool:
    """Envoie le @@@table au chat via l'API."""
    try:
        res = requests.post(
            f"{APP_URL}/api/python-table",
            json={"aaaBlock": aaa_block, "question": question},
            timeout=5,
        )
        data = res.json()
        if data.get("success"):
            print(f"✅ Tableau envoyé au chat ! (token={data.get('token')})")
            print(f"   → Le chat va afficher le tableau dans ~3 secondes.")
            return True
        else:
            print(f"❌ Erreur API: {data.get('error')}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Impossible de se connecter à {APP_URL}. L'app tourne-t-elle ?")
        print("   → Affichage local du bloc @@@table :")
        print(aaa_block)
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python sign_table.py \"expression\" [\"question\"]")
        print("Ex:    python sign_table.py \"(x**2 - 4) / (x - 1)\"")
        sys.exit(1)

    expression_str = sys.argv[1]
    question = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"🔢 Calcul de f(x) = {expression_str}...")

    result = generer_tableau_lycee(expression_str, question)

    print("\n--- Bloc @@@table généré ---")
    print(result["aaaBlock"])
    print("----------------------------\n")

    envoyer_au_chat(result["aaaBlock"], result["question"])


if __name__ == "__main__":
    # Test direct si pas d'arguments
    if len(sys.argv) == 1:
        result = generer_tableau_lycee("(x**2 - 4) / (x - 1)",
                                       "Étudier le signe de f(x) = (x²-4)/(x-1)")
        print(result["aaaBlock"])
        envoyer_au_chat(result["aaaBlock"], result["question"])
    else:
        main()
