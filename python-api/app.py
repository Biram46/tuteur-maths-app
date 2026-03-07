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
    """Formate un nombre pour l'affichage."""
    try:
        f = float(v.evalf()) if hasattr(v, 'evalf') else float(v)
    except:
        return str(v)
    if abs(f - round(f)) < 1e-9:
        return str(int(round(f)))
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
# EXTRACTION DES FACTEURS POLYNOMIAUX
# ─────────────────────────────────────────────────────────────

def get_polynomial_factors(poly_expr, role):
    """Factorise un polynôme et retourne les facteurs + coefficient constant."""
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

    if p.degree() == 0:
        const_val = float(poly_simplified.evalf()) if hasattr(poly_simplified, 'evalf') else float(poly_simplified)
        return [], const_val

    fl = sp.factor_list(sp.expand(poly_simplified))
    const_coeff = float(fl[0].evalf()) if hasattr(fl[0], 'evalf') else float(fl[0])
    factors = []

    for (fac, mult) in fl[1]:
        try:
            deg = sp.degree(fac, x)
        except:
            continue
        if deg == 0:
            continue

        if deg == 1:
            z = sp.solve(fac, x)
            z = z[0] if z else None
            factors.append({
                'label': str(sp.expand(fac)), 'degree': 1,
                'zeros': [z] if z is not None else [],
                'role': role, 'delta_steps': None,
            })
        elif deg == 2:
            coeffs = sp.Poly(fac, x).all_coeffs()
            a_c = coeffs[0]
            b_c = coeffs[1] if len(coeffs) > 1 else sp.Integer(0)
            c_c = coeffs[2] if len(coeffs) > 2 else sp.Integer(0)
            delta = sp.expand(b_c**2 - 4 * a_c * c_c)
            ds = sp.nsimplify(delta, rational=True)
            df = float(delta.evalf())

            if df > 1e-10:
                sd = sp.sqrt(delta)
                z1 = sp.nsimplify((-b_c - sd) / (2 * a_c))
                z2 = sp.nsimplify((-b_c + sd) / (2 * a_c))
                zeros = sorted([z1, z2], key=lambda z: float(z.evalf()))
                steps = [
                    f'$\\Delta = ({sp.latex(b_c)})^2 - 4\\times({sp.latex(a_c)})\\times({sp.latex(c_c)}) = {sp.latex(ds)}$',
                    f'$\\Delta > 0$ : $x_1={sp.latex(zeros[0])}$, $x_2={sp.latex(zeros[1])}$',
                    f'Signe de $a={sp.latex(a_c)}$ : trinôme {"négatif" if float(a_c.evalf()) > 0 else "positif"} entre les racines.',
                ]
            elif abs(df) < 1e-10:
                x0 = sp.nsimplify(-b_c / (2 * a_c))
                zeros = [x0, x0]
                steps = [f'$\\Delta=0$, racine double $x_0={sp.latex(x0)}$']
            else:
                zeros = []
                steps = [f'$\\Delta={sp.latex(ds)}<0$ : pas de racine réelle.']

            factors.append({
                'label': str(sp.expand(fac)), 'degree': 2,
                'zeros': zeros, 'role': role, 'delta_steps': steps,
            })
        else:
            rz = sorted([s for s in sp.solve(fac, x) if s.is_real], key=float)
            factors.append({
                'label': str(fac), 'degree': int(deg),
                'zeros': rz, 'role': role, 'delta_steps': None,
            })

    return factors, const_coeff


# ─────────────────────────────────────────────────────────────
# CALCUL DU TABLEAU DE SIGNES
# ─────────────────────────────────────────────────────────────

def compute_sign_table(expression, niveau='terminale_spe'):
    """Calcule le tableau de signes complet d'une expression."""
    # Nettoyer l'expression
    raw = expression.replace('^', '**').replace(',', '.')
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

    # Domaine (pour ln, sqrt)
    domain_left = None
    for f in (num_factors_all + den_factors_all):
        if f.get('type') == 'ln':
            inner = f['expr'].args[0]
            for b in sp.solve(inner, x):
                if b.is_real:
                    bv = float(b.evalf())
                    if domain_left is None or bv > domain_left:
                        domain_left = bv
        elif f.get('type') == 'sqrt':
            pz = [z for z in f['zeros'] if float(z.evalf()) >= -1e-9]
            if pz:
                bv = float(pz[0].evalf())
                if domain_left is None or bv > domain_left:
                    domain_left = bv

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
            all_delta_steps.append({'factor': fi['label'], 'steps': fi['delta_steps']})
    for fi in den_factors_all:
        rows.append({'label': fi['label'], 'values': build_row(fi), 'type': 'denominator'})
        if fi.get('delta_steps'):
            all_delta_steps.append({'factor': fi['label'], 'steps': fi['delta_steps']})

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
    left_label = '-inf' if domain_left is None else fmt(domain_left)
    x_str = ', '.join([left_label] + [fmt(c) for c in critical] + ['+inf'])
    lines = ['table |', f'x: {x_str} |']
    for row in rows:
        lines.append(f"sign: {row['label']} : {', '.join(row['values'])} |")
    lines.append(f"sign: f(x) : {', '.join(fx_vals)} |")
    aaa_block = '@@@\n' + '\n'.join(lines) + '\n@@@'

    return {
        'success': True,
        'aaaBlock': aaa_block,
        'criticalPoints': critical,
        'discriminantSteps': all_delta_steps,
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
