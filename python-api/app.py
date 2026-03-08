"""
API SymPy — Tableau de signes déterministe
==========================================
Flask API pour le calcul de tableaux de signes avec SymPy.
Utilisé par l'application Tuteur Maths quand les Edge Functions Supabase
ne peuvent pas charger Pyodide.

Endpoints:
  POST /sign-table  → Calcule le tableau de signes d'une expression
  GET  /health      → Vérifie que l'API est en ligne
"""

import os
import json
import math
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import sympy as sp
from sympy.calculus.util import continuous_domain

app = Flask(__name__)
CORS(app)  # Autoriser les appels cross-origin depuis l'app Next.js

# ─────────────────────────────────────────────────────────────
# VARIABLE SYMBOLIQUE
# ─────────────────────────────────────────────────────────────
x = sp.Symbol('x', real=True)
LOCALS = {
    'x': x, 'e': sp.E, 'pi': sp.pi,
    'log': sp.log, 'ln': sp.log,
    'exp': sp.exp, 'sqrt': sp.sqrt, 'abs': sp.Abs,
}


# ─────────────────────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────────────────────

def sign_at(expr_sym, pt):
    """Évalue le signe d'une expression en un point."""
    try:
        v = float(expr_sym.subs(x, pt).evalf())
        if math.isnan(v) or math.isinf(v):
            return None
        return '+' if v > 1e-10 else ('-' if v < -1e-10 else '0')
    except:
        return None


def fmt(v):
    """Formate un nombre pour l'affichage, avec détection de e et π."""
    try:
        f = float(v.evalf()) if hasattr(v, 'evalf') else float(v)
    except:
        return str(v)

    # Vérifier les constantes mathématiques exactes
    E_VAL = float(sp.E.evalf())
    PI_VAL = float(sp.pi.evalf())

    # Vérifier si c'est un multiple simple de e
    for mult in [1, 2, 3, -1, -2, -3]:
        if abs(f - mult * E_VAL) < 1e-9:
            if mult == 1: return 'e'
            if mult == -1: return '-e'
            return f'{mult}e'

    # Vérifier si c'est un multiple ou fraction simple de π
    for num in [1, 2, 3, 4, -1, -2, -3, -4]:
        for den in [1, 2, 3, 4, 6]:
            val = num * PI_VAL / den
            if abs(f - val) < 1e-9:
                if den == 1:
                    if num == 1: return 'π'
                    if num == -1: return '-π'
                    return f'{num}π'
                else:
                    if num == 1: return f'π/{den}'
                    if num == -1: return f'-π/{den}'
                    return f'{num}π/{den}'

    # Entier ?
    if abs(f - round(f)) < 1e-9:
        return str(int(round(f)))

    # Fraction simple ?
    for d in range(2, 13):
        n = round(f * d)
        if abs(n / d - f) < 1e-9:
            return f'{int(n)}/{d}' if n > 0 else f'-{abs(int(n))}/{d}'

    return str(round(f, 4))


# ─────────────────────────────────────────────────────────────
# EXTRACTION DES FACTEURS TRANSCENDANTS
# ─────────────────────────────────────────────────────────────

def extract_transcendental_factors(expr_sym, role):
    """Extrait les facteurs exp(), ln(), sqrt() d'une expression."""
    factors = []
    atoms = expr_sym.atoms(sp.exp, sp.log, sp.sqrt)
    for atom in atoms:
        try:
            quotient = sp.cancel(expr_sym / atom)
            if atom not in quotient.atoms(sp.exp, sp.log, sp.sqrt):
                if isinstance(atom, sp.exp):
                    inner = atom.args[0]
                    factors.append({
                        'expr': atom,
                        'label': f'exp({inner})',
                        'type': 'exp', 'role': role,
                        'zeros': [], 'delta_steps': None,
                    })
                elif isinstance(atom, sp.log):
                    inner = atom.args[0]
                    one_pt = [p for p in sp.solve(inner - 1, x) if p.is_real]
                    factors.append({
                        'expr': atom,
                        'label': f'ln({inner})',
                        'type': 'ln', 'role': role,
                        'zeros': one_pt, 'delta_steps': None,
                    })
                elif isinstance(atom, sp.sqrt):
                    inner = atom.args[0]
                    z_pts = sorted(
                        [p for p in sp.solve(inner, x) if p.is_real],
                        key=lambda z: float(z.evalf())
                    )
                    factors.append({
                        'expr': atom,
                        'label': f'sqrt({inner})',
                        'type': 'sqrt', 'role': role,
                        'zeros': z_pts, 'delta_steps': None,
                    })
        except:
            pass
    return factors

# ─────────────────────────────────────────────────────────────
# PRETTIFICATION DES LABELS
# ─────────────────────────────────────────────────────────────

def prettify_label(label):
    """Convertit x**2 → x², x**3 → x³, etc. pour l'affichage."""
    import re
    superscripts = {'2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'}
    def replace_power(m):
        exp = m.group(1)
        if exp in superscripts:
            return superscripts[exp]
        return '^' + exp
    result = re.sub(r'\*\*(\d+)', replace_power, str(label))
    result = result.replace('*', '·')
    return result


# ─────────────────────────────────────────────────────────────
# EXTRACTION DES FACTEURS POLYNOMIAUX
# ─────────────────────────────────────────────────────────────

def get_polynomial_factors(poly_expr, role):
    """
    Factorise un polynôme en produit de facteurs de degré ≤ 2.
    
    Approche pédagogique lycée français :
    - On extrait les racines UNE PAR UNE en divisant par (x - r)
    - On S'ARRÊTE dès que le quotient est de degré ≤ 2 (trinôme → discriminant Δ)
    - Exemple : x³ - x = x·(x² - 1) avec Δ calculé pour x² - 1
    - On NE factorise PAS complètement en (x)(x-1)(x+1) car ça saute l'étape Δ
    """
    # Retirer les facteurs transcendants (exp, ln, sqrt) déjà traités séparément
    poly_simplified = poly_expr
    for atom in poly_expr.atoms(sp.exp, sp.log, sp.sqrt):
        try:
            q = sp.cancel(poly_simplified / atom)
            if atom not in q.atoms(sp.exp, sp.log, sp.sqrt):
                poly_simplified = sp.expand(q)
        except:
            pass

    try:
        p = sp.Poly(sp.expand(poly_simplified), x)
    except:
        return [], 1.0

    deg = p.degree()
    if deg == 0:
        const_val = float(poly_simplified.evalf()) if hasattr(poly_simplified, 'evalf') else float(poly_simplified)
        return [], const_val

    # ── Extraire le coefficient dominant ──
    all_coeffs = p.all_coeffs()
    leading = all_coeffs[0]
    const_coeff = float(leading.evalf()) if hasattr(leading, 'evalf') else float(leading)

    # Rendre le polynôme unitaire : P(x) = leading × P_monic(x)
    monic = sp.expand(poly_simplified / leading)

    factors = []
    remaining = monic

    # ── Boucle : diviser par des racines jusqu'à obtenir un quotient de degré ≤ 2 ──
    safety = 0
    while safety < 20:
        safety += 1
        try:
            rem_deg = sp.degree(remaining, x)
        except:
            break

        if rem_deg <= 0:
            # Constante restante → absorber dans const_coeff
            try:
                cv = float(remaining.evalf())
                if abs(cv - 1.0) > 1e-9:
                    const_coeff *= cv
            except:
                pass
            break

        elif rem_deg == 1:
            # ── Facteur linéaire (degré 1) ──
            z = sp.solve(remaining, x)
            factors.append({
                'label': str(sp.expand(remaining)), 'degree': 1,
                'zeros': [z[0]] if z else [], 'role': role, 'delta_steps': None,
            })
            break

        elif rem_deg == 2:
            # ── Trinôme (degré 2) → analyse par discriminant Δ ──
            coeffs_q = sp.Poly(remaining, x).all_coeffs()
            a_q = coeffs_q[0]
            b_q = coeffs_q[1] if len(coeffs_q) > 1 else sp.Integer(0)
            c_q = coeffs_q[2] if len(coeffs_q) > 2 else sp.Integer(0)
            delta_q = sp.expand(b_q**2 - 4 * a_q * c_q)
            ds_q = sp.nsimplify(delta_q, rational=True)
            df_q = float(delta_q.evalf())

            if df_q > 1e-10:
                sd_q = sp.sqrt(delta_q)
                z1_q = sp.nsimplify((-b_q - sd_q) / (2 * a_q))
                z2_q = sp.nsimplify((-b_q + sd_q) / (2 * a_q))
                zeros_q = sorted([z1_q, z2_q], key=lambda z: float(z.evalf()))
                steps_q = [
                    f'$\\Delta = ({sp.latex(b_q)})^2 - 4\\times({sp.latex(a_q)})\\times({sp.latex(c_q)}) = {sp.latex(ds_q)}$',
                    f'$\\Delta > 0$ : $x_1={sp.latex(zeros_q[0])}$, $x_2={sp.latex(zeros_q[1])}$',
                    f'Signe de $a={sp.latex(a_q)}$ : trinôme {"négatif" if float(a_q.evalf()) > 0 else "positif"} entre les racines.',
                ]
            elif abs(df_q) < 1e-10:
                x0_q = sp.nsimplify(-b_q / (2 * a_q))
                zeros_q = [x0_q, x0_q]
                steps_q = [f'$\\Delta=0$, racine double $x_0={sp.latex(x0_q)}$']
            else:
                zeros_q = []
                steps_q = [f'$\\Delta={sp.latex(ds_q)}<0$ : pas de racine réelle.']

            factors.append({
                'label': str(sp.expand(remaining)), 'degree': 2,
                'zeros': zeros_q, 'role': role, 'delta_steps': steps_q,
            })
            break

        else:
            # ── Degré ≥ 3 : extraire UNE racine réelle, diviser ──
            # Trier par "simplicité" : 0 d'abord, puis petits entiers, puis fractions
            # Cela donne x·(x²-1) au lieu de (x+1)·(x²-x) pour x³-x
            def root_simplicity(r):
                rv = float(r.evalf())
                if abs(rv) < 1e-12: return (0, 0)            # 0 en premier
                if abs(rv - round(rv)) < 1e-9: return (1, abs(rv))  # Entiers ensuite
                return (2, abs(rv))                               # Le reste

            roots = sorted(
                [s for s in sp.solve(remaining, x) if s.is_real],
                key=root_simplicity
            )

            if not roots:
                # Pas de racine réelle → garder comme facteur générique
                factors.append({
                    'label': str(sp.expand(remaining)), 'degree': int(rem_deg),
                    'zeros': [], 'role': role, 'delta_steps': None,
                })
                break

            # Prendre la racine la plus simple et diviser
            r_val = roots[0]
            lin_factor = x - r_val
            quotient, remainder_div = sp.div(sp.expand(remaining), lin_factor, x)

            if sp.simplify(remainder_div) != 0:
                # Division échouée → garder comme facteur générique
                rz_all = roots
                factors.append({
                    'label': str(sp.expand(remaining)), 'degree': int(rem_deg),
                    'zeros': rz_all, 'role': role, 'delta_steps': None,
                })
                break

            # Ajouter le facteur linéaire (x - r)
            factors.append({
                'label': str(sp.expand(lin_factor)), 'degree': 1,
                'zeros': [r_val], 'role': role, 'delta_steps': None,
            })
            remaining = sp.expand(quotient)
            # On reboucle → le quotient sera traité au prochain tour
            # Si degré 2 → trinôme avec Δ 🎯

    return factors, const_coeff


# ─────────────────────────────────────────────────────────────
# CALCUL DU TABLEAU DE SIGNES
# ─────────────────────────────────────────────────────────────

def compute_sign_table(expression, niveau='terminale_spe'):
    """Calcule le tableau de signes complet d'une expression."""
    # Nettoyer l'expression
    raw = expression.replace('^', '**').replace(',', '.')
    # Convertir les exposants Unicode et symboles
    raw = raw.replace('²', '**2').replace('³', '**3').replace('⁴', '**4')
    raw = raw.replace('×', '*').replace('·', '*').replace('−', '-').replace('÷', '/')
    expr_full = sp.sympify(raw, locals=LOCALS)
    num, den = sp.fraction(expr_full)

    # Extraire tous les facteurs
    num_trans = extract_transcendental_factors(num, 'numerator')
    den_trans = extract_transcendental_factors(den, 'denominator')
    num_poly, num_const = get_polynomial_factors(num, 'numerator')
    den_poly, den_const = get_polynomial_factors(den, 'denominator')

    num_factors_all = num_trans + num_poly
    den_factors_all = den_trans + den_poly

    # Trouver les zéros
    def zf(factors):
        r = []
        for f in factors:
            for z in f['zeros']:
                try:
                    r.append(float(z.evalf()))
                except:
                    pass
        return sorted(set(r))

    num_zeros_f = zf(num_factors_all)
    den_zeros_f = zf(den_factors_all)

    # Filet de sécurité : résolution directe pour les expressions transcendantes
    # (exp, ln, etc.) dont les zéros ne sont pas trouvés par la factorisation
    try:
        direct_zeros = sp.solve(num, x)
        for z in direct_zeros:
            try:
                if z.is_real:
                    zv = float(z.evalf())
                    if not any(abs(zv - nz) < 1e-9 for nz in num_zeros_f):
                        num_zeros_f.append(zv)
            except:
                pass
        num_zeros_f = sorted(set(num_zeros_f))
    except:
        pass
    try:
        direct_den_zeros = sp.solve(den, x)
        for z in direct_den_zeros:
            try:
                if z.is_real:
                    zv = float(z.evalf())
                    if not any(abs(zv - dz) < 1e-9 for dz in den_zeros_f):
                        den_zeros_f.append(zv)
            except:
                pass
        den_zeros_f = sorted(set(den_zeros_f))
    except:
        pass

    critical = sorted(set(num_zeros_f + den_zeros_f))

    # Domaine — utilisation de continuous_domain() de SymPy
    # Détecte automatiquement l'ensemble de définition (ln, sqrt, 1/x, tan, etc.)
    domain_left = None
    domain_strict = False
    left_label = '-inf'

    try:
        dom = continuous_domain(expr_full, x, sp.S.Reals)
        # Extraire la borne gauche du domaine
        # Pour un Interval : dom.inf = borne gauche, dom.left_open = borne ouverte
        # Pour une Union : prendre le premier Interval
        if hasattr(dom, 'inf') and dom.inf != sp.S.NegativeInfinity:
            domain_left = float(dom.inf.evalf())
            # left_open = True → borne exclue (ex: ]0 pour ln)
            # left_open = False → borne incluse (ex: [0 pour sqrt)
            domain_strict = getattr(dom, 'left_open', False)
            # Pour une Union, chercher le premier intervalle
            if hasattr(dom, 'args'):
                for arg in dom.args:
                    if isinstance(arg, sp.Interval):
                        domain_left = float(arg.inf.evalf())
                        domain_strict = arg.left_open
                        break
    except Exception:
        pass

    # Si on a une borne de domaine :
    # - Filtrer les points critiques hors domaine
    if domain_left is not None:
        num_zeros_f = [z for z in num_zeros_f if z > domain_left + 1e-9]
        den_zeros_f = [z for z in den_zeros_f if z > domain_left + 1e-9]
        critical = sorted(set(num_zeros_f + den_zeros_f))

    # Construire le label de la borne gauche
    # Convention : ] devant la valeur = borne stricte (exclue), ex: ]0
    # Pas de préfixe = borne incluse, ex: 0
    if domain_left is not None:
        left_label = (']' if domain_strict else '') + fmt(domain_left)
    else:
        left_label = '-inf'

    # Points de test
    def test_pts_for(crit, dl):
        if not crit:
            return [dl + 1.0 if dl is not None else 0.0]
        first = (dl + crit[0]) / 2.0 + 1e-6 if dl is not None else crit[0] - 1.0
        pts = [first]
        for i in range(len(crit) - 1):
            pts.append((crit[i] + crit[i + 1]) / 2.0)
        pts.append(crit[-1] + 1.0)
        return pts

    test_pts = test_pts_for(critical, domain_left)

    # Construire les lignes du tableau
    def build_row(f):
        ftype = f.get('type', 'poly')
        zeros_f = []
        for z in f['zeros']:
            try:
                zeros_f.append(float(z.evalf()))
            except:
                pass
        own_zero_set = set(zeros_f)
        sym = f.get('expr')
        if sym is None:
            try:
                sym = sp.sympify(f['label'], locals=LOCALS)
            except:
                sym = None
        vals = []
        for i, tp in enumerate(test_pts):
            s = '+' if ftype == 'exp' else (sign_at(sym, tp) if sym else '+')
            vals.append(s or '+')
            if i < len(critical):
                cp = critical[i]
                if any(abs(cp - z) < 1e-9 for z in own_zero_set):
                    vals.append('0')
                else:
                    s2 = '+' if ftype == 'exp' else (sign_at(sym, cp) if sym else '+')
                    vals.append(s2 or '+')
        return vals

    rows = []
    all_delta_steps = []

    # Coefficient constant négatif (règle des signes)
    effective_const = float(num_const) / float(den_const) if float(den_const) != 0 else float(num_const)
    if effective_const < -1e-10:
        n_elements = 2 * len(critical) + 1
        const_row_vals = ['-'] * n_elements
        ec_abs = abs(effective_const)
        if abs(ec_abs - round(ec_abs)) < 1e-9:
            const_label = str(int(round(effective_const)))
        else:
            const_label = str(round(effective_const, 4))
        rows.append({'label': const_label, 'values': const_row_vals, 'type': 'numerator'})

    # Facteurs
    for fi in num_factors_all:
        rows.append({'label': fi['label'], 'values': build_row(fi), 'type': 'numerator'})
        if fi.get('delta_steps'):
            all_delta_steps.append({'factor': prettify_label(fi['label']), 'steps': fi['delta_steps']})
    for fi in den_factors_all:
        rows.append({'label': fi['label'], 'values': build_row(fi), 'type': 'denominator'})
        if fi.get('delta_steps'):
            all_delta_steps.append({'factor': prettify_label(fi['label']), 'steps': fi['delta_steps']})

    # Ligne f(x)
    fx_vals = []
    for i, tp in enumerate(test_pts):
        s = sign_at(expr_full, tp)
        fx_vals.append(s or '+')
        if i < len(critical):
            cp = critical[i]
            if any(abs(cp - d) < 1e-9 for d in den_zeros_f):
                fx_vals.append('||')
            elif any(abs(cp - z) < 1e-9 for z in num_zeros_f):
                fx_vals.append('0')
            else:
                s2 = sign_at(expr_full, cp + 1e-6)
                fx_vals.append(s2 or '+')

    # Construire le bloc @@@
    # left_label est déjà construit plus haut (avec ] si borne stricte)
    x_str = ', '.join([left_label] + [fmt(c) for c in critical] + ['+inf'])
    lines = ['table |', f'x: {x_str} |']

    for row in rows:
        lines.append(f"sign: {prettify_label(row['label'])} : {', '.join(row['values'])} |")
    lines.append(f"sign: f(x) : {', '.join(fx_vals)} |")
    aaa_block = '@@@\n' + '\n'.join(lines) + '\n@@@'

    # Construire la liste des facteurs pour le contexte IA
    factors_info = []
    for row in rows:
        factors_info.append({
            'label': prettify_label(row['label']),
            'type': row.get('type', 'numerator'),
        })

    return {
        'success': True,
        'aaaBlock': aaa_block,
        'criticalPoints': critical,
        'discriminantSteps': all_delta_steps,
        'factors': factors_info,
        'numZeros': num_zeros_f,
        'denZeros': den_zeros_f,
        'fxValues': fx_vals,
        'effectiveConst': effective_const,
    }


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'sympy_version': sp.__version__})


@app.route('/sign-table', methods=['POST'])
def sign_table():
    try:
        data = request.get_json()
        expression = data.get('expression', '')
        niveau = data.get('niveau', 'terminale_spe')

        if not expression:
            return jsonify({'success': False, 'error': 'expression manquante'}), 400

        result = compute_sign_table(expression, niveau)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()[:1200],
        }), 500


# ─────────────────────────────────────────────────────────────
# DÉMARRAGE
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', '0') == '1')
