CREATE INDEX IF NOT EXISTS idx_rag_documents_resource_id
ON rag_documents ((metadata->>'resource_id'));

CREATE INDEX IF NOT EXISTS idx_rag_documents_niveau
ON rag_documents ((metadata->>'niveau'));

CREATE INDEX IF NOT EXISTS idx_rag_documents_source
ON rag_documents ((metadata->>'source'));
