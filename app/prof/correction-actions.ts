'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import type {
    CorrectionSession,
    CopyCorrection,
    BaremeItem,
    CopyAnalysis,
} from '@/lib/correction-types';

// ─── Sessions ────────────────────────────────────────────────────

export async function createCorrectionSession(
    teacherId: string,
    params: {
        title: string;
        subject?: string;
        class_label?: string;
        bareme: BaremeItem[];
        total_points: number;
    }
): Promise<{ id: string }> {
    const { data, error } = await supabaseServer
        .from('copy_correction_sessions')
        .insert([{
            teacher_id: teacherId,
            title: params.title,
            subject: params.subject ?? null,
            class_label: params.class_label ?? null,
            bareme: params.bareme,
            total_points: params.total_points,
            status: 'processing',
        }])
        .select('id')
        .single();
    if (error) throw new Error(`Erreur création session: ${error.message}`);
    return { id: data!.id };
}

export async function getCorrectionSessions(
    teacherId: string
): Promise<CorrectionSession[]> {
    const { data, error } = await supabaseServer
        .from('copy_correction_sessions')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw new Error(`Erreur lecture sessions: ${error.message}`);
    return (data ?? []) as CorrectionSession[];
}

export async function deleteCorrectionSession(
    sessionId: string,
    teacherId: string
): Promise<void> {
    const { error } = await supabaseServer
        .from('copy_correction_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('teacher_id', teacherId);
    if (error) throw new Error(`Erreur suppression session: ${error.message}`);
    revalidatePath('/prof');
}

// ─── Copies ──────────────────────────────────────────────────────

export async function createCopyRow(
    sessionId: string,
    studentLabel: string | null,
    pageCount: number
): Promise<{ id: string }> {
    const { data, error } = await supabaseServer
        .from('copy_corrections')
        .insert([{
            session_id: sessionId,
            student_label: studentLabel,
            page_count: pageCount,
            status: 'ocr_processing',
        }])
        .select('id')
        .single();
    if (error) throw new Error(`Erreur création copie: ${error.message}`);
    return { id: data!.id };
}

export async function updateCopyOcr(
    copyId: string,
    params: {
        transcription: string;
        ocr_provider: string;
        ocr_confidence: number;
    }
): Promise<void> {
    const { error } = await supabaseServer
        .from('copy_corrections')
        .update({
            transcription: params.transcription,
            ocr_provider: params.ocr_provider,
            ocr_confidence: params.ocr_confidence,
            status: 'analysis_processing',
        })
        .eq('id', copyId);
    if (error) throw new Error(`Erreur update OCR: ${error.message}`);
}

export async function updateCopyAnalysis(
    copyId: string,
    analysis: CopyAnalysis
): Promise<void> {
    const { error } = await supabaseServer
        .from('copy_corrections')
        .update({
            analysis,
            final_note: analysis.note,
            status: 'ready',
        })
        .eq('id', copyId);
    if (error) throw new Error(`Erreur update analyse: ${error.message}`);
}

export async function updateCopyError(
    copyId: string,
    errorMessage: string
): Promise<void> {
    const { error } = await supabaseServer
        .from('copy_corrections')
        .update({ status: 'error', error_message: errorMessage })
        .eq('id', copyId);
    if (error) throw new Error(`Erreur update statut erreur: ${error.message}`);
}

export async function validateCopy(
    copyId: string,
    finalNote: number,
    updatedItems?: CopyAnalysis['items']
): Promise<void> {
    const updates: Record<string, unknown> = {
        final_note: finalNote,
        validated: true,
        status: 'validated',
    };
    if (updatedItems) {
        const { data } = await supabaseServer
            .from('copy_corrections')
            .select('analysis')
            .eq('id', copyId)
            .single();
        if (data?.analysis) {
            updates.analysis = { ...data.analysis, items: updatedItems, note: finalNote };
        }
    }
    const { error } = await supabaseServer
        .from('copy_corrections')
        .update(updates)
        .eq('id', copyId);
    if (error) throw new Error(`Erreur validation copie: ${error.message}`);
    revalidatePath('/prof');
}

export async function getSessionWithCopies(
    sessionId: string
): Promise<{ session: CorrectionSession; copies: CopyCorrection[] }> {
    const [sessionRes, copiesRes] = await Promise.all([
        supabaseServer
            .from('copy_correction_sessions')
            .select('*')
            .eq('id', sessionId)
            .single(),
        supabaseServer
            .from('copy_corrections')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at'),
    ]);
    if (sessionRes.error) throw new Error(`Session introuvable: ${sessionRes.error.message}`);
    return {
        session: sessionRes.data as CorrectionSession,
        copies: (copiesRes.data ?? []) as CopyCorrection[],
    };
}
