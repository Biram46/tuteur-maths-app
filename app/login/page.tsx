import LoginPageClient from "./LoginPageClient";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Connexion | Accès à votre Espace Maths",
    description: "Connectez-vous à votre espace personnalisé Tuteur Maths. Accédez à vos cours, exercices et suivi de progression en mathématiques.",
    robots: {
        index: true,
        follow: true,
    },
};

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams;
    const error = params.error;
    const message = params.message;

    return <LoginPageClient error={error} message={message} />;
}
