/**
 * API Route: Vérification du code 2FA
 * POST /api/admin/verify-2fa-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';
import { isAdminEmail } from '@/lib/api-auth';
import { verify2FACode, addTrustedDevice } from '@/lib/admin2fa';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, trustDevice } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Code invalide' },
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
    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // Vérifier le code
    const result = await verify2FACode(user.id, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Création d'un appareil de confiance (Obligatoire pour accéder à /admin)
    // - Si trustDevice est coché : 6 mois (180 jours)
    // - Sinon : 10 minutes (session éphémère)
    let deviceToken = null;
    try {
      const userAgent = req.headers.get('user-agent') || '';
      const acceptLanguage = req.headers.get('accept-language') || '';
      const ipAddress = req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';

      // Durée : 180 jours si coché, sinon 10 minutes (10 / 24*60)
      const duration = trustDevice ? 180 : (10 / 1440);

      const { token, device } = await addTrustedDevice(
        user.id,
        userAgent,
        ipAddress,
        acceptLanguage,
        duration
      );

      deviceToken = token;

      // Définir le cookie sécurisé
      const cookieStore = await cookies();
      cookieStore.set('admin_trusted_device', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        // Durée : 180 jours ou 10 minutes (600s)
        maxAge: trustDevice ? 60 * 60 * 24 * 180 : 600,
        path: '/admin',
      });

      if (trustDevice) {
        // Log et Email seulement si c'est un ajout permanent
        console.log(`🔔 Appareil de confiance permanent ajouté pour ${user.email}`);

        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          try {
            const { Resend } = await import('resend');
            const resend = new Resend(resendApiKey);

            await resend.emails.send({
              from: 'Tuteur Maths <onboarding@resend.dev>',
              to: user.email!,
              subject: '🔔 Nouvel appareil de confiance ajouté',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
                  <h2 style="color: #0f172a; text-align: center;">Nouvel appareil ajouté</h2>
                  <p style="color: #475569;">Un nouvel appareil a été marqué comme "de confiance" pour votre compte administration.</p>
                  <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <p><strong>📱 Appareil :</strong> ${device.device_name}</p>
                    <p><strong>🌐 Adresse IP :</strong> ${ipAddress}</p>
                    <p><strong>📅 Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                  </div>
                  <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fef3c7; color: #92400e; font-size: 14px;">
                    <strong>Attention :</strong> Si vous n'êtes pas à l'origine de cette action, connectez-vous immédiatement pour révoquer cet appareil depuis vos paramètres de sécurité.
                  </div>
                </div>
              `,
            });
          } catch (err) {
            console.error('Erreur notification Resend:', err);
          }
        }
      } else {
        console.log(`🔐 Session temporaire autorisée pour ${user.email} (24h)`);
      }

    } catch (error: any) {
      console.error('Erreur configuration session admin:', error);
      // Si on arrive pas à créer le token de confiance, on aura une boucle de redirection
      return NextResponse.json(
        { success: false, error: 'Impossible de valider la session de confiance. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code vérifié avec succès',
      deviceAdded: !!deviceToken,
    });

  } catch (error: any) {
    console.error('Erreur verify-2fa-code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
