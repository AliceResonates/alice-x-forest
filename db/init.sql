CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memories (
    id                  SERIAL PRIMARY KEY,
    agent_id            TEXT NOT NULL,
    session_id          TEXT,
    content             TEXT NOT NULL,
    embedding           vector(384),
    emotional_resonance FLOAT,
    dignity_score       FLOAT DEFAULT 1.0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS memories_embedding_idx
    ON memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
