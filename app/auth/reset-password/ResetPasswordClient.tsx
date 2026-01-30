"use client";

import { updatePassword } from "@/app/auth/password-actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordClient({
    error,
}: {
    error?: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Vérifier si nous avons un hash token de Supabase
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken) {
            // Token de récupération détecté, la session est établie
            setIsLoading(false);
        } else if (!accessToken) {
            // Pas de token, rediriger vers forgot-password
            setAuthError("Lien invalide ou expiré. Veuillez demander un nouveau lien.");
            setTimeout(() => {
                router.push('/forgot-password?error=Lien invalide ou expiré');
            }, 3000);
        } else {
            setIsLoading(false);
        }
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-500 font-mono text-sm">Vérification...</p>
                </div>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
                    <p className="text-red-400 font-mono text-sm">{authError}</p>
                    <p className="text-slate-500 font-mono text-xs mt-2">Redirection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4 group hover:scale-110 transition-transform duration-500">
                        <span className="text-4xl group-hover:rotate-12 transition-transform">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase">
                        Nouveau Mot de Passe
                    </h1>
                    <p className="text-cyan-600 font-mono text-[10px] tracking-[0.5em] uppercase mt-2">
                        Sécurisation du Compte
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 border border-cyan-500/20 rounded-3xl group-hover:border-cyan-500/40 transition-colors pointer-events-none"></div>

                    <form className="space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-300 font-mono leading-relaxed">
                                Choisissez un nouveau mot de passe sécurisé pour votre compte.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-500 uppercase ml-1">
                                Nouveau Mot de Passe
                            </label>
                            <div className="relative group/input">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-4 flex items-center text-slate-700 hover:text-cyan-500/80 group-focus-within/input:text-cyan-500/50 transition-colors cursor-pointer"
                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-500 font-mono ml-1">
                                Minimum 6 caractères
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-500 uppercase ml-1">
                                Confirmer le Mot de Passe
                            </label>
                            <div className="relative group/input">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-4 flex items-center text-slate-700 hover:text-cyan-500/80 group-focus-within/input:text-cyan-500/50 transition-colors cursor-pointer"
                                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <p className="text-xs text-red-400 font-mono">{error}</p>
                            </div>
                        )}

                        <button
                            formAction={updatePassword}
                            className="w-full group relative overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-400 text-white rounded-xl py-4 font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98]"
                        >
                            <span className="relative z-10">Mettre à Jour le Mot de Passe</span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
