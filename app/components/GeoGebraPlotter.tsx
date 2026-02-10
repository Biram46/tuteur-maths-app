'use client';

/**
 * Composant GeoGebra pour l'affichage de courbes mathématiques.
 * Utilise l'API d'intégration de GeoGebra pour un rendu professionnel et interactif.
 */
interface GeoGebraPlotterProps {
    commands: string[]; // Liste des commandes GeoGebra (ex: ["f(x)=x^2", "A=(1,1)"])
    width?: string;
    height?: string;
    title?: string;
}

export default function GeoGebraPlotter({ commands, width = "100%", height = "400px", title }: GeoGebraPlotterProps) {
    // Construction de l'URL avec les commandes encodées
    // Format : https://www.geogebra.org/classic?command=C1;C2;C3...
    const commandString = encodeURIComponent(commands.join(';'));
    const url = `https://www.geogebra.org/classic?command=${commandString}&embed&smb=false&stb=false&stbh=false&ai=false&asb=false&sri=false&rc=false&ld=false&sdz=true&ctl=false`;

    return (
        <div className="my-8 w-full flex flex-col gap-3">
            {title && (
                <div className="px-6 py-2 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{title}</span>
                </div>
            )}
            <div
                className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-slate-900"
                style={{ height }}
            >
                <iframe
                    src={url}
                    width="100%"
                    height="100%"
                    allowFullScreen
                    style={{ border: 'none' }}
                    title="Graphique GeoGebra"
                />
            </div>
            <p className="text-[10px] text-slate-500 italic text-center px-4">
                Graphique interactif GeoGebra • Vous pouvez manipuler la figure directement.
            </p>
        </div>
    );
}
