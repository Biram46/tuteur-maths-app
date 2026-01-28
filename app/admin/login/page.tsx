import AdminLoginClient from "./AdminLoginClient";

export default async function AdminLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams;
    const error = params.error;
    const message = params.message;

    return <AdminLoginClient error={error} message={message} />;
}
