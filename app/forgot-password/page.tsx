import ForgotPasswordClient from "./ForgotPasswordClient";

export default async function ForgotPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams;
    const error = params.error;
    const message = params.message;

    return <ForgotPasswordClient error={error} message={message} />;
}
