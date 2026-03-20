import { createClient } from '@/lib/supabaseAction';
import QcmModule from '@/app/components/QcmModule';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EntraineToiPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const userName = Math.random().toString(36).substring(7);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
                <Link 
                    href="/" 
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold uppercase tracking-widest"
                >
                    ← Retour Espace
                </Link>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Session</span>
                </div>
            </div>
            
            <QcmModule userName={userName} />
        </div>
    );
}
