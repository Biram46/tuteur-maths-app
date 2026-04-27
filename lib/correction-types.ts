export interface BaremeItem {
    id: string;
    label: string;
    max_points: number;
}

export interface AnalysisItem {
    id: string;
    label: string;
    awarded: number;
    max: number;
    comment: string;
}

export interface CopyAnalysis {
    items: AnalysisItem[];
    note: number;
    confidence: number;
    general_comment: string;
}

export interface CorrectionSession {
    id: string;
    teacher_id: string;
    title: string;
    subject: string | null;
    class_label: string | null;
    bareme: BaremeItem[];
    total_points: number;
    status: 'setup' | 'processing' | 'review' | 'done';
    created_at: string;
    updated_at: string;
}

export type CopyStatus =
    | 'pending'
    | 'ocr_processing'
    | 'analysis_processing'
    | 'ready'
    | 'error'
    | 'validated';

export interface CopyCorrection {
    id: string;
    session_id: string;
    student_label: string | null;
    transcription: string | null;
    ocr_provider: 'claude' | 'gpt4o' | 'gemini' | null;
    ocr_confidence: number | null;
    page_count: number;
    analysis: CopyAnalysis | null;
    final_note: number | null;
    validated: boolean;
    status: CopyStatus;
    error_message: string | null;
    created_at: string;
}

export interface CopyFile {
    localId: string;
    file: File;
    student_label: string;
    pages: { base64: string; mimeType: string }[];
    status: CopyStatus;
    dbId: string | null;
    error?: string;
}

export interface OcrResult {
    transcription: string;
    confidence: number;
    provider: 'claude' | 'gpt4o' | 'gemini';
}
