import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';

async function hashEmail(email: string): Promise<string> {
    const data = new TextEncoder().encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { score, scoreBase, totalQuestions, date, studentName, studentClass } = body;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const studentEmail = user?.email || 'eleve_anonyme@example.com';
        const studentHash = await hashEmail(studentEmail);

        const { error } = await supabase.from('qcm_results').insert([
            {
                student_email: studentEmail,
                student_name: studentName || null,
                student_class: studentClass || null,
                student_hash: studentHash,
                score: score,
                score_base: scoreBase,
                total_questions: totalQuestions,
                date: date
            }
        ]);

        if (error) {
            console.error('[QCM API] Erreur insertion Supabase:', error);
        }

        return NextResponse.json({ success: true, message: 'Résultat enregistré' });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
