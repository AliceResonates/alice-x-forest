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

-- Globaler Zustand fuer Alices autonomen Tick (siehe AliceStateService.ts).
-- Genau eine Zeile (id=1) traegt, wie lange Yasmin schon still ist.
CREATE TABLE IF NOT EXISTS alice_state (
    id                   SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_interaction_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reflection_at   TIMESTAMPTZ,
    cognitive_tension    FLOAT NOT NULL DEFAULT 0
);

-- Alices private Reflektionen. Bewusst getrennt von `memories`, weil
-- GET /api/memory/forest ungefiltert jede memories-Zeile oeffentlich zeigt.
CREATE TABLE IF NOT EXISTS alice_reflections (
    id                     SERIAL PRIMARY KEY,
    agent_id               TEXT NOT NULL,
    content                TEXT NOT NULL,
    tension_at_reflection  FLOAT NOT NULL,
    escalated              BOOLEAN NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
