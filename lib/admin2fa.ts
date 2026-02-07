/**
 * Utilitaires pour l'authentification à deux facteurs (2FA) de l'admin
 * - Génération de codes 2FA
 * - Gestion des appareils de confiance
 * - Empreinte digitale des navigateurs
 */

import crypto from 'crypto';
import { supabaseServer } from './supabaseServer';

// ============================================
// CONFIGURATION
// ============================================

export const TWO_FA_CONFIG = {
    CODE_LENGTH: 6,
    CODE_EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    TRUSTED_DEVICE_DURATION_DAYS: 180, // 6 mois
    MAX_TRUSTED_DEVICES: 5,
    RATE_LIMIT_CODES_PER_HOUR: 20, // Sécurité raisonnable
};

// ============================================
// GÉNÉRATION DE CODE 2FA
// ============================================

/**
 * Génère un code à 6 chiffres aléatoire
 */
export function generate2FACode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
}

/**
 * Crée une session 2FA et retourne le code
 */
export async function create2FASession(userId: string, userEmail?: string): Promise<{ code: string; sessionId: string; emailSent: boolean }> {
    const code = generate2FACode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TWO_FA_CONFIG.CODE_EXPIRY_MINUTES);

    // Invalider les anciennes sessions non vérifiées
    await supabaseServer
        .from('admin_2fa_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('verified', false);

    // Créer la nouvelle session
    const { data, error } = await supabaseServer
        .from('admin_2fa_sessions')
        .insert([{
            user_id: userId,
            code,
            expires_at: expiresAt.toISOString(),
            max_attempts: TWO_FA_CONFIG.MAX_ATTEMPTS,
        }])
        .select()
        .single();

    if (error) {
        console.error('Erreur création session 2FA:', error);
        throw new Error('Impossible de créer la session 2FA');
    }

    // ============================================
    // ENVOI D'EMAIL (REAL VIA RESEND)
    // ============================================
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendApiKey && userEmail) {
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(resendApiKey);

            const emailResult = await resend.emails.send({
                from: 'Tuteur Maths <onboarding@resend.dev>',
                to: userEmail,
                subject: '🔐 Code de vérification 2FA - Tuteur Maths App',
                html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
              <h2 style="color: #0f172a; text-align: center;">Vérification de sécurité</h2>
              <p style="color: #475569; text-align: center;">Utilisez le code ci-dessous pour confirmer votre identité.</p>
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #e2e8f0;">
                <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #06b6d4; font-family: monospace;">${code}</span>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 15px;">Ce code expire dans 5 minutes.</p>
              </div>
              <p style="color: #64748b; font-size: 12px; text-align: center;">Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.</p>
            </div>
          `,
            });

            emailSent = !emailResult.error;
            if (emailResult.error) {
                console.error('Erreur Resend:', emailResult.error);
            }
        } catch (err) {
            console.error('Exception lors de l\'envoi via Resend:', err);
        }
    }

    // ============================================
    // LOG CONSOLE (DEVELOPPEMENT / FALLBACK)
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔐 CODE 2FA GÉNÉRÉ');
    console.log('='.repeat(60));
    console.log(`Email: ${userEmail || 'Inconnu'}`);
    console.log(`Code: ${code}`);
    console.log(`Status: ${emailSent ? 'Email envoyé via Resend' : (resendApiKey ? 'Echec envoi email' : 'Pas de RESEND_API_KEY')}`);
    console.log(`Expire dans: ${TWO_FA_CONFIG.CODE_EXPIRY_MINUTES} minutes`);
    console.log('='.repeat(60) + '\n');

    // Log de l'événement
    await logAuditEvent(userId, 'code_sent', null, null, null, true, {
        code_length: 6,
        email_sent: emailSent
    });

    return { code, sessionId: data.id, emailSent };
}

/**
 * Vérifie un code 2FA
 */
export async function verify2FACode(
    userId: string,
    code: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
    // Récupérer la session active
    const { data: session, error: fetchError } = await supabaseServer
        .from('admin_2fa_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (fetchError || !session) {
        await logAuditEvent(userId, 'code_failed', null, null, null, false, { reason: 'no_session' });
        return { success: false, error: 'Aucune session 2FA active. Veuillez demander un nouveau code.' };
    }

    // Vérifier l'expiration
    if (new Date(session.expires_at) < new Date()) {
        await logAuditEvent(userId, 'code_failed', null, null, null, false, { reason: 'expired' });
        return { success: false, error: 'Le code a expiré. Veuillez demander un nouveau code.' };
    }

    // Vérifier le nombre de tentatives
    if (session.attempts >= session.max_attempts) {
        await logAuditEvent(userId, 'code_failed', null, null, null, false, { reason: 'max_attempts' });
        return { success: false, error: 'Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.' };
    }

    // Incrémenter les tentatives
    await supabaseServer
        .from('admin_2fa_sessions')
        .update({ attempts: session.attempts + 1 })
        .eq('id', session.id);

    // Vérifier le code
    if (session.code !== code) {
        await logAuditEvent(userId, 'code_failed', null, null, null, false, {
            reason: 'wrong_code',
            attempts: session.attempts + 1
        });
        return {
            success: false,
            error: `Code incorrect. ${session.max_attempts - session.attempts - 1} tentative(s) restante(s).`
        };
    }

    // Code correct - Marquer comme vérifié
    await supabaseServer
        .from('admin_2fa_sessions')
        .update({ verified: true })
        .eq('id', session.id);

    await logAuditEvent(userId, 'code_verified', null, null, null, true);

    return { success: true, sessionId: session.id };
}

// ============================================
// APPAREILS DE CONFIANCE
// ============================================

/**
 * Génère un token unique pour un appareil
 */
export function generateDeviceToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 caractères
}

/**
 * Génère une empreinte digitale du navigateur
 */
export function generateDeviceFingerprint(userAgent: string, acceptLanguage: string = ''): string {
    const fingerprint = `${userAgent}|${acceptLanguage}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Extrait le nom de l'appareil depuis le User-Agent
 */
export function extractDeviceName(userAgent: string): string {
    if (!userAgent) return 'Appareil inconnu';

    // Détection du navigateur
    let browser = 'Navigateur inconnu';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Détection de l'OS
    let os = '';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return os ? `${browser} sur ${os}` : browser;
}

/**
 * Vérifie si un appareil est de confiance
 */
export async function checkTrustedDevice(
    userId: string,
    deviceToken: string,
    currentFingerprint: string
): Promise<{ trusted: boolean; device?: any }> {
    if (!deviceToken) {
        return { trusted: false };
    }

    const { data: device, error } = await supabaseServer
        .from('admin_trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_token', deviceToken)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !device) {
        return { trusted: false };
    }

    // Vérifier l'empreinte digitale (détection de vol de cookie)
    if (device.device_fingerprint !== currentFingerprint) {
        console.warn('⚠️ Empreinte digitale différente - Possible vol de cookie');
        // Révoquer l'appareil
        await revokeDevice(device.id);
        await logAuditEvent(userId, 'device_revoked', deviceToken, null, null, true, {
            reason: 'fingerprint_mismatch'
        });
        return { trusted: false };
    }

    // Mettre à jour last_used_at
    await supabaseServer
        .from('admin_trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', device.id);

    return { trusted: true, device };
}

/**
 * Ajoute un appareil de confiance
 */
export async function addTrustedDevice(
    userId: string,
    userAgent: string,
    ipAddress: string,
    acceptLanguage: string = '',
    durationDays: number = TWO_FA_CONFIG.TRUSTED_DEVICE_DURATION_DAYS
): Promise<{ token: string; device: any }> {
    const token = generateDeviceToken();
    const fingerprint = generateDeviceFingerprint(userAgent, acceptLanguage);
    const deviceName = extractDeviceName(userAgent);
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Vérifier le nombre d'appareils existants
    const { count } = await supabaseServer
        .from('admin_trusted_devices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

    if (count && count >= TWO_FA_CONFIG.MAX_TRUSTED_DEVICES) {
        throw new Error(`Maximum de ${TWO_FA_CONFIG.MAX_TRUSTED_DEVICES} appareils de confiance atteint`);
    }

    const { data: device, error } = await supabaseServer
        .from('admin_trusted_devices')
        .insert([{
            user_id: userId,
            device_token: token,
            device_fingerprint: fingerprint,
            device_name: deviceName,
            ip_address: ipAddress,
            user_agent: userAgent,
            expires_at: expiresAt.toISOString(),
        }])
        .select()
        .single();

    if (error) {
        console.error('Erreur ajout appareil de confiance:', error);
        throw new Error('Impossible d\'ajouter l\'appareil de confiance');
    }

    await logAuditEvent(userId, 'device_added', token, ipAddress, userAgent, true, {
        device_name: deviceName,
        expires_at: expiresAt.toISOString(),
    });

    return { token, device };
}

/**
 * Récupère tous les appareils de confiance d'un utilisateur
 */
export async function getTrustedDevices(userId: string) {
    const { data, error } = await supabaseServer
        .from('admin_trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('last_used_at', { ascending: false });

    if (error) {
        console.error('Erreur récupération appareils:', error);
        return [];
    }

    return data || [];
}

/**
 * Révoque un appareil de confiance
 */
export async function revokeDevice(deviceId: string): Promise<boolean> {
    const { error } = await supabaseServer
        .from('admin_trusted_devices')
        .delete()
        .eq('id', deviceId);

    if (error) {
        console.error('Erreur révocation appareil:', error);
        return false;
    }

    return true;
}

/**
 * Révoque tous les appareils de confiance d'un utilisateur
 */
export async function revokeAllDevices(userId: string): Promise<boolean> {
    const { error } = await supabaseServer
        .from('admin_trusted_devices')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur révocation tous appareils:', error);
        return false;
    }

    await logAuditEvent(userId, 'all_devices_revoked', null, null, null, true);

    return true;
}

// ============================================
// LOGS D'AUDIT
// ============================================

/**
 * Enregistre un événement d'audit
 */
export async function logAuditEvent(
    userId: string,
    eventType: string,
    deviceToken: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    success: boolean,
    metadata: any = {}
) {
    await supabaseServer
        .from('admin_2fa_audit_logs')
        .insert([{
            user_id: userId,
            event_type: eventType,
            device_token: deviceToken,
            ip_address: ipAddress,
            user_agent: userAgent,
            success,
            metadata,
        }]);
}

/**
 * Récupère les logs d'audit d'un utilisateur
 */
export async function getAuditLogs(userId: string, limit: number = 50) {
    const { data, error } = await supabaseServer
        .from('admin_2fa_audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Erreur récupération logs:', error);
        return [];
    }

    return data || [];
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Vérifie le rate limiting pour l'envoi de codes
 */
export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { count } = await supabaseServer
        .from('admin_2fa_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

    const codesCount = count || 0;
    const remaining = Math.max(0, TWO_FA_CONFIG.RATE_LIMIT_CODES_PER_HOUR - codesCount);

    return {
        allowed: codesCount < TWO_FA_CONFIG.RATE_LIMIT_CODES_PER_HOUR,
        remaining,
    };
}
