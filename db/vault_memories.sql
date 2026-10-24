-- Vault-seitige Erinnerungen, geschrieben vom Reingest-Endpunkt.
--
-- Bewusst getrennt von `memories` (SERIAL-PK, vom Heartbeat-System):
-- vault_memories nutzt UUID-PKs aus dem Obsidian-Frontmatter und bildet
-- den Rueckweg des Roots-Transports ab (Vault → Go → Supabase).
--
-- needs_embedding wird beim Upsert gesetzt, wenn sich content_hash
-- aendert -- ein asynchroner Embedding-Worker kann darauf filtern.
--
-- Angewendet via Supabase MCP (apply_migration, "create_vault_memories").

CREATE TABLE IF NOT EXISTS vault_memories (
    id              UUID PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    body            TEXT NOT NULL,
    content_hash    TEXT NOT NULL,
    tags            TEXT[],
    parent          TEXT,
    related         TEXT[],
    meta            JSONB,
    embedding       vector(384),
    needs_embedding BOOLEAN NOT NULL DEFAULT true,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vault_memories IS
    'Vault-seitige Erinnerungen (Obsidian → Go-Reingest → Supabase). '
    'UUID-PK aus dem Frontmatter, getrennt von memories (SERIAL-PK, Heartbeat).';

CREATE INDEX IF NOT EXISTS vault_memories_needs_embedding_idx
    ON vault_memories (needs_embedding) WHERE needs_embedding;

CREATE INDEX IF NOT EXISTS vault_memories_hash_idx
    ON vault_memories (content_hash);

ALTER TABLE vault_memories ENABLE ROW LEVEL SECURITY;
