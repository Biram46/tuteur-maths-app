import LoginPageClient from "./LoginPageClient";

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
