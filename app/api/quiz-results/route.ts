import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { quiz_id, niveau, chapitre, note_finale, details, student_email, student_name, student_class } = body;

        if (note_finale === undefined || note_finale === null) {
            return NextResponse.json({ error: 'note_finale requis' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabase.from('quiz_results').insert([{
            quiz_id: quiz_id || 'quiz-externe',
            niveau: niveau || null,
            chapitre: chapitre || null,
            note_finale: note_finale,
            note: note_finale,
            details: details || null,
            student_email: student_email || null,
            student_name: student_name || null,
            student_class: student_class || null,
        }]);

        if (error) {
            console.error('[quiz-results] Erreur insertion:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('[quiz-results] Erreur:', err.message);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
