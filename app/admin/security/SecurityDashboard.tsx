'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Device {
    id: string;
    device_name: string;
    device_token: string;
    ip_address: string;
    last_used_at: string;
    expires_at: string;
    created_at: string;
}

interface AuditLog {
    id: string;
    event_type: string;
    ip_address: string | null;
    success: boolean;
    created_at: string;
    metadata: any;
}

interface Props {
    devices: Device[];
    logs: AuditLog[];
}

export default function SecurityDashboard({ devices, logs }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleRevokeDevice = async (deviceId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir révoquer cet appareil ?')) return;

        setLoading(deviceId);
        setError('');

        try {
            const response = await fetch('/api/admin/revoke-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId }),
            });

            const data = await response.json();

            if (data.success) {
                router.refresh();
            } else {
                setError(data.error || 'Erreur lors de la révocation');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(null);
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm('⚠️ Êtes-vous sûr de vouloir révoquer TOUS vos appareils de confiance ? Vous devrez entrer un code 2FA à la prochaine connexion.')) return;

        setLoading('all');
        setError('');

        try {
            const response = await fetch('/api/admin/revoke-all-devices', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                router.refresh();
            } else {
                setError(data.error || 'Erreur lors de la révocation');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return formatDate(dateString);
    };

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'code_sent': return '📧';
            case 'code_verified': return '✅';
            case 'code_failed': return '❌';
            case 'device_added': return '📱';
            case 'device_revoked': return '🚫';
            case 'all_devices_revoked': return '⚠️';
            default: return '📝';
        }
    };

    const getEventLabel = (eventType: string) => {
        switch (eventType) {
            case 'code_sent': return 'Code envoyé';
            case 'code_verified': return 'Code vérifié';
            case 'code_failed': return 'Échec de vérification';
            case 'device_added': return 'Appareil ajouté';
            case 'device_revoked': return 'Appareil révoqué';
            case 'all_devices_revoked': return 'Tous les appareils révoqués';
            default: return eventType;
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-30 border-b border-cyan-500/10 bg-slate-950/50 backdrop-blur-xl px-12 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-['Orbitron'] tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                            Sécurité <span className="text-cyan-500">2FA</span>
                        </h1>
                        <p className="text-[10px] font-mono text-cyan-600 tracking-[0.4em] uppercase mt-1">
                            Gestion des appareils de confiance
                        </p>
                    </div>

                    <a
                        href="/admin"
                        className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-2 rounded-full text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/20 transition-all uppercase shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    >
                        ← Retour Admin
                    </a>
                </div>
            </header>

            <main className="relative z-20 max-w-[1400px] mx-auto p-12 space-y-8">
                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Appareils de confiance */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <span className="text-2xl">📱</span>
                            Appareils de confiance
                            <span className="text-sm font-normal text-slate-400">({devices.length}/5)</span>
                        </h2>

                        {devices.length > 0 && (
                            <button
                                onClick={handleRevokeAll}
                                disabled={loading === 'all'}
                                className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm disabled:opacity-50"
                            >
                                {loading === 'all' ? 'Révocation...' : 'Révoquer tous'}
                            </button>
                        )}
                    </div>

                    {devices.length === 0 ? (
                        <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-12 text-center">
                            <p className="text-slate-400 text-lg mb-2">Aucun appareil de confiance</p>
                            <p className="text-slate-500 text-sm">
                                Cochez "Faire confiance à cet appareil" lors de votre prochaine connexion pour éviter les codes 2FA pendant 6 mois
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {devices.map((device) => (
                                <div
                                    key={device.id}
                                    className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="text-2xl">
                                                    {device.device_name.includes('Windows') ? '💻' :
                                                        device.device_name.includes('Mac') ? '🖥️' :
                                                            device.device_name.includes('iPhone') || device.device_name.includes('iPad') ? '📱' :
                                                                device.device_name.includes('Android') ? '📱' : '🌐'}
                                                </span>
                                                <div>
                                                    <h3 className="text-white font-semibold">{device.device_name}</h3>
                                                    <p className="text-slate-400 text-sm">Ajouté le {formatDate(device.created_at)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-slate-500">Dernière utilisation</p>
                                                    <p className="text-slate-300">{mounted ? getRelativeTime(device.last_used_at) : formatDate(device.last_used_at)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Expire le</p>
                                                    <p className="text-slate-300">{new Date(device.expires_at).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Adresse IP</p>
                                                    <p className="text-slate-300 font-mono text-xs">{device.ip_address}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Token</p>
                                                    <p className="text-slate-300 font-mono text-xs truncate">{device.device_token.slice(0, 16)}...</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRevokeDevice(device.id)}
                                            disabled={loading === device.id}
                                            className="ml-4 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm disabled:opacity-50"
                                        >
                                            {loading === device.id ? 'Révocation...' : 'Révoquer'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Logs d'audit */}
                <section>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                        <span className="text-2xl">📋</span>
                        Historique de sécurité
                        <span className="text-sm font-normal text-slate-400">(20 derniers événements)</span>
                    </h2>

                    <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-slate-950/50 sticky top-0">
                                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Événement</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">IP</th>
                                        <th className="px-6 py-4">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span>{getEventIcon(log.event_type)}</span>
                                                    <span className="text-white text-sm">{getEventLabel(log.event_type)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 text-sm">
                                                {mounted ? getRelativeTime(log.created_at) : formatDate(log.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                                                {log.ip_address || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.success ? (
                                                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs">
                                                        Succès
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs">
                                                        Échec
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Info Box */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6">
                    <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                        <span>ℹ️</span>
                        À propos de la sécurité 2FA
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li>• Les appareils de confiance permettent d'éviter les codes 2FA pendant 6 mois</li>
                        <li>• Maximum 5 appareils de confiance simultanés</li>
                        <li>• Les codes 2FA expirent après 5 minutes</li>
                        <li>• Maximum 3 tentatives par code</li>
                        <li>• Vous recevez un email à chaque ajout d'appareil</li>
                        <li>• Révoquez un appareil si vous le perdez ou s'il est compromis</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
