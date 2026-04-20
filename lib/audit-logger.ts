import { createClient } from '@supabase/supabase-js';

export async function logAdminAction(params: {
    userId?: string;
    userEmail?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    success?: boolean;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabase.from('admin_audit_logs').insert([{
            user_id: params.userId ?? null,
            user_email: params.userEmail ?? null,
            action: params.action,
            target_type: params.targetType ?? null,
            target_id: params.targetId ?? null,
            target_label: params.targetLabel ?? null,
            success: params.success ?? true,
            metadata: params.metadata ?? null,
        }]);
    } catch {
        // Non-bloquant : l'audit ne doit jamais faire échouer l'action principale
    }
}
