import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAction';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { score, scoreBase, totalQuestions, date, studentName, studentClass } = body;

        // Connexion Supabase
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const studentEmail = user?.email || 'eleve_anonyme@example.com';

        // Insertion dans la BDD
        const { error } = await supabase.from('qcm_results').insert([
            {
                student_email: studentEmail,
                student_name: studentName || null,
                student_class: studentClass || null,
                score: score,
                score_base: scoreBase,
                total_questions: totalQuestions,
                date: date
            }
        ]);
        
        if (error) {
            console.error('[QCM API] Erreur insertion Supabase:', error);
            // On ne bloque pas l'UI élève si la table n'est pas encore créée
        } else {
            console.log(`[QCM API] Résultat en base pour \${studentEmail} : \${score}/20`);
        }

        return NextResponse.json({ success: true, message: 'Résultat enregistré' });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
