-- ═══════════════════════════════════════════════════════════════════
-- Migration : Module de pré-correction de copies manuscrites
-- Tables : copy_correction_sessions + copy_corrections
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS copy_correction_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Correction sans titre',
    subject TEXT,
    class_label TEXT,
    bareme JSONB NOT NULL DEFAULT '[]',
    total_points NUMERIC(5,2) NOT NULL DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'setup'
        CHECK (status IN ('setup','processing','review','done')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copy_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES copy_correction_sessions(id) ON DELETE CASCADE,
    student_label TEXT,
    transcription TEXT,
    ocr_provider TEXT,
    ocr_confidence NUMERIC(3,2),
    page_count INT DEFAULT 1,
    analysis JSONB,
    final_note NUMERIC(5,2),
    validated BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','ocr_processing','analysis_processing','ready','error','validated')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copy_sessions_teacher
    ON copy_correction_sessions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copy_corrections_session
    ON copy_corrections(session_id);

ALTER TABLE copy_correction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_corrections         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "copy_sessions: propre"
    ON copy_correction_sessions FOR ALL
    USING (auth.uid() IS NOT NULL AND teacher_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND teacher_id = auth.uid());

CREATE POLICY "copy_corrections: propre via session"
    ON copy_corrections FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM copy_correction_sessions s
                WHERE s.id = copy_corrections.session_id AND s.teacher_id = auth.uid())
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM copy_correction_sessions s
                WHERE s.id = copy_corrections.session_id AND s.teacher_id = auth.uid())
    );

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER copy_sessions_updated_at
    BEFORE UPDATE ON copy_correction_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER copy_corrections_updated_at
    BEFORE UPDATE ON copy_corrections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
