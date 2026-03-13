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
    """Convertit x**2 → x², sqrt(...) → √(...), etc. pour l'affichage."""
    import re
    superscripts = {'2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'}
    def replace_power(m):
        exp = m.group(1)
        if exp in superscripts:
            return superscripts[exp]
        return '^' + exp
    result = re.sub(r'\*\*(\d+)', replace_power, str(label))
    # sqrt(...) → √(...)
    result = re.sub(r'\bsqrt\(([^)]+)\)', r'√(\1)', result)
    # exp(x) → eˣ, exp(u) → e^(u)
    result = re.sub(r'\bexp\(x\)', 'eˣ', result)
    result = re.sub(r'\bexp\(([^)]+)\)', r'e^(\1)', result)
    # log(...) → ln(...)
    result = re.sub(r'\blog\(([^)]+)\)', r'ln(\1)', result)
    result = result.replace('*', '·')
    return result


# ─────────────────────────────────────────────────────────────
# EXTRACTION DES FACTEURS POLYNOMIAUX
# ─────────────────────────────────────────────────────────────

def get_polynomial_factors(poly_expr, role, niveau="terminale_spe"):
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

    seconde_full_factor = (niveau == "seconde")  # Seconde: no Delta for deg-2

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

        elif rem_deg == 2 and not seconde_full_factor:
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
    num_poly, num_const = get_polynomial_factors(num, 'numerator', niveau)
    den_poly, den_const = get_polynomial_factors(den, 'denominator', niveau)

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

    # Domaine --- continuous_domain() de SymPy
    domain_left = None
    domain_strict = False
    left_label = '-inf'
    forbidden_domain_pts = []  # internal gap points (ex: +-2 for ln(x^2-4))

    try:
        dom = continuous_domain(expr_full, x, sp.S.Reals)

        if isinstance(dom, sp.Union):
            # Union domain, e.g. ln(x^2-4) -> ]-inf,-2[ U ]2,+inf[
            intervals = sorted(
                [arg for arg in dom.args if isinstance(arg, sp.Interval)],
                key=lambda iv: float(iv.inf.evalf()) if iv.inf != sp.S.NegativeInfinity else -1e18
            )
            if intervals:
                first_iv = intervals[0]
                if first_iv.inf != sp.S.NegativeInfinity:
                    domain_left = float(first_iv.inf.evalf())
                    domain_strict = first_iv.left_open
                seen_pts = set()
                for iv in intervals:
                    if iv.sup != sp.S.Infinity:
                        v = float(iv.sup.evalf())
                        if v not in seen_pts:
                            forbidden_domain_pts.append(v)
                            seen_pts.add(v)
                    if iv.inf != sp.S.NegativeInfinity:
                        v = float(iv.inf.evalf())
                        if v not in seen_pts:
                            forbidden_domain_pts.append(v)
                            seen_pts.add(v)
                forbidden_domain_pts.sort()
        elif hasattr(dom, 'inf') and dom.inf != sp.S.NegativeInfinity:
            domain_left = float(dom.inf.evalf())
            domain_strict = getattr(dom, 'left_open', False)
            if hasattr(dom, 'args'):
                for arg in dom.args:
                    if isinstance(arg, sp.Interval):
                        domain_left = float(arg.inf.evalf())
                        domain_strict = arg.left_open
                        break
    except Exception:
        pass

    # Add forbidden domain pts as denominator zeros -> || in sign table
    for pt in forbidden_domain_pts:
        if not any(abs(pt - dz) < 1e-9 for dz in den_zeros_f):
            den_zeros_f.append(pt)
    if forbidden_domain_pts:
        den_zeros_f = sorted(den_zeros_f)

    # Si on a une borne de domaine :
    # GARDER les zéros à la borne (ex: sqrt(x+3) s'annule en x=-3)
    if domain_left is not None:
        num_zeros_f = [z for z in num_zeros_f if z >= domain_left - 1e-9]
        den_zeros_f = [z for z in den_zeros_f if z >= domain_left - 1e-9]
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
        if dl is not None and abs(dl - crit[0]) < 1e-9:
            first = dl - 1.0  # before domain -> || slot
        elif dl is not None:
            first = (dl + crit[0]) / 2.0 + 1e-6
        else:
            first = crit[0] - 1.0
        pts = [first]
        for i in range(len(crit) - 1):
            pts.append((crit[i] + crit[i + 1]) / 2.0)
        pts.append(crit[-1] + 1.0)
        return pts

    test_pts = test_pts_for(critical, domain_left)

    # Construire les lignes du tableau
    def is_before_domain(pt):
        return domain_left is not None and pt < domain_left - 1e-9

    def is_in_forbidden_zone(pt):
        if not forbidden_domain_pts: return False
        fps = sorted(forbidden_domain_pts)
        for j in range(0, len(fps) - 1, 2):
            lo, hi = fps[j], fps[j + 1]
            if lo < pt < hi: return True
        return False

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
            if is_before_domain(tp) or is_in_forbidden_zone(tp):
                s = '||'
            elif ftype == 'exp':
                s = '+'
            else:
                s = sign_at(sym, tp) if sym else '+'
            vals.append(s or '+')
            if i < len(critical):
                cp = critical[i]
                if any(abs(cp - dz) < 1e-9 for dz in den_zeros_f):
                    vals.append('||')
                elif any(abs(cp - z) < 1e-9 for z in own_zero_set):
                    vals.append('0')
                elif is_before_domain(cp) or is_in_forbidden_zone(cp):
                    vals.append('||')
                else:
                    if ftype == 'exp': s2 = '+'
                    else: s2 = sign_at(sym, cp) if sym else '+'
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
        if is_before_domain(tp) or is_in_forbidden_zone(tp):
            fx_vals.append('||')
        else:
            s = sign_at(expr_full, tp)
            fx_vals.append(s or '+')
        if i < len(critical):
            cp = critical[i]
            if any(abs(cp - d) < 1e-9 for d in den_zeros_f):
                fx_vals.append('||')
            elif any(abs(cp - z) < 1e-9 for z in num_zeros_f):
                fx_vals.append('0')
            elif is_before_domain(cp) or is_in_forbidden_zone(cp):
                fx_vals.append('||')
            else:
                s2 = sign_at(expr_full, cp + 1e-6)
                fx_vals.append(s2 or '+')

    # Construire le bloc @@@
    # left_label est déjà construit plus haut (avec ] si borne stricte)
    # Dédupliquer : si domain_left == critical[0], ne pas répéter la borne
    critical_display = critical
    if domain_left is not None and critical and abs(critical[0] - domain_left) < 1e-9:
        critical_display = critical[1:]
        left_label = ']' + fmt(domain_left)  # MathTable: domain boundary, no phantom slot
        for row in rows:
            if len(row['values']) >= 2:
                row['values'] = row['values'][2:]
        if len(fx_vals) >= 2:
            fx_vals = fx_vals[2:]
    x_str = ', '.join([left_label] + [fmt(c) for c in critical_display] + ['+inf'])
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
# CALCULS GÉOMÉTRIQUES EXACTS (SymPy)
# ─────────────────────────────────────────────────────────────

def geo_exact_latex(val):
    """Convertit une valeur SymPy en LaTeX exact lisible."""
    try:
        simplified = sp.nsimplify(val, rational=False)
        return sp.latex(simplified)
    except:
        return str(val)

def geo_approx(val, decimals=3):
    """Valeur approchée arrondie."""
    try:
        f = float(val.evalf())
        return f"{f:.{decimals}f}"
    except:
        return ""

def compute_geo(points_data, commands):
    """
    points_data : [{"id": "A", "x": 0, "y": 0}, ...]
    commands    : ["distance AB", "distance BC", "aire ABC", "perimetre ABC",
                   "milieu AB", "angle ABC", "vecteur AB"]
    Retourne    : [{"label": "AB =", "latex": "\\sqrt{2}", "approx": "1.414"}, ...]
    """
    # Construire le dict de points avec coordonnées exactes SymPy
    pts = {}
    for p in points_data:
        px = sp.Rational(str(p['x'])) if '.' not in str(p['x']) else sp.nsimplify(p['x'])
        py = sp.Rational(str(p['y'])) if '.' not in str(p['y']) else sp.nsimplify(p['y'])
        pts[p['id']] = (px, py)

    results = []

    for cmd in commands:
        cmd = cmd.strip()
        parts = cmd.split()
        if not parts:
            continue

        op = parts[0].lower()

        try:
            if op == 'distance' and len(parts) == 2:
                # distance AB → √((xB-xA)²+(yB-yA)²)
                seg = parts[1]
                if len(seg) == 2 and seg[0] in pts and seg[1] in pts:
                    A, B = pts[seg[0]], pts[seg[1]]
                    d2 = (B[0]-A[0])**2 + (B[1]-A[1])**2
                    dist = sp.sqrt(d2)
                    dist_s = sp.simplify(dist)
                    results.append({
                        'label': f'{seg[0]}{seg[1]} =',
                        'latex': geo_exact_latex(dist_s),
                        'approx': geo_approx(dist_s),
                    })

            elif op in ('aire', 'area') and len(parts) == 2:
                # aire ABC → ||(AB × AC)|| / 2
                tri = parts[1]
                if len(tri) == 3 and tri[0] in pts and tri[1] in pts and tri[2] in pts:
                    A, B, C = pts[tri[0]], pts[tri[1]], pts[tri[2]]
                    cross = (B[0]-A[0])*(C[1]-A[1]) - (B[1]-A[1])*(C[0]-A[0])
                    area = sp.Abs(cross) / 2
                    area_s = sp.simplify(area)
                    results.append({
                        'label': f'Aire {tri} =',
                        'latex': geo_exact_latex(area_s) + r'\text{ u}^2',
                        'approx': geo_approx(area_s),
                    })

            elif op in ('perimetre', 'perimeter') and len(parts) == 2:
                # perimetre ABC → AB + BC + CA
                poly = parts[1]
                total = sp.Integer(0)
                n = len(poly)
                labels = []
                for i in range(n):
                    a_id, b_id = poly[i], poly[(i+1) % n]
                    if a_id not in pts or b_id not in pts:
                        break
                    A, B = pts[a_id], pts[b_id]
                    d = sp.sqrt((B[0]-A[0])**2 + (B[1]-A[1])**2)
                    total += d
                    labels.append(f'{a_id}{b_id}')
                total_s = sp.simplify(total)
                results.append({
                    'label': f'Périmètre {poly} =',
                    'latex': geo_exact_latex(total_s) + r'\text{ u}',
                    'approx': geo_approx(total_s),
                })

            elif op == 'milieu' and len(parts) == 2:
                # milieu AB → ((xA+xB)/2 ; (yA+yB)/2)
                seg = parts[1]
                if len(seg) == 2 and seg[0] in pts and seg[1] in pts:
                    A, B = pts[seg[0]], pts[seg[1]]
                    mx = sp.Rational(A[0]+B[0], 2)
                    my = sp.Rational(A[1]+B[1], 2)
                    mx_s = sp.nsimplify(mx)
                    my_s = sp.nsimplify(my)
                    results.append({
                        'label': f'Milieu {seg[0]}{seg[1]} =',
                        'latex': f'\\left({geo_exact_latex(mx_s)}\\ ;\\ {geo_exact_latex(my_s)}\\right)',
                        'approx': f'({geo_approx(mx_s, 2)} ; {geo_approx(my_s, 2)})',
                    })

            elif op == 'angle' and len(parts) == 2:
                # angle ABC → angle en B (vecteurs BA et BC)
                tri = parts[1]
                if len(tri) == 3 and tri[0] in pts and tri[1] in pts and tri[2] in pts:
                    A, B, C = pts[tri[0]], pts[tri[1]], pts[tri[2]]
                    BAx, BAy = A[0]-B[0], A[1]-B[1]
                    BCx, BCy = C[0]-B[0], C[1]-B[1]
                    dot  = BAx*BCx + BAy*BCy
                    lenA = sp.sqrt(BAx**2 + BAy**2)
                    lenC = sp.sqrt(BCx**2 + BCy**2)
                    cos_angle = sp.simplify(dot / (lenA * lenC))
                    angle_rad = sp.acos(cos_angle)
                    angle_deg = sp.simplify(sp.deg(angle_rad))
                    results.append({
                        'label': f'\\widehat{{{tri[0]}{tri[1]}{tri[2]}}} =',
                        'latex': geo_exact_latex(sp.simplify(angle_rad)) + r'\text{ rad}',
                        'approx': geo_approx(angle_deg) + '°',
                    })

            elif op == 'vecteur' and len(parts) == 2:
                # vecteur AB → (xB-xA ; yB-yA)
                seg = parts[1]
                if len(seg) == 2 and seg[0] in pts and seg[1] in pts:
                    A, B = pts[seg[0]], pts[seg[1]]
                    vx = sp.nsimplify(B[0]-A[0])
                    vy = sp.nsimplify(B[1]-A[1])
                    results.append({
                        'label': f'\\vec{{{seg[0]}{seg[1]}}} =',
                        'latex': f'\\begin{{pmatrix}} {geo_exact_latex(vx)} \\\\\\\\ {geo_exact_latex(vy)} \\end{{pmatrix}}',
                        'approx': f'({geo_approx(vx, 2)} ; {geo_approx(vy, 2)})',
                    })

            elif op == 'rayon' and len(parts) == 2:
                # rayon OA → distance du centre O au point A
                seg = parts[1]
                if len(seg) == 2 and seg[0] in pts and seg[1] in pts:
                    A, B = pts[seg[0]], pts[seg[1]]
                    d2 = (B[0]-A[0])**2 + (B[1]-A[1])**2
                    r = sp.sqrt(d2)
                    r_s = sp.simplify(r)
                    results.append({
                        'label': 'r =',
                        'latex': geo_exact_latex(r_s),
                        'approx': geo_approx(r_s),
                    })

        except Exception as e:
            results.append({'label': cmd, 'latex': '?', 'approx': str(e)[:40]})

    return results


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

@app.route('/geo-compute', methods=['POST'])
def geo_compute():
    """
    Calcule des mesures géométriques exactes via SymPy.
    Body: {
      "points": [{"id": "A", "x": 0, "y": 0}, ...],
      "commands": ["distance AB", "distance BC", "aire ABC", "milieu AB", ...]
    }
    """
    try:
        data = request.get_json()
        points_data = data.get('points', [])
        commands    = data.get('commands', [])

        if not points_data:
            return jsonify({'success': False, 'error': 'points manquants'}), 400
        if not commands:
            return jsonify({'success': True, 'results': []})

        results = compute_geo(points_data, commands)
        return jsonify({'success': True, 'results': results})

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()[:800],
        }), 500



@app.route('/domain', methods=['POST'])
def domain():
    """
    Retourne le domaine de définition d'une expression via SymPy continuous_domain().
    Body: { "expression": "sqrt(x+2)" }
    Retourne: { "success": true, "domainLeft": -2, "domainStrict": false,
                "domainLatex": "[-2 ; +inf[", "forbiddenPoints": [] }
    """
    try:
        data = request.get_json()
        expression = data.get('expression', '')
        if not expression:
            return jsonify({'success': False, 'error': 'expression manquante'}), 400

        raw = expression.replace('^', '**').replace(',', '.')
        raw = raw.replace('²', '**2').replace('³', '**3').replace('⁴', '**4')
        raw = raw.replace('×', '*').replace('·', '*').replace('−', '-').replace('÷', '/')
        expr_sym = sp.sympify(raw, locals=LOCALS)

        domain_left = None
        domain_strict = False
        forbidden_points = []

        dom = continuous_domain(expr_sym, x, sp.S.Reals)

        if isinstance(dom, sp.Union):
            intervals = sorted(
                [arg for arg in dom.args if isinstance(arg, sp.Interval)],
                key=lambda iv: float(iv.inf.evalf()) if iv.inf != sp.S.NegativeInfinity else -1e18
            )
            if intervals:
                first_iv = intervals[0]
                if first_iv.inf != sp.S.NegativeInfinity:
                    domain_left = float(first_iv.inf.evalf())
                    domain_strict = first_iv.left_open
                seen_pts = set()
                for iv in intervals:
                    for bound in [iv.sup, iv.inf]:
                        if bound not in (sp.S.Infinity, sp.S.NegativeInfinity):
                            v = float(bound.evalf())
                            if v not in seen_pts:
                                forbidden_points.append(v)
                                seen_pts.add(v)
                forbidden_points.sort()
        elif hasattr(dom, 'inf') and dom.inf != sp.S.NegativeInfinity:
            domain_left = float(dom.inf.evalf())
            domain_strict = getattr(dom, 'left_open', False)

        # Label LaTeX du domaine
        if domain_left is not None:
            lb = ']' if domain_strict else '['
            lv = str(int(round(domain_left))) if abs(domain_left - round(domain_left)) < 0.01 else str(round(domain_left, 4))
            domain_latex = f'{lb}{lv} ; +\\infty['
        else:
            domain_latex = '\\mathbb{R}'

        return jsonify({
            'success': True,
            'domainLeft': domain_left,
            'domainStrict': domain_strict,
            'domainLatex': domain_latex,
            'forbiddenPoints': forbidden_points,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()[:800],
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', '0') == '1')

