/**
 * API Route: Envoi du code 2FA par email
 * POST /api/admin/send-2fa-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';
import { create2FASession, checkRateLimit } from '@/lib/admin2fa';

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

    // Vérifier le rate limiting
    const { allowed, remaining } = await checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trop de tentatives. Veuillez réessayer dans une heure.',
          remaining: 0
        },
        { status: 429 }
      );
    }

    // Créer la session 2FA et générer le code (envoie aussi l'email)
    const { code, sessionId, emailSent } = await create2FASession(user.id, user.email || undefined);

    // En développement, retourner le code dans la réponse
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: true,
      message: emailSent ? 'Code envoyé par email' : 'Code généré (vérifiez la console)',
      sessionId,
      remaining,
      expiresIn: 300,
      // En développement uniquement, afficher le code
      ...(isDevelopment && {
        devCode: code,
        devMessage: 'Code affiché car vous êtes en localhost'
      }),
    });

  } catch (error: any) {
    console.error('Erreur send-2fa-code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
