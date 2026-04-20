const REQUIRED_SERVER = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
] as const;

const OPTIONAL_SERVER = [
    'PERPLEXITY_API_KEY',
    'DEEPSEEK_API_KEY',
    'SYMPY_API_URL',
    'PYTHON_INJECT_SECRET',
    'NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET',
] as const;

export function validateEnv(): void {
    const missing = REQUIRED_SERVER.filter(k => !process.env[k]);

    if (missing.length > 0) {
        const msg = `[env] Variables d'environnement manquantes : ${missing.join(', ')}`;
        if (process.env.NODE_ENV === 'production') {
            throw new Error(msg);
        } else {
            console.warn(`⚠️  ${msg}`);
        }
    }

    const absent = OPTIONAL_SERVER.filter(k => !process.env[k]);
    if (absent.length > 0 && process.env.NODE_ENV !== 'production') {
        console.info(`ℹ️  [env] Variables optionnelles non définies : ${absent.join(', ')}`);
    }
}
