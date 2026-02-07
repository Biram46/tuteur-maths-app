'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Verify2FAPage() {
    const router = useRouter();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [resending, setResending] = useState(false);
    const [devCode, setDevCode] = useState<string | null>(null); // Code de développement
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Compte à rebours
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const hasRequestedCode = useRef(false);

    // Focus sur le premier input au chargement + Demander le code
    useEffect(() => {
        inputRefs.current[0]?.focus();

        // On déclenche l'envoi du code dès l'arrivée sur la page
        // On utilise un ref pour éviter le double appel (React StrictMode)
        if (!hasRequestedCode.current) {
            hasRequestedCode.current = true;
            handleResend();
        }
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Seulement des chiffres

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Prendre seulement le dernier caractère
        setCode(newCode);

        // Auto-focus sur le prochain input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit si tous les champs sont remplis
        if (index === 5 && value) {
            const fullCode = [...newCode.slice(0, 5), value].join('');
            if (fullCode.length === 6) {
                handleVerify(fullCode);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
        setCode(newCode);

        if (pastedData.length === 6) {
            handleVerify(pastedData);
        }
    };

    const handleVerify = async (codeToVerify?: string) => {
        const fullCode = codeToVerify || code.join('');

        if (fullCode.length !== 6) {
            setError('Veuillez entrer les 6 chiffres');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/verify-2fa-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: fullCode, trustDevice }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/admin');
                    router.refresh();
                }, 1000);
            } else {
                setError(data.error || 'Code incorrect');
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err: any) {
            setError('Erreur de connexion. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');

        try {
            const response = await fetch('/api/admin/send-2fa-code', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                setTimeLeft(300); // Reset le timer à 5 minutes
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                setError('');
                // En mode dev, afficher le code
                if (data.devCode) {
                    setDevCode(data.devCode);
                }
            } else {
                setError(data.error || 'Erreur lors de l\'envoi du code');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setResending(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
            {/* Animated background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md">
                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-500/10 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mb-4 shadow-lg shadow-cyan-500/50">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Vérification de sécurité
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Un code à 6 chiffres a été généré<br />
                            <span className="text-cyan-400 font-mono italic">Vérifiez vos emails enregistrés</span>
                        </p>
                    </div>

                    {/* Dev Code Display */}
                    {devCode && (
                        <div className="mb-6 p-4 bg-green-500/10 border-2 border-green-500/50 rounded-lg animate-pulse">
                            <p className="text-green-400 text-xs font-bold text-center mb-2">
                                🔧 MODE DÉVELOPPEMENT
                            </p>
                            <p className="text-white text-3xl font-mono font-bold text-center tracking-widest">
                                {devCode}
                            </p>
                            <p className="text-green-400 text-xs text-center mt-2">
                                Vérifiez aussi la console serveur
                            </p>
                        </div>
                    )}

                    {/* Code Input */}
                    <div className="mb-6">
                        <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    disabled={loading || success}
                                    className={`
                    w-12 h-14 text-center text-2xl font-bold rounded-lg
                    bg-slate-800/50 border-2 transition-all
                    focus:outline-none focus:ring-2 focus:ring-cyan-500
                    ${digit ? 'border-cyan-500 text-cyan-400' : 'border-slate-700 text-white'}
                    ${success ? 'border-green-500 text-green-400' : ''}
                    ${error ? 'border-red-500' : ''}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <div className="text-center">
                            <p className={`text-sm ${timeLeft < 60 ? 'text-red-400' : 'text-slate-400'}`}>
                                {timeLeft > 0 ? (
                                    <>Code valide pendant <span className="font-mono font-bold">{formatTime(timeLeft)}</span></>
                                ) : (
                                    <span className="text-red-400">Code expiré</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Trust Device Checkbox */}
                    <div className="mb-6">
                        <label className="flex items-start gap-3 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-all">
                            <input
                                type="checkbox"
                                checked={trustDevice}
                                onChange={(e) => setTrustDevice(e.target.checked)}
                                className="mt-1 w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
                            />
                            <div className="flex-1">
                                <p className="text-white text-sm font-medium">
                                    Faire confiance à cet appareil
                                </p>
                                <p className="text-slate-400 text-xs mt-1">
                                    Pas de code requis pendant 6 mois sur cet appareil
                                </p>
                            </div>
                        </label>
                        <p className="text-xs text-amber-400/80 mt-2 ml-1">
                            ⚠️ Cochez uniquement sur vos appareils personnels et sécurisés
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 text-sm text-center flex items-center justify-center gap-2">
                                <span>✓</span> Code vérifié ! Redirection...
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => handleVerify()}
                            disabled={loading || success || code.join('').length !== 6}
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
                        >
                            {loading ? 'Vérification...' : 'Vérifier'}
                        </button>

                        <button
                            onClick={handleResend}
                            disabled={resending || timeLeft > 240} // Désactivé si > 4 min restantes
                            className="w-full py-3 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resending ? 'Envoi en cours...' : 'Renvoyer un code'}
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-amber-400/80 text-xs text-center">
                            ⚠️ Vous n'avez pas reçu le code ?<br />
                            Vérifiez vos spams ou attendez quelques secondes
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <p className="text-slate-500 text-xs">
                        Tuteur Maths App - Administration sécurisée
                    </p>
                </div>
            </div>
        </div>
    );
}
