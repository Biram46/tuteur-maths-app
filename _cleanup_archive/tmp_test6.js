let expr = "-2x^2 + 8x - 5 sur l'intervalle [-4";
expr = expr.replace(/\s+sur\s+(?:l(?:'|’|e\s+|a\s+|les\s+)?intervalles?\s*)?(?:ℝ|[Rr]|[\[\]I]).*$/i, '');
console.log(expr);
