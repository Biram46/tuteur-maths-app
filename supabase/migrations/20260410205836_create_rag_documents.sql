-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the rag_documents table
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Read: Everyone can read the documents (since they are course materials)
CREATE POLICY "Public read access for rag_documents" 
ON rag_documents FOR SELECT USING (true);


-- Create an hnsw index on the embedding vector for fast similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx 
ON rag_documents USING hnsw (embedding vector_cosine_ops);

-- Create a database function that allows the chatbot to perform similarity search over the vectors
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  filter JSONB DEFAULT '{}'::jsonb,
  match_count INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  -- We assume filter has dynamic keys like 'niveau' or 'type_doc'
  WHERE rag_documents.metadata @> filter
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
