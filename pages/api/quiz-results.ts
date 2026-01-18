// pages/api/quiz-results.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = req.body || {};

        // On accepte largement et on mappe proprement
        const quiz_id =
            body.quiz_id ??
            body.quizId ??
            body.idQuiz ??
            "quiz-inconnu";

        const niveau =
            body.niveau ??
            body.level ??
            body.niveauCode ??
            null;

        const chapitre =
            body.chapitre ??
            body.chapter ??
            body.chapterCode ??
            null;

        const rawNote =
            body.note_finale ??
            body.noteFinale ??
            body.note ??
            body.score ??
            0;

        const note_finale =
            typeof rawNote === "number" ? rawNote : Number(rawNote) || 0;

        const details =
            body.details ??
            body.answers ??
            body.reponses ??
            null;

        const chapter_id = body.chapter_id ?? null;
        const exercise_id = body.exercise_id ?? null;

        const { error } = await supabase.from("quiz_results").insert([
            {
                quiz_id,
                niveau,
                chapitre,
                note: note_finale,      // on alimente aussi note
                note_finale,
                details,
                chapter_id,
                exercise_id,
            },
        ]);

        if (error) {
            console.error("[/api/quiz-results] Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({ success: true });
    } catch (e: any) {
        console.error("[/api/quiz-results] Server error:", e);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
