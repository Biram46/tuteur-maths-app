import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';
import DeleteAccountButton from './DeleteAccountButton';

export const metadata = { title: 'Mon compte' };

export default async function MonComptePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase mb-2">
                        Mon compte
                    </h1>
                    <p className="text-slate-400 text-sm">Gestion de vos données personnelles</p>
                </div>

                {/* Infos compte */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Informations</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-800">
                            <span className="text-slate-400 text-sm">Email</span>
                            <span className="text-slate-200 text-sm font-mono">{user.email}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-800">
                            <span className="text-slate-400 text-sm">Compte créé</span>
                            <span className="text-slate-200 text-sm">
                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-400 text-sm">Connexion via</span>
                            <span className="text-slate-200 text-sm capitalize">
                                {user.app_metadata?.provider ?? 'email'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Données stockées */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Données enregistrées</h2>
                    <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            Votre adresse email (authentification uniquement)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            Prénom et classe saisis avant chaque QCM (non liés à votre compte)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            Résultats de quiz et QCM associés à votre email
                        </li>
                    </ul>
                    <p className="text-xs text-slate-500 pt-2">
                        Conformément au RGPD, vous pouvez demander la suppression de toutes ces données.{' '}
                        <a href="/confidentialite" className="text-cyan-500 hover:underline">
                            Politique de confidentialité
                        </a>
                    </p>
                </div>

                {/* Suppression */}
                <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Zone de danger</h2>
                    <p className="text-sm text-slate-400">
                        La suppression de votre compte efface définitivement votre adresse email et tous vos résultats.
                        Cette action est <strong className="text-slate-200">irréversible</strong>.
                    </p>
                    <DeleteAccountButton />
                </div>

                <div className="text-center">
                    <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        ← Retour à l&apos;accueil
                    </a>
                </div>
            </div>
        </div>
    );
}
