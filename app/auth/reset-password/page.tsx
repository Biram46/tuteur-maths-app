import ResetPasswordClient from "./ResetPasswordClient";

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams;
    const error = params.error;

    return <ResetPasswordClient error={error} />;
}
