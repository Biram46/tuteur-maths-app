/**
 * API Route: Révocation d'un appareil de confiance
 * POST /api/admin/revoke-device
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';
import { revokeDevice, logAuditEvent } from '@/lib/admin2fa';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId } = body;

        if (!deviceId) {
            return NextResponse.json(
                { success: false, error: 'ID d\'appareil requis' },
                { status: 400 }
            );
        }

        // Vérifier l'authentification
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Non authentifié' },
                { status: 401 }
            );
        }

        // Vérifier que c'est l'admin
        if (user.email !== 'biram26@yahoo.fr') {
            return NextResponse.json(
                { success: false, error: 'Accès refusé' },
                { status: 403 }
            );
        }

        // Révoquer l'appareil
        const success = await revokeDevice(deviceId);

        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Erreur lors de la révocation' },
                { status: 500 }
            );
        }

        await logAuditEvent(user.id, 'device_revoked', null, null, null, true, { device_id: deviceId });

        return NextResponse.json({
            success: true,
            message: 'Appareil révoqué avec succès',
        });

    } catch (error: any) {
        console.error('Erreur revoke-device:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erreur serveur' },
            { status: 500 }
        );
    }
}
