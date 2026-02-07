/**
 * API Route: Révocation de tous les appareils de confiance
 * POST /api/admin/revoke-all-devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';
import { revokeAllDevices } from '@/lib/admin2fa';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
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

        // Révoquer tous les appareils
        const success = await revokeAllDevices(user.id);

        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Erreur lors de la révocation' },
                { status: 500 }
            );
        }

        // Supprimer le cookie de l'appareil actuel
        const cookieStore = await cookies();
        cookieStore.delete('admin_trusted_device');

        return NextResponse.json({
            success: true,
            message: 'Tous les appareils ont été révoqués',
        });

    } catch (error: any) {
        console.error('Erreur revoke-all-devices:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erreur serveur' },
            { status: 500 }
        );
    }
}
