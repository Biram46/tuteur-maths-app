'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/auth/actions';

export default function DeleteAccountButton() {
    const [confirming, setConfirming] = useState(false);
    const [pending, setPending] = useState(false);

    if (!confirming) {
        return (
            <button
                onClick={() => setConfirming(true)}
                className="w-full py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
            >
                Supprimer mon compte
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-red-300 font-semibold text-center">
                Confirmer la suppression définitive ?
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                    className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    Annuler
                </button>
                <form action={async () => {
                    setPending(true);
                    await deleteAccount();
                }} className="flex-1">
                    <button
                        type="submit"
                        disabled={pending}
                        className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                        {pending ? 'Suppression...' : 'Oui, supprimer'}
                    </button>
                </form>
            </div>
        </div>
    );
}
