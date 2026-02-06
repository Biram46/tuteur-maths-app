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

    const { data: resources } = await supabaseServer
        .from("resources")
        .select(
            "id, chapter_id, kind, pdf_url, docx_url, latex_url, html_url"
        );

    const { data: quizResults } = await supabaseServer
        .from("quiz_results")
        .select("*")
        .order("created_at", { ascending: false });

    return {
        levels: (levels || []) as Level[],
        chapters: (chapters || []) as Chapter[],
        resources: (resources || []) as Resource[],
        quizResults: (quizResults || []) as QuizResult[],
    };
}
