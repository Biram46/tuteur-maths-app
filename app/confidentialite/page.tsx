export const metadata = { title: 'Politique de confidentialité' };

export default function ConfidentialitePage() {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 py-16 px-6">
            <div className="max-w-2xl mx-auto space-y-10">

                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-bold font-['Orbitron'] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                        Politique de confidentialité
                    </h1>
                    <p className="text-slate-400 text-sm">Dernière mise à jour : avril 2026</p>
                </div>

                <Section title="1. Responsable du traitement">
                    <p>
                        Cette plateforme est éditée à des fins pédagogiques pour les élèves de lycée (Première et Terminale).
                        Pour toute question relative à vos données, contactez-nous à{' '}
                        <a href="mailto:ndiayemaths26@gmail.com" className="text-cyan-400 hover:underline">
                            ndiayemaths26@gmail.com
                        </a>.
                    </p>
                </Section>

                <Section title="2. Données collectées">
                    <ul className="space-y-2 list-none">
                        <Li>
                            <strong>Adresse email</strong> — collectée lors de la création de compte ou via Google OAuth.
                            Utilisée uniquement pour l&apos;authentification.
                        </Li>
                        <Li>
                            <strong>Prénom et classe</strong> — saisis librement avant chaque QCM.
                            Non liés à votre compte, stockés avec vos résultats de QCM.
                        </Li>
                        <Li>
                            <strong>Résultats de quiz et QCM</strong> — score, date, chapitre.
                            Utilisés par le professeur pour le suivi pédagogique.
                        </Li>
                        <Li>
                            <strong>Connexion Google OAuth</strong> — si vous vous connectez avec Google,
                            nous recevons uniquement votre email. Aucune donnée de profil (nom, photo) n&apos;est conservée.
                        </Li>
                    </ul>
                </Section>

                <Section title="3. Finalités et base légale">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-700">
                                <th className="py-2 pr-4">Finalité</th>
                                <th className="py-2">Base légale (RGPD art. 6)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            <tr>
                                <td className="py-2 pr-4">Authentification</td>
                                <td className="py-2 text-slate-300">Exécution du contrat (6.1.b)</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">Suivi des résultats</td>
                                <td className="py-2 text-slate-300">Intérêt légitime pédagogique (6.1.f)</td>
                            </tr>
                        </tbody>
                    </table>
                </Section>

                <Section title="4. Durée de conservation">
                    <ul className="space-y-2">
                        <Li>Compte actif : données conservées tant que le compte existe.</Li>
                        <Li>Résultats QCM/quiz : conservés jusqu&apos;à la suppression du compte.</Li>
                        <Li>Comptes inactifs depuis plus de 2 ans : suppression automatique.</Li>
                    </ul>
                </Section>

                <Section title="5. Vos droits (RGPD)">
                    <ul className="space-y-2">
                        <Li><strong>Accès</strong> — consultez vos données dans la page <a href="/mon-compte" className="text-cyan-400 hover:underline">Mon compte</a>.</Li>
                        <Li><strong>Effacement</strong> — supprimez votre compte et toutes vos données depuis <a href="/mon-compte" className="text-cyan-400 hover:underline">Mon compte</a>.</Li>
                        <Li><strong>Portabilité / rectification</strong> — contactez-nous par email.</Li>
                        <Li><strong>Réclamation</strong> — vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">CNIL</a> en cas de litige.</Li>
                    </ul>
                </Section>

                <Section title="6. Hébergement et sous-traitants">
                    <ul className="space-y-2">
                        <Li><strong>Vercel</strong> (hébergement) — États-Unis, certifié EU-US Data Privacy Framework.</Li>
                        <Li><strong>Supabase</strong> (base de données) — région EU (Frankfurt).</Li>
                        <Li><strong>Anthropic / OpenAI</strong> — les messages envoyés à l&apos;assistant IA ne contiennent pas vos données personnelles.</Li>
                    </ul>
                </Section>

                <div className="text-center pt-4">
                    <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        ← Retour à l&apos;accueil
                    </a>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="text-lg font-semibold text-cyan-400 border-b border-slate-800 pb-2">{title}</h2>
            <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
        </section>
    );
}

function Li({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
            <span>{children}</span>
        </li>
    );
}
