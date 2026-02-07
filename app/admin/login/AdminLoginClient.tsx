"use client";

import { adminLogin } from "@/app/auth/actions";
import { useState } from "react";

export default function AdminLoginClient({
    error,
    message,
}: {
    error?: string;
    message?: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)] mb-4 group hover:scale-110 transition-transform duration-500">
                        <span className="text-4xl group-hover:rotate-12 transition-transform">👨‍🏫</span>
                    </div>
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 uppercase">
                        Espace Professeur
                    </h1>
                    <p className="text-orange-600 font-mono text-[10px] tracking-[0.5em] uppercase mt-2">
                        Admin Portal v2.0
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 border border-orange-500/20 rounded-3xl group-hover:border-orange-500/40 transition-colors pointer-events-none"></div>

                    {/* Admin Badge */}
                    <div className="mb-6 flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        <p className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-orange-400 uppercase">
                            Accès Réservé au Professeur
                        </p>
                    </div>

                    <form className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-orange-500 uppercase ml-1">
                                Email Professeur
                            </label>
                            <div className="relative group/input">
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="votre.email@exemple.com"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-700 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-mono text-sm"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center text-slate-700 group-focus-within/input:text-orange-500/50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10Z" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-orange-500 uppercase ml-1">
                                Mot de Passe
                            </label>
                            <div className="relative group/input">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-200 placeholder:text-slate-700 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-4 flex items-center text-slate-700 hover:text-orange-500/80 group-focus-within/input:text-orange-500/50 transition-colors cursor-pointer"
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
                        </div>

                        <div className="text-right">
                            <a
                                href="/forgot-password"
                                className="text-[9px] font-['Orbitron'] tracking-widest text-slate-500 hover:text-orange-400 transition-colors uppercase"
                            >
                                Mot de passe oublié ?
                            </a>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <p className="text-xs text-red-400 font-mono">{error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-xs text-green-400 font-mono">{message}</p>
                            </div>
                        )}

                        <button
                            formAction={adminLogin}
                            className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl py-4 font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all active:scale-[0.98]"
                        >
                            <span className="relative z-10">🔐 Accès Admin</span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase">
                            Accès Sécurisé Professeur // Authentification Renforcée
                        </p>
                    </div>
                </div>

                {/* Back to Student Login */}
                <div className="text-center mt-6">
                    <a href="/login" className="text-[10px] font-['Orbitron'] tracking-widest text-slate-500 hover:text-orange-400 transition-colors uppercase">
                        ← Espace Élève
                    </a>
                </div>
            </div>
        </div>
    );
}
