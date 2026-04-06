import sympy as sp

x = sp.Symbol('x', real=True)
LOCALS = {'x': x, 'e': sp.E, 'pi': sp.pi, 'log': sp.log, 'ln': sp.log, 'exp': sp.exp, 'sqrt': sp.sqrt}

def deriv_steps(expr):
    steps = []
    
    def walk(e, label="f(x)"):
        if e.is_Add:
            steps.append(f"{label} est une somme.")
            d_args = []
            for i, arg in enumerate(e.args):
                steps.append(f"On dérive le terme {sp.latex(arg)} :")
                d_args.append(walk(arg, "Terme"))
            d = sum(d_args)
            steps.append(f"La dérivée de la somme est la somme des dérivées : {sp.latex(d)}")
            return d
            
        elif e.is_Mul:
            # check if quotient
            num, den = sp.fraction(e)
            if den != 1:
                u, v = num, den
                steps.append(f"{label} est de la forme u/v avec u(x)={sp.latex(u)} et v(x)={sp.latex(v)}.")
                du = walk(u, "u(x)")
                dv = walk(v, "v(x)")
                steps.append(f"On applique (u/v)' = (u'v - uv') / v^2")
                d = sp.simplify((du * v - u * dv) / (v**2))
                return d
            else:
                # product
                if len(e.args) == 2:
                    u, v = e.args
                    if u.is_number:
                        return u * walk(v, "v(x)")
                    steps.append(f"{label} est de la forme u*v avec u(x)={sp.latex(u)} et v(x)={sp.latex(v)}.")
                    du = walk(u, "u(x)")
                    dv = walk(v, "v(x)")
                    d = sp.simplify(du * v + u * dv)
                    steps.append(f"On applique (uv)' = u'v + uv' -> {sp.latex(d)}")
                    return d
                else:
                    return sp.diff(e, x)
                
        elif hasattr(e, 'func'):
            if e.func == sp.exp:
                u = e.args[0]
                if u == x: return sp.exp(x)
                steps.append(f"{label} est de la forme e^u avec u(x)={sp.latex(u)}")
                du = walk(u, "u(x)")
                d = du * sp.exp(u)
                steps.append(f"On applique (e^u)' = u'e^u -> {sp.latex(d)}")
                return d
            elif e.func == sp.log:
                u = e.args[0]
                if u == x: return 1/x
                steps.append(f"{label} est de la forme ln(u) avec u(x)={sp.latex(u)}")
                du = walk(u, "u(x)")
                d = du / u
                steps.append(f"On applique (ln(u))' = u'/u -> {sp.latex(d)}")
                return d
            elif e.is_Pow:
                u, n = e.args
                if u == x: return sp.diff(e, x)
                steps.append(f"{label} est de la forme u^n avec u(x)={sp.latex(u)} et n={n}")
                du = walk(u, "u(x)")
                d = n * du * u**(n-1)
                steps.append(f"On applique (u^n)' = n u' u^(n-1) -> {sp.latex(d)}")
                return d
                
        # Base case
        return sp.diff(e, x)

    final_d = walk(expr)
    final_simple = sp.factor(final_d)
    return steps, final_d, final_simple

expr = sp.sympify("exp(2*x) / (x+1)", locals=LOCALS)
s, d, fs = deriv_steps(expr)
for x in s: print(x)
print("FINAL:", sp.latex(fs))
