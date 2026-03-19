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
import re
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
    # Préserver les produits existants (ex: (-2x+4)(x-3)) pour éviter
    # qu'ils ne soient développés et que les coefficients soient modifiés.
    if poly_expr.is_Mul:
        all_factors = []
        total_const = 1.0
        for arg in poly_expr.args:
            if arg.is_number:
                try:
                    total_const *= float(arg.evalf())
                except:
                    pass
            else:
                f, c = get_polynomial_factors(arg, role, niveau)
                all_factors.extend(f)
                total_const *= c
        return all_factors, total_const

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

    const_coeff = 1.0
    factors = []
    remaining = sp.expand(poly_simplified)

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
    # Si l'expression contient une inéquation ou équation, on ne garde que la partie gauche
    expression = re.sub(r'\s*(?:>|<|>=|<=|=)\s*.*$', '', str(expression))
    
    # Nettoyer l'expression
    raw = expression.replace('^', '**').replace(',', '.')
    # Convertir les exposants Unicode et symboles
    raw = raw.replace('²', '**2').replace('³', '**3').replace('⁴', '**4')
    raw = raw.replace('×', '*').replace('·', '*').replace('−', '-').replace('÷', '/')
    
    # Rétablissement des multiplications implicites (ex: 2x -> 2*x)
    raw = re.sub(r'(\d)\s*([a-zA-Z])', r'\1*\2', raw)
    raw = re.sub(r'\)\s*\(', r')*(', raw)
    raw = re.sub(r'([x-zX-Z])\s*\(', r'\1*(', raw)
    raw = re.sub(r'(\d)\s*\(', r'\1*(', raw)
    raw = re.sub(r'\)\s*([a-zA-Z])', r')*\1', raw)
    
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

    dom = None
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
        # Pour savoir si on est dans un "trou" du domaine de définition
        # (ex: ]-2, 2[ pour ln(x^2 - 4))
        # Si sympy a calculé "dom", on s'en sert directement (rapide et mathématiquement parfait)
        if dom is not None:
            try:
                # contains() renvoie S.true ou S.false
                # s'il renvoie true, alors pt est dans le domaine, donc pas forbidden
                return getattr(dom.contains(pt), 'is_Boolean') and not dom.contains(pt)
            except:
                pass
        
        # Fallback ultra-basique (uniquement si dom est absent ce qui sera rare)
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
                is_den_zero = any(abs(cp - dz) < 1e-9 for dz in den_zeros_f)
                is_own_zero = any(abs(cp - z) < 1e-9 for z in own_zero_set)

                if is_before_domain(cp) or is_in_forbidden_zone(cp):
                    vals.append('||')
                elif is_own_zero:
                    # Ce facteur s'annule ici : afficher '0'
                    # Pour le dénominateur, ce '0' est aussi la valeur interdite de f(x)
                    vals.append('0')
                elif is_den_zero:
                    # Ce point est un zéro du dénominateur global, MAIS pas de ce facteur.
                    # On évalue le signe de CE facteur à ce point (il est défini et non nul ici).
                    # Le facteur dénominateur qui possède ce zéro affichera '0' via is_own_zero.
                    if ftype == 'exp':
                        s2 = '+'
                    else:
                        s2 = sign_at(sym, cp) if sym else '+'
                    vals.append(s2 or '+')
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


def _sign_of(expr):
    """Retourne (num_value, sign_int) d'une expression SymPy.
    sign_int : +1 (positif), 0 (nul), -1 (negatif).
    Robuste meme si evalf() retourne un complexe comme 25.0+0.0*I.
    """
    def _to_real_float(e):
        """Convertit n'importe quelle expression SymPy en float (partie reelle)."""
        ev = e.evalf()
        # Cas complexe: 25.0 + 0.0*I → prendre la partie reelle
        if hasattr(ev, 'as_real_imag'):
            re_part, _ = ev.as_real_imag()
            return float(re_part)
        return float(ev)

    # Tentative 1 : evalf direct
    try:
        v = _to_real_float(expr)
        if v > 1e-9:   return v,  1
        if v < -1e-9:  return v, -1
        return 0.0, 0
    except (TypeError, ValueError, AttributeError):
        pass

    # Tentative 2 : N() avec 50 chiffres
    try:
        v = _to_real_float(sp.N(expr, 50))
        if v > 1e-9:   return v,  1
        if v < -1e-9:  return v, -1
        return 0.0, 0
    except (TypeError, ValueError, AttributeError):
        pass

    # Tentative 3 : proprietes symboliques SymPy (calcul symbolique pur)
    if expr.is_positive:  return  1.0,  1
    if expr.is_negative:  return -1.0, -1
    if expr.is_zero:      return  0.0,  0

    # Indetermine : pas de solution reelle annoncee
    return 0.0, 0


def _safe_approx(expr):
    """Retourne une approximation float d'une expression SymPy sous forme de string.
    Ne leve jamais d'exception.
    """
    try:
        ev = expr.evalf()
        if hasattr(ev, 'as_real_imag'):
            re_part, _ = ev.as_real_imag()
            return str(round(float(re_part), 4))
        return str(round(float(ev), 4))
    except Exception:
        return sp.latex(expr)


import functools
import json

SOLVE_CACHE = {}
SOLVE_CACHE_MAX_SIZE = 1000

@app.route('/solve', methods=['POST'])
def solve_equation():
    print('SOLVE PAYLOAD:', request.json, flush=True)
    """
    Résout une équation polynomiale du second degré.
    Body: {
        "equation": "2*x**2-5*x+1=0"  // Format SymPy
    }

    Returns: {
        "success": true,
        "type": "quadratic",  // ou "linear", "factorizable"
        "discriminant": 17,
        "discriminant_type": "positive",  // "positive", "zero", "negative"
        "solutions": ["(5-sqrt(17))/4", "(5+sqrt(17))/4"],
        "latex_solutions": ["\\frac{5-\\sqrt{17}}{4}", "\\frac{5+\\sqrt{17}}{4}"],
        "steps": ["Calcul du discriminant...", "..."]
    }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        eq_str = data.get('equation', '')
        niveau = data.get('niveau', 'terminale_spe')  # seconde | premiere | terminale_spe
        is_seconde = (niveau == 'seconde')

        cache_key = (eq_str, niveau)
        if cache_key in SOLVE_CACHE:
            return jsonify(SOLVE_CACHE[cache_key])

        if not eq_str:
            return jsonify({
                'success': False,
                'error': 'equation is required'
            }), 400

        # Nettoyer l'expression
        eq_str = eq_str.strip()
        eq_str = eq_str.replace('\u00b2', '**2').replace('\u00b3', '**3')
        eq_str = eq_str.replace('^', '**')
        # Rétablissement des multiplications implicites (ex: 2x -> 2*x)
        eq_str = re.sub(r'(\d)\s*([a-zA-Z])', r'\1*\2', eq_str)
        eq_str = re.sub(r'\)\s*\(', r')*(', eq_str)
        eq_str = re.sub(r'([x-zX-Z])\s*\(', r'\1*(', eq_str)
        eq_str = re.sub(r'(\d)\s*\(', r'\1*(', eq_str)
        eq_str = re.sub(r'\)\s*([a-zA-Z])', r')*\1', eq_str)
        # Virgule decimale francaise : 0,5 → 0.5 (ne touche que chiffre,chiffre)
        eq_str = re.sub(r'(\d),(\d)', r'\1.\2', eq_str)


        # Séparer gauche et droite du =
        if '=' not in eq_str:
            return jsonify({
                'success': False,
                'error': 'Equation must contain ='
            }), 400

        parts = eq_str.split('=')
        if len(parts) != 2:
            return jsonify({
                'success': False,
                'error': 'Equation must have exactly one ='
            }), 400

        left_str = parts[0].strip().replace('$', '').strip().rstrip(',;.').strip()
        right_str = parts[1].strip().replace('$', '').strip().rstrip(',;.').strip()
        
        if not right_str:
            right_str = '0'

        # Si right_str != '0', on soustrait pour avoir = 0
        if right_str != '0':
            # Forme: ax² + bx + c = d  →  ax² + bx + (c-d) = 0
            eq_expr_str = f"({left_str})-({right_str})"
        else:
            eq_expr_str = left_str

        # Parser avec SymPy
        try:
            eq_expr_str = eq_expr_str.replace('$', '').strip().rstrip(',;.').strip()
            eq_expr = sp.sympify(eq_expr_str, locals=LOCALS)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Cannot parse equation: {str(e)}'
            }), 400

        # ── Nettoyage supplementaire ──────────────────────────────────
        eq_str_clean = eq_str.strip()
        eq_str_clean = eq_str_clean.replace('\u00d7', '*').replace('\u00b7', '*')
        eq_str_clean = eq_str_clean.replace('\u2212', '-').replace('\u00f7', '/')

        if '=' not in eq_str_clean:
            return jsonify({'success': False, 'error': 'Equation must contain ='}), 400

        parts_raw = eq_str_clean.split('=', 1)
        lhs_str = parts_raw[0].strip()
        rhs_str = parts_raw[1].strip()

        try:
            lhs_str = lhs_str.replace('$', '').strip().rstrip(',;.').strip()
            rhs_str = rhs_str.replace('$', '').strip().rstrip(',;.').strip()
            if not rhs_str:
                rhs_str = '0'
            lhs_sym = sp.sympify(lhs_str, locals=LOCALS)
            rhs_sym = sp.sympify(rhs_str, locals=LOCALS)
            if isinstance(lhs_sym, tuple) or isinstance(rhs_sym, tuple):
                raise ValueError("Tuple operations are restricted")
        except Exception as pe:
            return jsonify({'success': False, 'error': 'Cannot parse: ' + str(pe)}), 400

        f_sym = sp.expand(lhs_sym - rhs_sym)

        if f_sym.has(sp.zoo, sp.nan, sp.oo, -sp.oo):
            return jsonify({
                'success': False,
                'error': 'L\'équation contient une division par zéro ou une forme indéterminée.'
            }), 400

        steps = []

        # ── Etape 1 : Domaine de definition ──────────────────────────
        domain_latex = '\\mathbb{R}'
        forbidden_pts = []
        domain_set = sp.S.Reals

        def _fmt_b(b):
            if b == sp.oo:  return '+\\infty'
            if b == -sp.oo: return '-\\infty'
            return sp.latex(b)

        def _str_iv(iv):
            lb = ']' if iv.left_open  else '['
            rb = '[' if iv.right_open else ']'
            return lb + _fmt_b(iv.inf) + ' ; ' + _fmt_b(iv.sup) + rb

        try:
            dom_l = continuous_domain(lhs_sym, x, sp.S.Reals)
            dom_r = continuous_domain(rhs_sym, x, sp.S.Reals) if rhs_str != '0' else sp.S.Reals
            dom   = dom_l.intersect(dom_r)
            domain_set = dom
            if dom != sp.S.Reals:
                if isinstance(dom, sp.Interval):
                    domain_latex = _str_iv(dom)
                elif isinstance(dom, sp.Union):
                    ivs = sorted([a for a in dom.args if isinstance(a, sp.Interval)],
                                 key=lambda iv: float(iv.inf.evalf()) if iv.inf != sp.S.NegativeInfinity else -1e18)
                    domain_latex = ' \\cup '.join(_str_iv(iv) for iv in ivs) or '\\mathbb{R}'
                    compl = sp.S.Reals - dom
                    if isinstance(compl, sp.FiniteSet):
                        forbidden_pts = sorted([float(p.evalf()) for p in compl])
                    elif isinstance(compl, sp.Union):
                        for arg in compl.args:
                            if isinstance(arg, sp.FiniteSet):
                                forbidden_pts += [float(p.evalf()) for p in arg]
                        forbidden_pts.sort()
            steps.append('**Etape 1 - Domaine de definition**\n\n$D_f = ' + domain_latex + '$')
        except Exception:
            steps.append('**Etape 1 - Domaine de definition**\n\n$D_f = \\mathbb{R}$')

        # ── Etape 2 : Mise sous forme f(x) = 0 ───────────────────────
        eq_disp  = sp.latex(lhs_sym) + ' = ' + sp.latex(rhs_sym)
        f_latex  = sp.latex(f_sym)
        if rhs_str != '0':
            steps.append(
                '**Etape 2 - Mise sous forme f(x) = 0**\n\n'
                '$' + eq_disp + '$\n\n'
                '$\\Leftrightarrow ' + f_latex + ' = 0$'
            )
        else:
            steps.append(
                '**Etape 2 - Forme f(x) = 0**\n\n'
                "L'equation est deja sous la forme $f(x) = 0$ :\n\n"
                '$f(x) = ' + f_latex + '$'
            )

        # ── Analyse du degre ──────────────────────────────────────────
        poly_obj    = f_sym.as_poly(x)
        poly_degree = poly_obj.degree() if poly_obj is not None else None
        factored    = sp.factor(f_sym)
        fact_latex  = sp.latex(factored)
        factor_details = []
        all_solutions  = []

        # ══════════════════════════════════════════════════════════════
        # REGLE PEDAGOGIQUE BO : degre 2 -> DELTA OBLIGATOIRE (sauf Seconde)
        # ══════════════════════════════════════════════════════════════
        if poly_degree == 2:
            cf = poly_obj.all_coeffs()
            av, bv, cv = cf[0], cf[1], cf[2]
            al, bl, cl = sp.latex(av), sp.latex(bv), sp.latex(cv)

            # ── CAS SECONDE : méthode sans Δ ──────────────────────────
            if is_seconde:
                # Tenter factorisation par identité remarquable ou facteur commun
                factored_s = sp.factor(f_sym)
                fact_l = sp.latex(factored_s)
                seconde_solved = False

                # Cas 1 : différence de carrés a²x² - c = 0 (bv == 0)
                av_f = float(av.evalf())
                bv_f = float(bv.evalf())
                cv_f = float(cv.evalf())

                if abs(bv_f) < 1e-10 and av_f * cv_f < 0:
                    # ax² - c = 0  → ax² = c → x² = c/a → identité a²-b² (c/a positif)
                    k2 = sp.Rational(-cv, av)
                    k = sp.sqrt(k2)
                    kl = sp.latex(sp.nsimplify(k))
                    x1s = sp.nsimplify(-k)
                    x2s = sp.nsimplify(k)
                    steps.append(
                        '**Etape 3 - Méthode (Seconde — sans discriminant)**\n\n'
                        'On utilise l\'identité remarquable $a^2 - b^2 = (a-b)(a+b)$ :\n\n'
                        f'$f(x) = {sp.latex(av)}x^2 - {sp.latex(sp.nsimplify(k2))} = 0$\n\n'
                        f'$\\Leftrightarrow \\left(x - {kl}\\right)\\left(x + {kl}\\right) = 0$'
                    )
                    steps.append(
                        f'**Etape 4 - Solutions**\n\n'
                        f'$x - {kl} = 0 \\Rightarrow x_1 = -{kl}$\n\n'
                        f'$x + {kl} = 0 \\Rightarrow x_2 = {kl}$\n\n'
                        f'**Conclusion :** $S = \\left\\{{-{kl} ; {kl}\\right\\}}$'
                    )
                    all_solutions = [x1s, x2s]
                    factor_details.append({'type': 'seconde_difference_carres', 'roots': [sp.latex(x1s), sp.latex(x2s)]})
                    seconde_solved = True
                    
                # NOUVEAU CAS : a et c de même signe (ex: 2x² + 8 = 0)
                elif abs(bv_f) < 1e-10 and av_f * cv_f > 0:
                    steps.append(
                        '**Etape 3 - Méthode (Seconde — sans discriminant)**\n\n'
                        f'On isole $x^2$ :\n\n'
                        f'$f(x) = {sp.latex(av)}x^2 + {sp.latex(cv)} = 0$\n\n'
                        f'$\\Leftrightarrow {sp.latex(av)}x^2 = -{sp.latex(cv)}$\n\n'
                        f'$\\Leftrightarrow x^2 = {sp.latex(sp.Rational(-cv, av))}$'
                    )
                    steps.append(
                        f'**Etape 4 - Solutions**\n\n'
                        f'Un carré dans $\\mathbb{{R}}$ étant toujours positif ou nul, '
                        f'l\'équation $x^2 = {sp.latex(sp.Rational(-cv, av))}$ n\'admet **aucune solution réelle**.\n\n'
                        f'**Conclusion :** $S = \\emptyset$'
                    )
                    all_solutions = []
                    factor_details.append({'type': 'seconde_no_real', 'roots': []})
                    seconde_solved = True

                # Cas 2 : facteur commun x (cv == 0)
                elif abs(cv_f) < 1e-10:
                    # ax² + bx = 0 → x(ax + b) = 0
                    inner_fac = sp.expand(av * x + bv)
                    inner_l = sp.latex(inner_fac)
                    sol_inner = sp.nsimplify(-bv / av)
                    sol_inner_l = sp.latex(sol_inner)
                    steps.append(
                        '**Etape 3 - Méthode (Seconde — facteur commun)**\n\n'
                        f'On factorise par $x$ :\n\n'
                        f'$f(x) = x \\times ({inner_l}) = 0$'
                    )
                    steps.append(
                        f'**Etape 4 - Solutions**\n\n'
                        f'$x = 0$ ou $({inner_l}) = 0$\n\n'
                        f'$({inner_l}) = 0 \\Rightarrow x = {sol_inner_l}$\n\n'
                        f'**Conclusion :** $S = \\left\\{{0 ; {sol_inner_l}\\right\\}}$'
                    )
                    all_solutions = [sp.Integer(0), sol_inner]
                    factor_details.append({'type': 'seconde_facteur_commun', 'roots': ['0', sol_inner_l]})
                    seconde_solved = True

                # Cas 3 : déjà factorisé en produit d'affines (ex: (x-3)(x+2)=0)
                elif factored_s.is_Mul:
                    lin_factors = []
                    for arg in factored_s.args:
                        if arg.is_number: continue
                        fp = arg.as_poly(x)
                        if fp and fp.degree() == 1:
                            lin_factors.append(arg)
                    if len(lin_factors) >= 2:
                        steps.append(
                            '**Etape 3 - Méthode (Seconde — produit de facteurs affines)**\n\n'
                            f'$f(x) = {fact_l} = 0$\n\n'
                            '(Factorisation obtenue par observation, sans discriminant)'
                        )
                        sol_parts = []
                        for lf in lin_factors:
                            z = sp.solve(lf, x)
                            if z:
                                s = z[0]
                                all_solutions.append(s)
                                sol_parts.append(f'${sp.latex(lf)} = 0 \\Rightarrow x = {sp.latex(s)}$')
                        steps.append(
                            '**Etape 4 - Solutions**\n\n' +
                            '\n\n'.join(sol_parts) + '\n\n' +
                            f'**Conclusion :** $S = \\left\\{{{" ; ".join(sp.latex(s) for s in all_solutions)}\\right\\}}$'
                        )
                        factor_details.append({'type': 'seconde_affines', 'roots': [sp.latex(s) for s in all_solutions]})
                        seconde_solved = True

                if not seconde_solved:
                    # Équation de degré 2 non factorisable sans Δ → hors programme Seconde
                    steps.append(
                        '**⛔ Hors programme Seconde**\n\n'
                        'Cette équation du second degré nécessite le discriminant $\\Delta = b^2 - 4ac$\n\n'
                        'qui est **hors programme en Seconde**. Ce chapitre est étudié en **Première**.\n\n'
                        f'L\'équation est : $f(x) = {sp.latex(f_sym)} = 0$'
                    )
                    return jsonify({
                        'success': True,
                        'steps': steps,
                        'solutions': [],
                        'latex_solutions': [],
                        'factor_details': [],
                        'domain_latex': domain_latex,
                        'equation_latex': eq_disp,
                        'f_expr_latex': f_latex,
                        'niveau': niveau,
                        'hors_programme': True,
                    })

                # Retour Seconde réussi
                return jsonify({
                    'success': True,
                    'steps': steps,
                    'solutions': [str(s) for s in all_solutions],
                    'latex_solutions': [sp.latex(s) for s in all_solutions],
                    'factor_details': factor_details,
                    'domain_latex': domain_latex,
                    'equation_latex': eq_disp,
                    'f_expr_latex': f_latex,
                    'niveau': niveau,
                })

            # ── CAS PREMIÈRE / TERMINALE : méthode avec Δ (comportement original) ──
            al, bl, cl = sp.latex(av), sp.latex(bv), sp.latex(cv)


            steps.append(
                '**Etape 3 - Identification des coefficients**\n\n'
                "L'equation est de la forme $ax^2 + bx + c = 0$ avec :\n\n"
                '$a = ' + al + '$,  $b = ' + bl + '$,  $c = ' + cl + '$'
            )

            delta  = bv**2 - 4*av*cv
            delta_s = sp.simplify(delta)
            dl = sp.latex(delta_s)

            steps.append(
                '**Etape 4 - Calcul du discriminant**\n\n'
                '$\\Delta = b^2 - 4ac = (' + bl + ')^2 - 4 \\times (' + al + ') \\times (' + cl + ')$\n\n'
                '$\\Delta = ' + dl + '$'
            )

            delta_val, delta_sign = _sign_of(delta_s)

            if delta_sign > 0:
                sqd  = sp.sqrt(delta_s)
                sqd_l = sp.latex(sqd)
                x1s  = sp.simplify((-bv - sqd) / (2*av))
                x2s  = sp.simplify((-bv + sqd) / (2*av))
                all_solutions.extend([x1s, x2s])
                x1l, x2l = sp.latex(x1s), sp.latex(x2s)
                steps.append(
                    '**Etape 5 - Resolution** ($\\Delta > 0$)\n\n'
                    '$\\Delta = ' + dl + ' > 0$ : deux solutions reelles distinctes :\n\n'
                    '$$x_1 = \\dfrac{-b - \\sqrt{\\Delta}}{2a} = '
                    '\\dfrac{-(' + bl + ') - ' + sqd_l + '}{2 \\times (' + al + ')} = ' + x1l + '$$\n\n'
                    '$$x_2 = \\dfrac{-b + \\sqrt{\\Delta}}{2a} = '
                    '\\dfrac{-(' + bl + ') + ' + sqd_l + '}{2 \\times (' + al + ')} = ' + x2l + '$$'
                )
                factor_details.append({
                    'type': 'quadratic_2roots',
                    'delta': str(delta_val),
                    'roots': [x1l, x2l]
                })

            elif delta_sign == 0:
                x0s  = sp.simplify(-bv / (2*av))
                all_solutions.append(x0s)
                x0l  = sp.latex(x0s)
                steps.append(
                    '**Etape 5 - Resolution** ($\\Delta = 0$)\n\n'
                    '$\\Delta = 0$ : solution double :\n\n'
                    '$$x_0 = \\dfrac{-b}{2a} = \\dfrac{-(' + bl + ')}{2 \\times (' + al + ')} = ' + x0l + '$$'
                )
                factor_details.append({'type': 'quadratic_double', 'delta': '0', 'roots': [x0l]})

            else:
                steps.append(
                    '**Etape 5 - Resolution** ($\\Delta < 0$)\n\n'
                    '$\\Delta = ' + dl + ' < 0$ : **aucune solution reelle.**'
                )
                factor_details.append({'type': 'quadratic_no_real', 'delta': str(delta_val), 'roots': []})

        else:
            # ── Degre != 2 : factorisation puis Delta sur facteurs deg 2 ──
            if factored != f_sym:
                steps.append('**Etape 3 - Factorisation**\n\n$f(x) = ' + fact_latex + '$')
            else:
                steps.append('**Etape 3 - Expression**\n\n$f(x) = ' + fact_latex + '$')

            poly_factors = []
            if factored.is_Mul:
                for arg in factored.args:
                    if arg.is_number: continue
                    elif (arg.is_Pow and arg.args[1].is_integer and int(arg.args[1]) > 0
                          and arg.args[0].as_poly(x) is not None):
                        poly_factors.append((arg.args[0], int(arg.args[1])))
                    elif arg.as_poly(x) is not None:
                        poly_factors.append((arg, 1))
            elif factored.as_poly(x) is not None:
                poly_factors.append((factored, 1))

            sol_details = []
            if poly_factors:
                for fac, mult in poly_factors:
                    fp = fac.as_poly(x)
                    if fp is None: continue
                    deg = fp.degree()
                    fl  = sp.latex(fac)
                    ms  = ' (ordre ' + str(mult) + ')' if mult > 1 else ''

                    if deg == 1:
                        c1 = fp.all_coeffs()
                        av2, bv2 = c1[0], c1[1]
                        sol = sp.Rational(-bv2, av2)
                        all_solutions.append(sol)
                        sol_details.append(
                            '**Facteur** $(' + fl + ') = 0$' + ms + '\n\n'
                            '$x = \\dfrac{' + sp.latex(-bv2) + '}{' + sp.latex(av2) + '} = ' + sp.latex(sol) + '$'
                        )
                        factor_details.append({'label': fl, 'type': 'linear', 'roots': [sp.latex(sol)]})

                    elif deg == 2:
                        c2 = fp.all_coeffs()
                        av2, bv2, cv2 = c2[0], c2[1], c2[2]
                        d2 = bv2**2 - 4*av2*cv2
                        d2s = sp.simplify(d2)
                        al2, bl2, cl2, dl2 = sp.latex(av2), sp.latex(bv2), sp.latex(cv2), sp.latex(d2s)
                        det = (
                            '**Facteur** $(' + fl + ') = 0$' + ms + '\n\n'
                            '$a=' + al2 + '$, $b=' + bl2 + '$, $c=' + cl2 + '$\n\n'
                            '$\\Delta = (' + bl2 + ')^2 - 4(' + al2 + ')(' + cl2 + ') = ' + dl2 + '$'
                        )
                        d2_val, d2_sign = _sign_of(d2s)

                        if d2_sign > 0:
                            sq2 = sp.sqrt(d2s)
                            r1 = sp.simplify((-bv2 - sq2)/(2*av2))
                            r2 = sp.simplify((-bv2 + sq2)/(2*av2))
                            all_solutions.extend([r1, r2])
                            det += '\n\n$\\Delta > 0$ : $x_1=' + sp.latex(r1) + '$, $x_2=' + sp.latex(r2) + '$'
                            factor_details.append({'label': fl, 'type': 'quadratic_2roots',
                                                   'delta': str(d2_val), 'roots': [sp.latex(r1), sp.latex(r2)]})
                        elif d2_sign == 0:
                            r0 = sp.simplify(-bv2/(2*av2))
                            all_solutions.append(r0)
                            det += '\n\n$\\Delta = 0$ : $x_0=' + sp.latex(r0) + '$'
                            factor_details.append({'label': fl, 'type': 'quadratic_double', 'delta': '0', 'roots': [sp.latex(r0)]})
                        else:
                            det += '\n\n$\\Delta < 0$ : aucune solution reelle'
                            factor_details.append({'label': fl, 'type': 'quadratic_no_real',
                                                   'delta': str(d2_val), 'roots': []})
                        sol_details.append(det)

                    elif deg >= 3:
                        try:
                            ss = [s for s in sp.solve(fac, x) if s.is_real]
                            all_solutions.extend(ss)
                            sl = ', '.join('$x=' + sp.latex(s) + '$' for s in ss) or 'aucune solution reelle'
                            sol_details.append('**Facteur degre ' + str(deg) + '** $(' + fl + ') = 0$\n\n' + sl)
                            factor_details.append({'label': fl, 'type': 'degree_' + str(deg), 'roots': [sp.latex(s) for s in ss]})
                        except Exception:
                            pass
            else:
                try:
                    ss = [s for s in sp.solve(f_sym, x) if s.is_real]
                    all_solutions = ss
                    sl = ', '.join(sp.latex(s) for s in ss) if ss else 'aucune solution reelle'
                    sol_details.append('Resolution directe : ' + sl)
                except Exception:
                    pass

            if sol_details:
                steps.append('**Etape 4 - Resolution de chaque facteur**\n\n' + '\n\n---\n\n'.join(sol_details))

        # ── Conclusion ────────────────────────────────────────────────
        seen_k = set()
        unique_sols = []
        for s in all_solutions:
            k = str(sp.simplify(s))
            if k not in seen_k:
                seen_k.add(k)
                unique_sols.append(s)

        valid_sols = []
        forbidden_set = {round(p, 8) for p in forbidden_pts}
        for s in unique_sols:
            try:
                sv = round(float(s.evalf()), 8)
                if sv in forbidden_set: continue
                if domain_set != sp.S.Reals and not domain_set.contains(s): continue
            except Exception:
                pass
            valid_sols.append(s)

        if valid_sols:
            sll = [sp.latex(s) for s in valid_sols]
            sol_set = ('x = ' + sll[0]) if len(sll) == 1 else \
                      'S = \\left\\{ ' + ' \\; ; \\; '.join(sll) + ' \\right\\}'
            steps.append('**Conclusion**\n\n$\\boxed{' + sol_set + '}$')
        else:
            sol_set = 'S = \\emptyset'
            steps.append('**Conclusion**\n\n$\\boxed{S = \\emptyset}$ - Aucune solution reelle dans $D_f$.')

        return jsonify({
            'success': True,
            'domain_latex': domain_latex,
            'forbidden_points': [fmt(p) for p in forbidden_pts],
            'equation_latex': eq_disp,
            'f_expr_latex': f_latex,
            'factored_latex': fact_latex,
            'factor_details': factor_details,
            'solution_set_latex': sol_set,
            'solutions': [sp.latex(s) for s in valid_sols],
            'solutions_approx': [_safe_approx(s) for s in valid_sols],
            'steps': steps,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()
        }), 500


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
        
        # Rétablissement des multiplications implicites (ex: 2x -> 2*x)
        raw = re.sub(r'(\d)\s*([a-zA-Z])', r'\1*\2', raw)
        raw = re.sub(r'\)\s*\(', r')*(', raw)
        raw = re.sub(r'([x-zX-Z])\s*\(', r'\1*(', raw)
        raw = re.sub(r'(\d)\s*\(', r'\1*(', raw)
        raw = re.sub(r'\)\s*([a-zA-Z])', r')*\1', raw)

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

