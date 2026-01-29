"use client";

import { resetPassword } from "@/app/auth/password-actions";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordClient({
    error,
    message,
}: {
    error?: string;
    message?: string;
}) {
    const [showSuccess, setShowSuccess] = useState(!!message);

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
                        <span className="text-4xl group-hover:rotate-12 transition-transform">🔑</span>
                    </div>
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase">
                        Mot de Passe
                    </h1>
                    <p className="text-cyan-600 font-mono text-[10px] tracking-[0.5em] uppercase mt-2">
                        Réinitialisation Sécurisée
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 border border-cyan-500/20 rounded-3xl group-hover:border-cyan-500/40 transition-colors pointer-events-none"></div>

                    {showSuccess ? (
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                </div>
                                <p className="text-sm text-green-400 font-mono leading-relaxed">
                                    {message}
                                </p>
                                <p className="text-xs text-slate-400 font-mono">
                                    Vérifiez également vos spams si vous ne voyez pas l'email.
                                </p>
                            </div>

                            <Link
                                href="/login"
                                className="block w-full text-center py-3 px-4 bg-gradient-to-r from-cyan-600 to-cyan-400 text-white rounded-xl font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all"
                            >
                                ← Retour à la Connexion
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-6">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-300 font-mono leading-relaxed">
                                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-500 uppercase ml-1">
                                    Adresse Email
                                </label>
                                <div className="relative group/input">
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="nom@exemple.com"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm"
                                    />
                                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-700 group-focus-within/input:text-cyan-500/50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10Z" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <p className="text-xs text-red-400 font-mono">{error}</p>
                                </div>
                            )}

                            <button
                                formAction={resetPassword}
                                className="w-full group relative overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-400 text-white rounded-xl py-4 font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98]"
                            >
                                <span className="relative z-10">Envoyer le Lien</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-[10px] font-['Orbitron'] tracking-widest text-slate-500 hover:text-cyan-400 transition-colors uppercase"
                                >
                                    ← Retour à la Connexion
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
