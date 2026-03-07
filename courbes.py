#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════╗
║          COURBES.PY — TRACEUR DE COURBES INTERACTIF         ║
║      Programme déterministe (SymPy + Matplotlib)            ║
║      Interface 100% chat en français                        ║
╚══════════════════════════════════════════════════════════════╝

Modules :
  1. Tracé de courbe (droites, fonctions quelconques)
  2. Se promener sur la courbe (curseur interactif)
  3. Tableau de valeurs
  4. Tangente en un point (≥ Première)
  5. Ajout de courbes supplémentaires
  6. Résolution graphique (équations & inéquations)

Bibliothèques : sympy, matplotlib, numpy, tabulate, scipy
"""

import re
import sys
import numpy as np
import sympy as sp
from sympy import (
    Symbol, sympify, diff, solve, latex, oo,
    sqrt, cos, sin, tan, exp, log, Abs, pi, E,
    Rational, simplify, N, S
)
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations,
    implicit_multiplication_application,
    convert_xor
)
import matplotlib
matplotlib.use('TkAgg')  # Backend interactif
import matplotlib.pyplot as plt
plt.ion()  # Mode interactif non-bloquant (permet de taper dans le terminal pendant que la fenêtre est ouverte)
from matplotlib.lines import Line2D
from tabulate import tabulate

# Tentative d'import scipy (fallback numérique)
try:
    from scipy.optimize import fsolve, brentq
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

# Tentative d'import openai (fallback IA)
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# ─────────────────────────────────────────────────────────────
# SYMBOLE GLOBAL
# ─────────────────────────────────────────────────────────────
x = Symbol('x')

TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

COULEURS = ['#2196F3', '#FF5722', '#4CAF50', '#9C27B0', '#FF9800']
MAX_COURBES = 5

# ─────────────────────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────────────────────

def parse_expression(expr_str: str):
    """Parse une chaîne en expression SymPy."""
    expr_str = expr_str.strip()
    # Nettoyage courant
    expr_str = expr_str.replace('^', '**')
    expr_str = expr_str.replace('²', '**2')
    expr_str = expr_str.replace('³', '**3')
    expr_str = expr_str.replace('√', 'sqrt')
    expr_str = expr_str.replace('ln', 'log')  # SymPy utilise log pour ln
    expr_str = expr_str.replace('π', 'pi')
    # |x| → Abs(x)
    expr_str = re.sub(r'\|([^|]+)\|', r'Abs(\1)', expr_str)

    try:
        return parse_expr(expr_str, local_dict={
            'x': x, 'e': E, 'pi': pi,
            'sin': sin, 'cos': cos, 'tan': tan,
            'exp': exp, 'log': log, 'ln': log,
            'sqrt': sqrt, 'abs': Abs, 'Abs': Abs,
        }, transformations=TRANSFORMATIONS)
    except Exception as ex:
        raise ValueError(f"Expression invalide : « {expr_str} »\nErreur : {ex}")


def sympy_to_numpy(expr):
    """Convertit une expression SymPy en fonction NumPy évaluable."""
    f_lambda = sp.lambdify(x, expr, modules=['numpy'])
    return f_lambda


def is_affine(expr) -> bool:
    """Vérifie si l'expression est affine (ax + b)."""
    try:
        poly = sp.Poly(expr, x)
        return poly.degree() <= 1
    except Exception:
        return False


def format_exact(val) -> str:
    """Formate une valeur SymPy de façon lisible."""
    if val == sp.zoo or val == sp.nan or val == oo or val == -oo:
        return "∄"
    try:
        f = float(val)
        if abs(f - round(f)) < 1e-10:
            return str(int(round(f)))
        # Vérifier si c'est une fraction simple
        r = sp.nsimplify(val, rational=True)
        if r != val and isinstance(r, sp.Rational) and abs(r.q) <= 100:
            return str(r)
        return f"{f:.4g}"
    except Exception:
        return str(val)


# ═════════════════════════════════════════════════════════════
# CLASSE 1 : ChatParser
# ═════════════════════════════════════════════════════════════

class ChatParser:
    """Parse les messages utilisateur en langage naturel."""

    def __init__(self):
        self.niveau = None  # 'seconde', 'premiere', 'terminale'

    def detect_niveau(self, text: str) -> str | None:
        """Détecte le niveau scolaire dans le message."""
        low = text.lower()
        if re.search(r'terminale|tle|term', low):
            return 'terminale'
        if re.search(r'premi[eè]re|1[eè]?re', low):
            return 'premiere'
        if re.search(r'seconde|2nde|2de', low):
            return 'seconde'
        return None

    def parse(self, text: str) -> dict:
        """
        Parse le message et retourne un dict :
        {
            'intent': str,       # trace, tableau, tangente, resoudre, ajouter, effacer, promener, quitter, niveau, aide
            'expression': str,   # expression mathématique
            'interval': tuple,   # (a, b)
            'point': float,      # x₀ pour tangente
            'rhs': str,          # membre droit pour résolution
            'operator': str,     # =, >, <, >=, <=
            'mode_droite': str,  # 'points' ou 'coeff'
            'extra': dict,       # données supplémentaires
        }
        """
        low = text.lower().strip()
        result = {
            'intent': None,
            'expression': None,
            'interval': None,
            'point': None,
            'rhs': None,
            'operator': None,
            'mode_droite': None,
            'extra': {},
        }

        # ── Commandes spéciales ──
        if low in ('quit', 'quitter', 'exit', 'q', 'sortir'):
            result['intent'] = 'quitter'
            return result

        if low in ('aide', 'help', '?', 'commandes'):
            result['intent'] = 'aide'
            return result

        if re.search(r'efface|réinitialise|reset|clear|nettoie', low):
            result['intent'] = 'effacer'
            return result

        if re.search(r'promen|balade|curseur|explore|interactif|souris', low):
            result['intent'] = 'promener'
            return result

        # ── Détection niveau ──
        niv = self.detect_niveau(text)
        if niv:
            self.niveau = niv
            # Si c'est juste un changement de niveau
            if re.search(r'^(je suis en |niveau |classe |en )', low):
                result['intent'] = 'niveau'
                return result

        # ── INTERSECTION (avant résolution) ──
        if re.search(r'intersection|intersect|se\s+coup|crois|point\s*commun|o[u\u00f9]\s+se\s+(coup|crois)', low):
            result['intent'] = 'intersection'
            self._extract_interval(text, result)
            return result

        # ── RÉSOLUTION (avant trace car "résous f(x) = ..." contient "f(x)")
        m_resoudre = re.search(
            r'(?:résou|resou|solve|résolution|resolution|résoudre graphiquement)',
            low
        )
        if m_resoudre:
            result['intent'] = 'resoudre'
            self._extract_equation(text, result)
            self._extract_interval(text, result)
            return result

        # ── TANGENTE ──
        m_tangente = re.search(
            r'tangente|tangent',
            low
        )
        if m_tangente:
            result['intent'] = 'tangente'
            # Extraire le point
            m_pt = re.search(r'(?:en\s+)?x\s*=\s*([+-]?\d+(?:\.\d+)?)', text)
            if m_pt:
                result['point'] = float(m_pt.group(1))
            else:
                m_pt2 = re.search(r'en\s+([+-]?\d+(?:\.\d+)?)', text)
                if m_pt2:
                    result['point'] = float(m_pt2.group(1))
            self._extract_expression(text, result)
            self._extract_interval(text, result)
            return result

        # ── TABLEAU DE VALEURS ──
        if re.search(r'tableau|table|valeurs', low):
            result['intent'] = 'tableau'
            self._extract_expression(text, result)
            self._extract_interval(text, result)
            return result

        # ── AJOUT DE COURBE ──
        if re.search(r'ajoute|rajoute|superpose|ajout', low):
            result['intent'] = 'ajouter'
            self._extract_expression(text, result)
            self._extract_interval(text, result)
            return result

        # ── TRACÉ (défaut si on détecte une expression) ──
        if re.search(r'trace|tracer|dessine|courbe|graphe|plot|graphique|représent', low):
            result['intent'] = 'trace'
            self._extract_expression(text, result)
            self._extract_interval(text, result)
            return result

        # ── FALLBACK : si on trouve une expression, on trace ──
        self._extract_expression(text, result)
        if result['expression']:
            result['intent'] = 'trace'
            self._extract_interval(text, result)
            return result

        result['intent'] = 'inconnu'
        return result

    def _extract_expression(self, text: str, result: dict):
        """Extrait l'expression mathématique du texte."""
        # Pattern: f(x) = ... ou g(x) = ... ou y = ...
        m = re.search(r'(?:[fghFGH]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)(?:\s+(?:sur|pour|entre|de|dans|from|on)\s|$)', text)
        if m:
            result['expression'] = m.group(1).strip().rstrip('.')
            # Extraire le nom de la fonction
            m_name = re.search(r'([fghFGH])\s*\(\s*x\s*\)', text)
            if m_name:
                result['extra']['func_name'] = m_name.group(1)
            return

        # Pattern: "trace x^2 + 3x - 1" (expression directe après verbe)
        m2 = re.search(
            r'(?:trace|tracer|dessine|ajoute|rajoute)\s+(?:la\s+(?:courbe|fonction)\s+(?:de\s+)?)?(.+?)(?:\s+(?:sur|pour|entre|de\s+-?\d|dans)\s|$)',
            text, re.IGNORECASE
        )
        if m2:
            expr = m2.group(1).strip().rstrip('.')
            # Nettoyer les préfixes
            expr = re.sub(r'^(?:de\s+)?(?:f|g|h)\s*\(x\)\s*=\s*', '', expr)
            if expr:
                result['expression'] = expr
                return

        # Dernier recours : chercher une expression mathématique dans le texte
        m3 = re.search(r'(?:de\s+|pour\s+)?([x\d\s+\-*/^²³√()sincotaexplogln.|]+x[x\d\s+\-*/^²³√()sincotaexplogln.|]*)', text)
        if m3:
            expr = m3.group(1).strip()
            if len(expr) >= 1:
                result['expression'] = expr

    def _extract_interval(self, text: str, result: dict):
        """Extrait l'intervalle du texte."""
        # "sur [-5, 5]" ou "entre -5 et 5" ou "de -5 à 5"
        m = re.search(r'\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]', text)
        if m:
            result['interval'] = (float(m.group(1)), float(m.group(2)))
            return

        m2 = re.search(r'(?:entre|from|de)\s+([+-]?\d+(?:\.\d+)?)\s+(?:et|à|to|and)\s+([+-]?\d+(?:\.\d+)?)', text)
        if m2:
            result['interval'] = (float(m2.group(1)), float(m2.group(2)))
            return

        m3 = re.search(r'(?:sur|pour)\s+x\s*(?:∈|in|dans)\s*\[?\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)', text)
        if m3:
            result['interval'] = (float(m3.group(1)), float(m3.group(2)))

    def _extract_equation(self, text: str, result: dict):
        """Extrait une équation/inéquation : f(x) OP g(x) ou constante."""
        # Chercher l'opérateur
        ops = [('>=', '>='), ('<=', '<='), ('≥', '>='), ('≤', '<='),
               ('>', '>'), ('<', '<'), ('=', '=')]

        for op_text, op_val in ops:
            # Pattern: expression OP expression
            pattern = re.escape(op_text)
            m = re.search(
                r'(?:[fghFGH]\s*\(\s*x\s*\)\s*=\s*)?(.+?)\s*' + pattern + r'\s*(.+?)(?:\s+(?:sur|pour|entre)\s|$)',
                text
            )
            if m:
                lhs = m.group(1).strip()
                rhs = m.group(2).strip().rstrip('.')
                # Nettoyer le lhs
                lhs = re.sub(r'^(?:résou\w*\s+(?:graphiquement\s+)?)', '', lhs, flags=re.IGNORECASE).strip()
                lhs = re.sub(r'^(?:f|g|h)\s*\(\s*x\s*\)\s*=\s*', '', lhs).strip()
                if lhs:
                    result['expression'] = lhs
                    result['rhs'] = rhs
                    result['operator'] = op_val
                    return

        # Fallback : juste une expression
        self._extract_expression(text, result)


# ═════════════════════════════════════════════════════════════
# CLASSE 2 : CourbeTraceur
# ═════════════════════════════════════════════════════════════

class CourbeTraceur:
    """Gère le tracé des courbes et l'interactivité souris."""

    def __init__(self):
        self.courbes = []      # Liste de {expr, f_np, nom, couleur, interval}
        self.fig = None
        self.ax = None
        self._annotation = None
        self._point_mobile = None
        self._cid = None

    def reset(self):
        """Efface toutes les courbes."""
        self.courbes.clear()
        if self.fig:
            plt.close(self.fig)
            self.fig = None
            self.ax = None
        print("🗑️  Graphique réinitialisé.")

    def ajouter_courbe(self, expr, nom: str = None, interval=(-10, 10)):
        """Ajoute une courbe à la liste."""
        if len(self.courbes) >= MAX_COURBES:
            print(f"⚠️  Maximum {MAX_COURBES} courbes atteint. Tapez « efface » pour recommencer.")
            return False

        f_np = sympy_to_numpy(expr)
        idx = len(self.courbes)
        couleur = COULEURS[idx % len(COULEURS)]
        nom = nom or f"f_{idx+1}(x) = {expr}"

        self.courbes.append({
            'expr': expr,
            'f_np': f_np,
            'nom': nom,
            'couleur': couleur,
            'interval': interval,
        })
        return True

    def tracer(self, interactive=False):
        """Trace toutes les courbes."""
        if not self.courbes:
            print("\u26a0\ufe0f  Aucune courbe \u00e0 tracer.")
            return

        if self.fig:
            plt.close(self.fig)

        self.fig, self.ax = plt.subplots(figsize=(10, 6))
        self.ax.set_facecolor('#0f172a')
        self.fig.patch.set_facecolor('#0f172a')

        # D\u00e9terminer l'intervalle global
        a_min = min(c['interval'][0] for c in self.courbes)
        b_max = max(c['interval'][1] for c in self.courbes)

        for courbe in self.courbes:
            a, b = courbe['interval']
            xs = np.linspace(a, b, 1000)

            with np.errstate(divide='ignore', invalid='ignore'):
                ys = courbe['f_np'](xs)

            # Filtrer les valeurs aberrantes
            if isinstance(ys, np.ndarray):
                mask = np.isfinite(ys) & (np.abs(ys) < 1e6)
                ys_clean = np.where(mask, ys, np.nan)
            else:
                ys_clean = np.full_like(xs, float(ys))

            self.ax.plot(xs, ys_clean, color=courbe['couleur'],
                        linewidth=2.5, label=courbe['nom'], zorder=3)

        # Style
        self.ax.axhline(y=0, color='white', linewidth=0.5, alpha=0.3)
        self.ax.axvline(x=0, color='white', linewidth=0.5, alpha=0.3)
        self.ax.grid(True, alpha=0.15, color='white')
        self.ax.set_xlabel('x', color='white', fontsize=12)
        self.ax.set_ylabel('y', color='white', fontsize=12)
        self.ax.tick_params(colors='white')
        for spine in self.ax.spines.values():
            spine.set_color('#334155')

        if len(self.courbes) > 1:
            legend = self.ax.legend(
                facecolor='#1e293b', edgecolor='#334155',
                fontsize=10, loc='best'
            )
            for text in legend.get_texts():
                text.set_color('white')

        self.ax.set_title(
            self.courbes[0]['nom'] if len(self.courbes) == 1 else "Graphique multi-courbes",
            color='cyan', fontsize=14, fontweight='bold', pad=15
        )

        if interactive:
            self._activer_curseur()

        plt.tight_layout()

        if interactive:
            # Mode curseur : bloquant pour garder le focus sur la fen\u00eatre
            plt.show(block=True)
        else:
            # Mode normal : non-bloquant pour permettre d'ajouter des courbes
            self.fig.show()
            self.fig.canvas.flush_events()
            plt.pause(0.1)

    def _activer_curseur(self):
        """Active le curseur interactif sur la courbe."""
        if not self.courbes:
            return

        # Point mobile rouge
        self._point_mobile, = self.ax.plot([], [], 'o', color='red',
                                           markersize=8, zorder=10)

        # Annotation
        self._annotation = self.ax.annotate(
            '', xy=(0, 0), xytext=(15, 15),
            textcoords='offset points',
            bbox=dict(boxstyle='round,pad=0.5', fc='#1e293b', ec='cyan', alpha=0.9),
            color='white', fontsize=10, fontweight='bold',
            arrowprops=dict(arrowstyle='->', color='cyan', lw=1.5)
        )
        self._annotation.set_visible(False)

        self._cid = self.fig.canvas.mpl_connect('motion_notify_event', self._on_mouse_move)

        print("🖱️  Mode interactif activé ! Déplacez la souris sur la courbe.")
        print("   Fermez la fenêtre pour revenir au chat.")

    def _on_mouse_move(self, event):
        """Gère le mouvement de la souris."""
        if event.inaxes != self.ax or not self.courbes:
            if self._annotation:
                self._annotation.set_visible(False)
            if self._point_mobile:
                self._point_mobile.set_data([], [])
            self.fig.canvas.draw_idle()
            return

        mouse_x = event.xdata

        # Trouver la courbe la plus proche
        best_y = None
        best_name = ""
        best_dist = float('inf')

        for courbe in self.courbes:
            try:
                y_val = float(courbe['expr'].subs(x, mouse_x))
                if np.isfinite(y_val):
                    dist = abs(y_val - event.ydata) if event.ydata else abs(y_val)
                    if dist < best_dist:
                        best_dist = dist
                        best_y = y_val
                        best_name = courbe['nom'].split('=')[0].strip() if '=' in courbe['nom'] else ""
            except Exception:
                continue

        if best_y is not None and np.isfinite(best_y):
            self._point_mobile.set_data([mouse_x], [best_y])
            label = f"x = {mouse_x:.3f}\ny = {best_y:.3f}"
            self._annotation.xy = (mouse_x, best_y)
            self._annotation.set_text(label)
            self._annotation.set_visible(True)
        else:
            self._annotation.set_visible(False)
            self._point_mobile.set_data([], [])

        self.fig.canvas.draw_idle()

    def tracer_tangente(self, expr, x0: float, interval=(-10, 10)):
        """Trace la tangente à la courbe en x0."""
        fp = diff(expr, x)
        m = float(fp.subs(x, x0))
        y0 = float(expr.subs(x, x0))
        p = y0 - m * x0

        # Équation tangente
        tangente_expr = m * x + p
        tangente_np = sympy_to_numpy(tangente_expr)

        a, b = interval
        xs = np.linspace(a, b, 500)

        with np.errstate(divide='ignore', invalid='ignore'):
            ys_t = tangente_np(xs)

        # Tracer
        if not self.fig or not plt.fignum_exists(self.fig.number):
            self.tracer()

        self.ax.plot(xs, ys_t, '--', color='#FF5722', linewidth=2, alpha=0.8,
                    label=f"T(x) = {format_exact(sp.nsimplify(m))}x + {format_exact(sp.nsimplify(p))}")
        self.ax.plot(x0, y0, 'o', color='red', markersize=10, zorder=10)
        self.ax.annotate(
            f'({format_exact(sp.nsimplify(x0))}, {format_exact(sp.nsimplify(y0))})',
            xy=(x0, y0), xytext=(10, 15),
            textcoords='offset points',
            color='white', fontsize=10, fontweight='bold',
            bbox=dict(boxstyle='round', fc='#FF5722', alpha=0.7),
        )

        legend = self.ax.legend(
            facecolor='#1e293b', edgecolor='#334155', fontsize=10
        )
        for t in legend.get_texts():
            t.set_color('white')

        self.fig.canvas.draw()
        plt.show(block=False)

        return m, p, y0

    def tracer_resolution(self, expr_f, expr_g, solutions, operator='=', interval=(-10, 10)):
        """Trace f, g et les points d'intersection / zones + flèches + positions relatives."""
        # S'assurer qu'on a un graphique
        if not self.fig or not plt.fignum_exists(self.fig.number):
            self.courbes.clear()
            self.ajouter_courbe(expr_f, f"f(x) = {expr_f}", interval)
            g_is_const = not expr_g.free_symbols
            g_label = f"y = {expr_g}" if g_is_const else f"g(x) = {expr_g}"
            self.ajouter_courbe(expr_g, g_label, interval)
            self.tracer()

        a, b = interval
        xs = np.linspace(a, b, 1000)
        f_np = sympy_to_numpy(expr_f)
        g_np = sympy_to_numpy(expr_g)

        with np.errstate(divide='ignore', invalid='ignore'):
            ys_f = f_np(xs)
            ys_g = g_np(xs)

        # ── 1. Marquer les points d'intersection + flèches vers l'axe des x ──
        sol_x_vals = []
        for sol in solutions:
            try:
                sx = float(sol)
                sy = float(expr_f.subs(x, sol))
                if np.isfinite(sx) and np.isfinite(sy):
                    sol_x_vals.append(sx)

                    # Croix dorée au point d'intersection
                    self.ax.plot(sx, sy, 'x', color='#FFD700', markersize=15,
                                markeredgewidth=3, zorder=10)

                    # Label du point
                    self.ax.annotate(
                        f'({format_exact(sol)}, {format_exact(expr_f.subs(x, sol))})',
                        xy=(sx, sy), xytext=(10, 18),
                        textcoords='offset points',
                        color='white', fontsize=9, fontweight='bold',
                        bbox=dict(boxstyle='round', fc='#FFD700', ec='#FFD700', alpha=0.8),
                    )

                    # ── Flèche verticale du point vers l'axe des x ──
                    self.ax.annotate(
                        '', xy=(sx, 0), xycoords='data',
                        xytext=(sx, sy), textcoords='data',
                        arrowprops=dict(
                            arrowstyle='->', color='#FFD700',
                            lw=1.5, ls='--', shrinkA=5, shrinkB=3
                        )
                    )

                    # ── Marqueur + label de l'abscisse sur l'axe des x ──
                    self.ax.plot(sx, 0, 'D', color='#FFD700', markersize=7, zorder=10)
                    self.ax.annotate(
                        f'x = {format_exact(sol)}',
                        xy=(sx, 0), xytext=(0, -22),
                        textcoords='offset points',
                        color='#FFD700', fontsize=9, fontweight='bold',
                        ha='center',
                        bbox=dict(boxstyle='round,pad=0.3', fc='#1e293b', ec='#FFD700', alpha=0.9),
                    )
            except Exception:
                continue

        # ── 2. Positions relatives + coloration des zones ──
        sol_sorted = sorted(sol_x_vals)
        bornes = [a] + sol_sorted + [b]

        # Couleurs pour les zones
        COLOR_F_ABOVE = '#4CAF50'   # Vert : f > g
        COLOR_G_ABOVE = '#E91E63'   # Rose : g > f

        mask_valid = np.isfinite(ys_f) & np.isfinite(ys_g)

        for i in range(len(bornes) - 1):
            left, right = bornes[i], bornes[i + 1]
            mid = (left + right) / 2

            # Évaluer qui est au-dessus
            try:
                f_mid = float(expr_f.subs(x, mid))
                g_mid = float(expr_g.subs(x, mid))
            except Exception:
                continue

            if not (np.isfinite(f_mid) and np.isfinite(g_mid)):
                continue

            f_above = f_mid > g_mid + 1e-10
            g_above = g_mid > f_mid + 1e-10

            if f_above or g_above:
                color = COLOR_F_ABOVE if f_above else COLOR_G_ABOVE

                # Zone colorée entre les courbes
                zone_mask = (xs >= left) & (xs <= right) & mask_valid
                self.ax.fill_between(
                    xs, ys_f, ys_g,
                    where=zone_mask,
                    alpha=0.15, color=color, zorder=1
                )

                # ── Colorer l'intervalle sur l'axe des x ──
                self.ax.plot(
                    [left, right], [0, 0],
                    linewidth=6, color=color, alpha=0.7,
                    solid_capstyle='round', zorder=8
                )

        # ── Légende des positions relatives ──
        from matplotlib.patches import Patch
        legend_elements = list(self.ax.get_legend_handles_labels()[0])
        legend_labels = list(self.ax.get_legend_handles_labels()[1])

        legend_elements.append(Patch(facecolor=COLOR_F_ABOVE, alpha=0.4))
        legend_labels.append('f(x) > g(x)')
        legend_elements.append(Patch(facecolor=COLOR_G_ABOVE, alpha=0.4))
        legend_labels.append('f(x) < g(x)')
        legend_elements.append(Line2D([0], [0], marker='x', color='#FFD700',
                                      linestyle='None', markersize=10, markeredgewidth=2))
        legend_labels.append('Intersections')

        legend = self.ax.legend(
            legend_elements, legend_labels,
            facecolor='#1e293b', edgecolor='#334155', fontsize=9, loc='best'
        )
        for t in legend.get_texts():
            t.set_color('white')

        self.fig.canvas.draw()
        self.fig.canvas.flush_events()
        plt.pause(0.1)

    def analyser_positions_relatives(self, expr_f, expr_g, solutions, interval=(-10, 10),
                                     nom_f="f", nom_g="g"):
        """Affiche dans le chat l'analyse des positions relatives."""
        sol_sorted = sorted([float(s) for s in solutions])
        a, b = interval
        bornes = [a] + sol_sorted + [b]

        print(f"\n📊 Positions relatives de {nom_f}(x) et {nom_g}(x) :")
        print(f"   ─────────────────────────────────────")

        for i in range(len(bornes) - 1):
            left, right = bornes[i], bornes[i + 1]
            mid = (left + right) / 2

            try:
                f_mid = float(expr_f.subs(x, mid))
                g_mid = float(expr_g.subs(x, mid))
            except Exception:
                continue

            left_str = format_exact(sp.nsimplify(left)) if left != a else str(left)
            right_str = format_exact(sp.nsimplify(right)) if right != b else str(right)

            if f_mid > g_mid + 1e-10:
                print(f"   Sur ]{left_str} ; {right_str}[ : {nom_f}(x) > {nom_g}(x)  (🟢 {nom_f} au-dessus)")
            elif g_mid > f_mid + 1e-10:
                print(f"   Sur ]{left_str} ; {right_str}[ : {nom_f}(x) < {nom_g}(x)  (🔴 {nom_g} au-dessus)")
            else:
                print(f"   Sur ]{left_str} ; {right_str}[ : {nom_f}(x) = {nom_g}(x)  (confondues)")

        # Résumé des ensembles solutions
        intervals_f_above = []
        intervals_g_above = []
        for i in range(len(bornes) - 1):
            left, right = bornes[i], bornes[i + 1]
            mid = (left + right) / 2
            try:
                f_mid = float(expr_f.subs(x, mid))
                g_mid = float(expr_g.subs(x, mid))
            except Exception:
                continue

            l_str = format_exact(sp.nsimplify(left))
            r_str = format_exact(sp.nsimplify(right))
            if f_mid > g_mid + 1e-10:
                intervals_f_above.append(f"]{l_str} ; {r_str}[")
            elif g_mid > f_mid + 1e-10:
                intervals_g_above.append(f"]{l_str} ; {r_str}[")

        print()
        if intervals_f_above:
            print(f"   🟢 {nom_f}(x) > {nom_g}(x) sur : {' ∪ '.join(intervals_f_above)}")
        if intervals_g_above:
            print(f"   🔴 {nom_f}(x) < {nom_g}(x) sur : {' ∪ '.join(intervals_g_above)}")
        print()


# ═════════════════════════════════════════════════════════════
# CLASSE 3 : TableauValeurs
# ═════════════════════════════════════════════════════════════

class TableauValeurs:
    """Génère des tableaux de valeurs avec SymPy et tabulate."""

    @staticmethod
    def generer(expr, interval=(-5, 5), nb_valeurs=None, est_affine=False):
        """
        Génère et affiche un tableau de valeurs.
        Pour les droites : 2 valeurs seulement.
        """
        a, b = interval

        if est_affine:
            # Droite : 2 points significatifs
            x_vals = [a, b]
            print(f"\n📏 Fonction affine détectée → 2 points significatifs")
        else:
            # Fonction quelconque : 5 à 10 valeurs
            if nb_valeurs is None:
                span = b - a
                if span <= 5:
                    nb_valeurs = 6
                elif span <= 10:
                    nb_valeurs = 8
                else:
                    nb_valeurs = 10

            # Valeurs entières de préférence
            x_int = list(range(int(np.ceil(a)), int(np.floor(b)) + 1))
            if len(x_int) >= nb_valeurs:
                # Prendre des valeurs régulièrement espacées parmi les entiers
                step = max(1, len(x_int) // nb_valeurs)
                x_vals = x_int[::step][:nb_valeurs]
            elif len(x_int) >= 3:
                x_vals = x_int
            else:
                x_vals = [round(v, 2) for v in np.linspace(a, b, nb_valeurs)]

        # Calculer les valeurs
        y_vals = []
        for xv in x_vals:
            try:
                yv = expr.subs(x, xv)
                y_vals.append(format_exact(yv))
            except Exception:
                y_vals.append("∄")

        # Affichage avec tabulate
        headers = ["x"] + [str(v) for v in x_vals]
        row = ["f(x)"] + y_vals
        table = tabulate([row], headers=headers, tablefmt='fancy_grid',
                        stralign='center', numalign='center')

        print(f"\n📋 Tableau de valeurs de f(x) = {expr}")
        print(table)
        print()


# ═════════════════════════════════════════════════════════════
# CLASSE 4 : Tangente
# ═════════════════════════════════════════════════════════════

class Tangente:
    """Calcul et tracé de la tangente en un point."""

    @staticmethod
    def calculer(expr, x0: float, niveau: str = None):
        """
        Calcule la tangente en x0.
        Bloqué si niveau = seconde.
        """
        if niveau == 'seconde':
            print("\n❌ La tangente est au programme de Première.")
            print("   Pas disponible pour toi encore ! 📚")
            return None

        try:
            fp = diff(expr, x)
            m_exact = fp.subs(x, x0)
            m = float(m_exact)
            y0_exact = expr.subs(x, x0)
            y0 = float(y0_exact)
            p_exact = y0_exact - m_exact * x0
            p = float(p_exact)

            print(f"\n📐 Tangente à f(x) = {expr} en x = {x0}")
            print(f"   ─────────────────────────────────────")
            print(f"   f'(x)  = {fp}")
            print(f"   f'({x0}) = {format_exact(m_exact)} (coefficient directeur)")
            print(f"   f({x0})  = {format_exact(y0_exact)} (ordonnée du point)")
            print(f"   p = f({x0}) - f'({x0})·{x0} = {format_exact(p_exact)}")
            print(f"\n   ✅ Équation de la tangente :")
            print(f"   T(x) = {format_exact(m_exact)}x + {format_exact(p_exact)}")
            print()

            return {'m': m, 'p': p, 'y0': y0, 'm_exact': m_exact, 'p_exact': p_exact}
        except Exception as e:
            print(f"\n❌ Erreur calcul tangente : {e}")
            return None


# ═════════════════════════════════════════════════════════════
# CLASSE 5 : ResolutionGraphique
# ═════════════════════════════════════════════════════════════

class ResolutionGraphique:
    """Résolution graphique d'équations et inéquations."""

    @staticmethod
    def resoudre_equation(expr_f, expr_g, interval=(-10, 10)):
        """
        Résout f(x) = g(x) ou f(x) = constante.
        1) SymPy (exact)
        2) SciPy (numérique)
        3) IA (fallback)
        """
        equation = expr_f - expr_g

        # ── Tentative 1 : SymPy ──
        try:
            solutions = solve(equation, x)
            # Filtrer les solutions réelles dans l'intervalle
            real_sols = []
            for s in solutions:
                try:
                    sv = complex(s)
                    if abs(sv.imag) < 1e-10:
                        val = sv.real
                        if interval[0] - 0.01 <= val <= interval[1] + 0.01:
                            real_sols.append(s)
                except (TypeError, ValueError):
                    # Solution symbolique, on la garde
                    real_sols.append(s)

            if real_sols:
                print(f"\n🔍 Résolution de f(x) = g(x) [SymPy - exact]")
                print(f"   Équation : {expr_f} = {expr_g}")
                print(f"   ─────────────────────────────────────")
                for i, s in enumerate(real_sols, 1):
                    y_val = expr_f.subs(x, s)
                    print(f"   x{i} = {format_exact(s)}  →  f(x{i}) = {format_exact(y_val)}")
                print()
                return real_sols

        except Exception:
            pass

        # ── Tentative 2 : SciPy (numérique) ──
        if HAS_SCIPY:
            try:
                print(f"\n🔧 SymPy n'a pas trouvé de solution exacte, tentative numérique...")
                f_num = sympy_to_numpy(equation)
                a, b = interval

                # Scanner pour trouver les changements de signe
                xs_scan = np.linspace(a, b, 10000)
                with np.errstate(all='ignore'):
                    ys_scan = f_num(xs_scan)

                # Trouver les changements de signe
                solutions = []
                for i in range(len(ys_scan) - 1):
                    if np.isfinite(ys_scan[i]) and np.isfinite(ys_scan[i+1]):
                        if ys_scan[i] * ys_scan[i+1] < 0:
                            try:
                                sol = brentq(f_num, xs_scan[i], xs_scan[i+1])
                                # Éviter les doublons
                                if not any(abs(sol - s) < 1e-6 for s in solutions):
                                    solutions.append(sol)
                            except Exception:
                                pass

                if solutions:
                    sols_sympy = [sp.nsimplify(s, rational=True) for s in solutions]
                    print(f"\n🔍 Résolution de f(x) = g(x) [SciPy - numérique]")
                    print(f"   Équation : {expr_f} = {expr_g}")
                    print(f"   ─────────────────────────────────────")
                    for i, (s_num, s_sym) in enumerate(zip(solutions, sols_sympy), 1):
                        y_val = expr_f.subs(x, s_sym)
                        print(f"   x{i} ≈ {s_num:.6f}  →  f(x{i}) ≈ {float(y_val):.6f}")
                    print()
                    return sols_sympy

            except Exception:
                pass

        # ── Tentative 3 : IA (fallback) ──
        print("\n🤖 Je ne trouve pas de solution algorithmique, je consulte l'IA...")
        if HAS_OPENAI:
            try:
                response = openai.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{
                        "role": "user",
                        "content": f"Résous l'équation {expr_f} = {expr_g} pour x réel. Donne les solutions exactes."
                    }]
                )
                print(f"   {response.choices[0].message.content}")
            except Exception as e:
                print(f"   ❌ Erreur IA : {e}")
        else:
            print("   ⚠️  Module openai non installé. Résolution impossible.")

        return []

    @staticmethod
    def resoudre_inequation(expr_f, expr_g, operator: str, interval=(-10, 10)):
        """
        Résout f(x) > g(x), f(x) >= g(x), etc.
        Retourne les intervalles solutions.
        """
        diff_expr = expr_f - expr_g

        print(f"\n🔍 Résolution de f(x) {operator} g(x)")
        print(f"   {expr_f} {operator} {expr_g}")
        print(f"   ─────────────────────────────────────")

        # Trouver les points d'intersection (bornes des intervalles)
        solutions = ResolutionGraphique.resoudre_equation(expr_f, expr_g, interval)

        # Construire les intervalles
        a, b = interval
        bornes = sorted([float(s) for s in solutions if a <= float(s) <= b])
        bornes = [a] + bornes + [b]

        intervals_sol = []
        f_num = sympy_to_numpy(diff_expr)

        for i in range(len(bornes) - 1):
            mid = (bornes[i] + bornes[i+1]) / 2
            try:
                val = f_num(mid)
                if np.isfinite(val):
                    if operator in ('>', '>=') and val > 0:
                        intervals_sol.append((bornes[i], bornes[i+1]))
                    elif operator in ('<', '<=') and val < 0:
                        intervals_sol.append((bornes[i], bornes[i+1]))
            except Exception:
                continue

        if intervals_sol:
            # Formatage des intervalles
            parts = []
            for ia, ib in intervals_sol:
                left = '-∞' if ia == a else format_exact(sp.nsimplify(ia))
                right = '+∞' if ib == b else format_exact(sp.nsimplify(ib))
                if operator in ('>=', '<='):
                    parts.append(f"[{left} ; {right}]")
                else:
                    parts.append(f"]{left} ; {right}[")

            ensemble = " ∪ ".join(parts)
            print(f"\n   ✅ Ensemble solution : S = {ensemble}")
        else:
            print(f"\n   ∅ Pas de solution sur [{a}, {b}].")

        print()
        return intervals_sol, solutions


# ═════════════════════════════════════════════════════════════
# BOUCLE PRINCIPALE
# ═════════════════════════════════════════════════════════════

def afficher_aide():
    """Affiche l'aide."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    📖 AIDE — COMMANDES                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📊 TRACER UNE COURBE                                       ║
║    "Trace f(x) = x^2 - 3x + 1"                              ║
║    "Trace x^3 - 2x sur [-5, 5]"                             ║
║    "Dessine sin(x) entre -pi et pi"                          ║
║                                                              ║
║  📋 TABLEAU DE VALEURS                                       ║
║    "Tableau de valeurs pour x entre -3 et 3"                 ║
║    "Tableau de x^2 sur [-5, 5]"                              ║
║                                                              ║
║  📐 TANGENTE (≥ Première)                                    ║
║    "Trace la tangente en x = 2"                              ║
║    "Tangente de x^3 en x = 1"                                ║
║                                                              ║
║  ➕ AJOUTER UNE COURBE                                       ║
║    "Ajoute g(x) = 2x + 1"                                   ║
║                                                              ║
║  🔍 RÉSOLUTION                                               ║
║    "Résous f(x) = 3"                                         ║
║    "Résous graphiquement x^2 = 2x + 1"                      ║
║    "Résous x^2 - 1 > 0"                                     ║
║                                                              ║
║  ✖️ INTERSECTION (2 courbes tracées)                          ║
║    "Trouve l'intersection"                                   ║
║    "Où se coupent les courbes ?"                             ║
║    "Points communs"                                          ║
║                                                              ║
║  🖱️ INTERACTIF                                               ║
║    "Promène-toi sur la courbe"                               ║
║    "Mode curseur"                                             ║
║                                                              ║
║  🎓 NIVEAU                                                   ║
║    "Je suis en Seconde"                                      ║
║    "Je suis en Terminale"                                    ║
║                                                              ║
║  🗑️ EFFACER      →  "Efface tout"                            ║
║  ❌ QUITTER      →  "Quitter"                                ║
╚══════════════════════════════════════════════════════════════╝
""")


def demander_droite():
    """Demande à l'utilisateur la méthode de saisie pour une droite."""
    print("\n📏 Fonction affine détectée ! Comment souhaites-tu la définir ?")
    print("   A — Saisir 2 points (x₁, y₁) et (x₂, y₂)")
    print("   B — Saisir le coefficient directeur a et l'ordonnée à l'origine b")
    print("   C — Garder l'expression telle quelle\n")

    while True:
        choix = input("   Ton choix (A/B/C) : ").strip().upper()
        if choix == 'A':
            try:
                print("   Point 1 :")
                x1 = float(input("     x₁ = "))
                y1 = float(input("     y₁ = "))
                print("   Point 2 :")
                x2 = float(input("     x₂ = "))
                y2 = float(input("     y₂ = "))
                if abs(x2 - x1) < 1e-12:
                    print("   ⚠️  Les deux points ont le même x ! Droite verticale impossible.")
                    continue
                a = (y2 - y1) / (x2 - x1)
                b = y1 - a * x1
                expr = sp.nsimplify(a) * x + sp.nsimplify(b)
                print(f"\n   ✅ Droite : f(x) = {expr}")
                return expr
            except ValueError:
                print("   ❌ Valeur invalide, recommence.")
        elif choix == 'B':
            try:
                a = float(input("   Coefficient directeur a = "))
                b = float(input("   Ordonnée à l'origine b = "))
                expr = sp.nsimplify(a) * x + sp.nsimplify(b)
                print(f"\n   ✅ Droite : f(x) = {expr}")
                return expr
            except ValueError:
                print("   ❌ Valeur invalide, recommence.")
        elif choix == 'C':
            return None  # Garder l'expression originale
        else:
            print("   Choisis A, B ou C.")


def main():
    """Boucle principale du programme."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     🎓 COURBES.PY — TRACEUR DE COURBES INTERACTIF 🎓       ║
║     Programme déterministe · SymPy + Matplotlib             ║
╠══════════════════════════════════════════════════════════════╣
║  Tape "aide" pour voir les commandes disponibles.           ║
║  Tape "quitter" pour sortir.                                 ║
╚══════════════════════════════════════════════════════════════╝
""")

    parser = ChatParser()
    traceur = CourbeTraceur()
    expr_courante = None  # Dernière expression tracée

    # Demander le niveau au démarrage
    print("🎓 Quel est ton niveau ? (Seconde / Première / Terminale)")
    while not parser.niveau:
        rep = input("   → ").strip()
        niv = parser.detect_niveau(rep)
        if niv:
            parser.niveau = niv
            labels = {'seconde': 'Seconde', 'premiere': 'Première', 'terminale': 'Terminale'}
            print(f"   ✅ Niveau : {labels.get(niv, niv)}\n")
        else:
            print("   ❓ Je n'ai pas compris. Dis-moi : Seconde, Première ou Terminale.")

    while True:
        try:
            user_input = input("\n💬 Toi : ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\n👋 À bientôt !")
            break

        if not user_input:
            continue

        parsed = parser.parse(user_input)

        # ────────────────────────────────────────────────
        # QUITTER
        # ────────────────────────────────────────────────
        if parsed['intent'] == 'quitter':
            print("\n👋 À bientôt ! Bonne révision ! 📚")
            plt.close('all')
            break

        # ────────────────────────────────────────────────
        # AIDE
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'aide':
            afficher_aide()

        # ────────────────────────────────────────────────
        # NIVEAU
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'niveau':
            labels = {'seconde': 'Seconde', 'premiere': 'Première', 'terminale': 'Terminale'}
            print(f"   ✅ Niveau mis à jour : {labels.get(parser.niveau, parser.niveau)}")

        # ────────────────────────────────────────────────
        # EFFACER
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'effacer':
            traceur.reset()
            expr_courante = None

        # ────────────────────────────────────────────────
        # TRACER
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'trace':
            if not parsed['expression']:
                print("\u2753 Quelle fonction veux-tu tracer ? (ex: x^2 - 3x + 1)")
                continue

            try:
                expr = parse_expression(parsed['expression'])
                interval = parsed['interval'] or (-10, 10)

                # Cas sp\u00e9cial : droite
                if is_affine(expr):
                    expr_modif = demander_droite()
                    if expr_modif is not None:
                        expr = expr_modif

                expr_courante = expr
                nom = parsed['extra'].get('func_name', 'f')
                # Nouvelle courbe principale : on efface les pr\u00e9c\u00e9dentes
                traceur.courbes.clear()
                if traceur.fig:
                    plt.close(traceur.fig)
                    traceur.fig = None
                    traceur.ax = None
                traceur.ajouter_courbe(expr, f"{nom}(x) = {expr}", interval)
                traceur.tracer()

                # Tableau de valeurs automatique
                TableauValeurs.generer(expr, interval, est_affine=is_affine(expr))

            except ValueError as e:
                print(f"❌ {e}")

        # ────────────────────────────────────────────────
        # AJOUTER
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'ajouter':
            if not parsed['expression']:
                print("❓ Quelle fonction veux-tu ajouter ? (ex: g(x) = 2x + 1)")
                continue

            try:
                expr = parse_expression(parsed['expression'])
                interval = parsed['interval'] or (-10, 10)
                nom = parsed['extra'].get('func_name', f'g_{len(traceur.courbes)+1}')

                if traceur.ajouter_courbe(expr, f"{nom}(x) = {expr}", interval):
                    print(f"   ✅ Courbe ajoutée : {nom}(x) = {expr}")
                    traceur.tracer()

            except ValueError as e:
                print(f"❌ {e}")

        # ────────────────────────────────────────────────
        # TABLEAU DE VALEURS
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'tableau':
            expr = None
            if parsed['expression']:
                try:
                    expr = parse_expression(parsed['expression'])
                except ValueError:
                    pass

            if expr is None and expr_courante is not None:
                expr = expr_courante
            elif expr is None:
                print("❓ Quelle fonction ? (ex: tableau de x^2 entre -3 et 3)")
                continue

            interval = parsed['interval'] or (-5, 5)
            TableauValeurs.generer(expr, interval, est_affine=is_affine(expr))

        # ────────────────────────────────────────────────
        # PROMENER (curseur interactif)
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'promener':
            if not traceur.courbes:
                if expr_courante:
                    traceur.ajouter_courbe(expr_courante, f"f(x) = {expr_courante}", (-10, 10))
                else:
                    print("❓ Trace d'abord une courbe !")
                    continue
            traceur.tracer(interactive=True)

        # ────────────────────────────────────────────────
        # TANGENTE
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'tangente':
            expr = None
            if parsed['expression']:
                try:
                    expr = parse_expression(parsed['expression'])
                except ValueError:
                    pass

            if expr is None and expr_courante is not None:
                expr = expr_courante
            elif expr is None:
                print("❓ Quelle fonction ? (ex: tangente de x^2 en x = 1)")
                continue

            x0 = parsed['point']
            if x0 is None:
                try:
                    x0 = float(input("   En quel point x₀ ? → "))
                except (ValueError, EOFError):
                    print("   ❌ Valeur invalide.")
                    continue

            result = Tangente.calculer(expr, x0, parser.niveau)
            if result:
                expr_courante = expr
                interval = parsed['interval'] or (-10, 10)
                if not traceur.courbes:
                    traceur.ajouter_courbe(expr, f"f(x) = {expr}", interval)
                    traceur.tracer()
                traceur.tracer_tangente(expr, x0, interval)

        # ────────────────────────────────────────────────
        # RÉSOLUTION
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'resoudre':
            if not parsed['expression']:
                print("❓ Quelle équation ? (ex: résous x^2 = 3 ou résous x^2 - 1 > 0)")
                continue

            try:
                expr_f = parse_expression(parsed['expression'])
                interval = parsed['interval'] or (-10, 10)

                if parsed['rhs']:
                    expr_g = parse_expression(parsed['rhs'])
                else:
                    expr_g = S.Zero

                operator = parsed['operator'] or '='

                if operator == '=':
                    solutions = ResolutionGraphique.resoudre_equation(expr_f, expr_g, interval)
                    if solutions:
                        traceur.reset()
                        traceur.ajouter_courbe(expr_f, f"f(x) = {expr_f}", interval)
                        g_label = f"y = {expr_g}" if not expr_g.free_symbols else f"g(x) = {expr_g}"
                        traceur.ajouter_courbe(expr_g, g_label, interval)
                        traceur.tracer()
                        traceur.tracer_resolution(expr_f, expr_g, solutions, operator, interval)
                else:
                    intervals_sol, solutions = ResolutionGraphique.resoudre_inequation(
                        expr_f, expr_g, operator, interval
                    )
                    traceur.reset()
                    traceur.ajouter_courbe(expr_f, f"f(x) = {expr_f}", interval)
                    g_label = f"y = {expr_g}" if not expr_g.free_symbols else f"g(x) = {expr_g}"
                    traceur.ajouter_courbe(expr_g, g_label, interval)
                    traceur.tracer()
                    traceur.tracer_resolution(expr_f, expr_g, solutions, operator, interval)

                expr_courante = expr_f

            except ValueError as e:
                print(f"❌ {e}")

        # ────────────────────────────────────────────────
        # INTERSECTION (courbes déjà tracées)
        # ────────────────────────────────────────────────
        elif parsed['intent'] == 'intersection':
            if len(traceur.courbes) < 2:
                print("\u2753 Il faut au moins 2 courbes trac\u00e9es pour chercher une intersection.")
                print("   Trace une courbe, puis ajoute-en une autre avec \u00ab ajoute g(x) = ... \u00bb")
                continue

            # Prendre les deux derni\u00e8res courbes
            c1 = traceur.courbes[-2]
            c2 = traceur.courbes[-1]
            expr_f = c1['expr']
            expr_g = c2['expr']
            interval = parsed['interval'] or (
                max(c1['interval'][0], c2['interval'][0]),
                min(c1['interval'][1], c2['interval'][1])
            )

            print(f"\n\U0001f50d Recherche des intersections entre :")
            print(f"   {c1['nom']}")
            print(f"   {c2['nom']}")

            solutions = ResolutionGraphique.resoudre_equation(expr_f, expr_g, interval)
            if solutions:
                traceur.tracer_resolution(expr_f, expr_g, solutions, '=', interval)
                # Extraire les noms des courbes pour l'analyse
                nom_f = c1['nom'].split('(x)')[0].strip() if '(x)' in c1['nom'] else 'f'
                nom_g = c2['nom'].split('(x)')[0].strip() if '(x)' in c2['nom'] else 'g'
                traceur.analyser_positions_relatives(expr_f, expr_g, solutions, interval, nom_f, nom_g)
            else:
                print("   \u2139\ufe0f Aucune intersection trouv\u00e9e sur cet intervalle.")

        # ────────────────────────────────────────────────
        # INCONNU
        # ────────────────────────────────────────────────
        else:
            print("❓ Je n'ai pas compris ta demande.")
            print("   Tape « aide » pour voir les commandes disponibles.")


# ─────────────────────────────────────────────────────────────
# POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    main()
