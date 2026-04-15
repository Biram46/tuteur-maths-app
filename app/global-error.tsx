'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="fr">
            <body style={{
                margin: 0,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                color: '#e2e8f0',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', fontSize: 28, color: '#fff',
                    }}>
                        !
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
                        Erreur inattendue
                    </h1>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        Une erreur critique s&apos;est produite. Veuillez rafraîchir la page ou réessayer.
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '0.75rem 2rem', borderRadius: 12, border: 'none',
                            background: '#3b82f6', color: '#fff', fontWeight: 700,
                            cursor: 'pointer', fontSize: '0.875rem',
                        }}
                    >
                        Réessayer
                    </button>
                </div>
            </body>
        </html>
    );
}
