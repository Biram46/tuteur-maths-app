-- Index GIN sur metadata pour les lookups par resource_id (suppression/ré-indexation)
CREATE INDEX IF NOT EXISTS idx_rag_documents_resource_id
ON rag_documents ((metadata->>'resource_id'));

-- Index pour filtrer par niveau dans les recherches RAG
CREATE INDEX IF NOT EXISTS idx_rag_documents_niveau
ON rag_documents ((metadata->>'niveau'));

-- Index pour filtrer par source (resource vs manuel)
CREATE INDEX IF NOT EXISTS idx_rag_documents_source
ON rag_documents ((metadata->>'source'));
