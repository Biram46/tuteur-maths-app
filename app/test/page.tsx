import MathTable from '../components/MathTable';

export default function TestPage() {
    const tables = [
        {
            title: "Test 1: Tableau de signes simple f(x) = (x-2)(x+3)",
            data: {
                xValues: ["-∞", "-3", "2", "+∞"],
                rows: [
                    { label: "x-2", type: "sign" as const, content: ["-", "|", "-", "0", "+"] },
                    { label: "x+3", type: "sign" as const, content: ["-", "0", "+", "|", "+"] },
                    { label: "f(x)", type: "sign" as const, content: ["+", "0", "-", "0", "+"] }
                ]
            }
        },
        {
            title: "Test 2: Valeurs interdites (Double barre) f(x) = 1/x",
            data: {
                xValues: ["-∞", "0", "+∞"],
                rows: [
                    { label: "x", type: "sign" as const, content: ["-", "0", "+"] },
                    { label: "1/x", type: "sign" as const, content: ["-", "||", "+"] }
                ]
            }
        },
        {
            title: "Test 3: Tableau de variations f(x) = x²",
            data: {
                xValues: ["-∞", "0", "+∞"],
                rows: [
                    { label: "f'(x) = 2x", type: "sign" as const, content: ["-", "0", "+"] },
                    { label: "f(x) = x²", type: "variation" as const, content: ["+∞", "searrow", "0", "nearrow", "+∞"] }
                ]
            }
        },
        {
            title: "Test 4: Variations complexes (Polynôme du 3ème degré)",
            data: {
                xValues: ["-∞", "-1", "2", "+∞"],
                rows: [
                    { label: "f'(x)", type: "sign" as const, content: ["+", "0", "-", "0", "+"] },
                    { label: "f(x)", type: "variation" as const, content: ["-∞", "nearrow", "4", "searrow", "-5", "nearrow", "+∞"] }
                ]
            }
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                        🧪 Banc d'essai - Tableaux Mathématiques
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Vérification du rendu visuel du <span className="text-indigo-600 font-bold italic">Math Engine v2.6</span>
                    </p>
                </header>

                <div className="grid gap-12">
                    {tables.map((table, i) => (
                        <section key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <span className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                                    {i + 1}
                                </span>
                                {table.title}
                            </h2>
                            <MathTable data={table.data} />
                        </section>
                    ))}
                </div>

                <footer className="mt-20 text-center text-slate-400 text-sm border-t border-slate-200 pt-8 pb-12">
                    Tuteur Maths App • Rapport de test généré le {new Date().toLocaleDateString('fr-FR')}
                </footer>
            </div>
        </div>
    );
}

