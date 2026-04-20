import { supabaseServer } from "@/lib/supabaseServer";

export type Level = {
    id: string;
    code: string;
    label: string;
    position: number;
};

export type Chapter = {
    id: string;
    level_id: string;
    code: string;
    title: string;
    position: number;
    published: boolean;
};

export type Resource = {
    id: string;
    chapter_id: string;
    kind: string;
    pdf_url: string | null;
    docx_url: string | null;
    latex_url: string | null;
    html_url: string | null;
    status: string;
    label: string | null;
    sequence_id: string | null;
};

export type QuizResult = {
    id: number;
    created_at: string;
    quiz_id: string;
    niveau: string | null;
    chapitre: string | null;
    note: number;
    note_finale: number;
    details: any;
    chapter_id: string | null;
    exercise_id: string | null;
    student_email: string | null;
};

export type QcmResult = {
    id: string;
    student_email: string;
    student_name: string | null;
    student_class: string | null;
    student_hash?: string;
    score: number;
    score_base: number;
    total_questions: number;
    date: string;
    created_at: string;
};

export async function getEducationalData() {
    const { data: levels } = await supabaseServer
        .from("levels")
        .select("id, code, label, position")
        .order("position", { ascending: true });

    const { data: chapters } = await supabaseServer
        .from("chapters")
        .select("id, level_id, code, title, position, published")
        .order("position", { ascending: true });

    // Pour l'espace élève : ne récupérer que les ressources publiées
    const { data: resources } = await supabaseServer
        .from("resources")
        .select(
            "id, chapter_id, kind, pdf_url, docx_url, latex_url, html_url, status, label, sequence_id"
        )
        .eq("status", "published");

    const { data: quizResults } = await supabaseServer
        .from("quiz_results")
        .select("*")
        .order("created_at", { ascending: false });

    // Fetch QCM ENTRAINE-TOI results
    const { data: qcmResults } = await supabaseServer
        .from("qcm_results")
        .select("*")
        .order("created_at", { ascending: false });

    return {
        levels: (levels || []) as Level[],
        chapters: (chapters || []) as Chapter[],
        resources: (resources || []) as Resource[],
        quizResults: (quizResults || []) as QuizResult[],
        qcmResults: (qcmResults || []) as QcmResult[],
    };
}

/**
 * Données pour l'espace professeur — inclut les brouillons et les séquences
 */
export async function getProfesseurData(teacherId: string) {
    const { data: levels } = await supabaseServer
        .from("levels")
        .select("id, code, label, position")
        .order("position", { ascending: true });

    const { data: chapters } = await supabaseServer
        .from("chapters")
        .select("id, level_id, code, title, position, published")
        .order("position", { ascending: true });

    // TOUTES les ressources (brouillons + publiées)
    const { data: resources } = await supabaseServer
        .from("resources")
        .select(
            "id, chapter_id, kind, pdf_url, docx_url, latex_url, html_url, status, label, sequence_id, created_by, published_at, created_at"
        );

    // Séquences du professeur
    const { data: sequences } = await supabaseServer
        .from("sequences")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

    // Sessions chat actives
    const { data: chatSessions } = await supabaseServer
        .from("prof_chat_sessions")
        .select("id, sequence_id, resource_type, status, created_at, updated_at")
        .eq("teacher_id", teacherId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

    return {
        levels: (levels || []) as Level[],
        chapters: (chapters || []) as Chapter[],
        resources: (resources || []) as Resource[],
        sequences: sequences || [],
        chatSessions: chatSessions || [],
    };
}

