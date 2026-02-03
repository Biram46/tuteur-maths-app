"use client";

import { login, signup } from "@/app/auth/actions";
import { createClient } from "@/lib/supabaseBrowser";
import { useState } from "react";

export default function LoginPageClient({
    error,
    message,
}: {
    error?: string;
    message?: string;
}) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [showPassword, setShowPassword] = useState(false);

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
                        <span className="text-4xl group-hover:rotate-12 transition-transform">📐</span>
                    </div>
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase">
                        Tuteur Maths
                    </h1>
                    <p className="text-cyan-600 font-mono text-[10px] tracking-[0.5em] uppercase mt-2">
                        Quantum Gateway v2.0
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 border border-cyan-500/20 rounded-3xl group-hover:border-cyan-500/40 transition-colors pointer-events-none"></div>

                    {/* Tabs */}
                    <div className="flex bg-slate-950/50 p-1 rounded-xl mb-8 border border-white/5">
                        <button
                            onClick={() => setMode("login")}
                            className={`flex-1 py-2 text-xs font-['Orbitron'] tracking-widest uppercase transition-all rounded-lg ${mode === "login"
                                ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => setMode("signup")}
                            className={`flex-1 py-2 text-xs font-['Orbitron'] tracking-widest uppercase transition-all rounded-lg ${mode === "signup"
                                ? "bg-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.3)]"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            Inscription
                        </button>
                    </div>


                    <div className="space-y-6">
                        <button
                            type="button"
                            onClick={async () => {
                                const supabase = createClient();
                                await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: `${window.location.origin}/auth/callback`,
                                    },
                                });
                            }}
                            className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="text-sm font-['Orbitron'] tracking-wider text-white">
                                {mode === "login" ? "Continuer avec Google" : "S'inscrire avec Google"}
                            </span>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f172a] px-2 text-slate-500 font-mono">Ou avec email</span>
                            </div>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-500 uppercase ml-1">
                                    Identifiant (Email)
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

                            <div className="space-y-2">
                                <label className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-500 uppercase ml-1">
                                    Code d'accès (Password)
                                </label>
                                <div className="relative group/input">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
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
                            </div>

                            {mode === "login" && (
                                <div className="text-right">
                                    <a
                                        href="/forgot-password"
                                        className="text-[9px] font-['Orbitron'] tracking-widest text-slate-500 hover:text-cyan-400 transition-colors uppercase"
                                    >
                                        Mot de passe oublié ?
                                    </a>
                                </div>
                            )}

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

                            {mode === "login" ? (
                                <button
                                    formAction={login}
                                    className="w-full group relative overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-400 text-white rounded-xl py-4 font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98]"
                                >
                                    <span className="relative z-10">Initialiser Connexion</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </button>
                            ) : (
                                <button
                                    formAction={signup}
                                    className="w-full group relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 text-white rounded-xl py-4 font-['Orbitron'] tracking-[0.2em] text-xs uppercase shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] transition-all active:scale-[0.98]"
                                >
                                    <span className="relative z-10">Créer Nouvel Accès</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center space-y-3">
                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase">
                            Espace Élève // Chiffrement de bout en bout
                        </p>
                        <a
                            href="/admin/login"
                            className="inline-block text-[9px] font-['Orbitron'] tracking-widest text-slate-600 hover:text-orange-400 transition-colors uppercase"
                        >
                            👨‍🏫 Accès Professeur
                        </a>
                    </div>
                </div>

                {/* Back to Home Link */}
                <div className="text-center mt-6">
                    <a href="/" className="text-[10px] font-['Orbitron'] tracking-widest text-slate-500 hover:text-cyan-400 transition-colors uppercase">
                        ← Retour au Portail Public
                    </a>
                </div>
            </div>
        </div>
    );
}
