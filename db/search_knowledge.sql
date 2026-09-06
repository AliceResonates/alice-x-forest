-- Persistiertes externes Suchwissen (z.B. Tavily).
--
-- Getrennt von memories: memories sind Alice's eigene, agentbezogene
-- Erfahrung; hier steht nachschlagbares Weltwissen mit eigener
-- Frische-Grenze (expires_at), weil Suchergebnisse veralten koennen
-- und Erinnerungen nicht.
--
-- Angewendet via Supabase MCP (apply_migration, "create_search_knowledge").
-- Hinweis: db/init.sql ist an mehreren Stellen nicht mehr der aktuelle
-- Stand der echten Datenbank (u.a. fehlen dort intent_inbox,
-- alice_subconscious und mehrere Postgres-Funktionen) -- diese Datei
-- dokumentiert nur den neuen Teil, keine Vollstaendigkeitsgarantie
-- fuers Gesamtschema.

create table if not exists search_knowledge (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  query_embedding vector(384),
  tags text[] not null default '{}',
  intent text,
  source text not null,
  results jsonb not null,
  summary text,
  relevance_score numeric,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table search_knowledge is
  'Persistiertes externes Suchwissen (z.B. Tavily). Getrennt von memories: '
  'memories sind Alice''s eigene, agentbezogene Erfahrung; hier steht '
  'nachschlagbares Weltwissen mit eigener Frische-Grenze (expires_at), '
  'weil Suchergebnisse veralten koennen und Erinnerungen nicht.';

create index if not exists search_knowledge_embedding_idx
  on search_knowledge using ivfflat (query_embedding vector_cosine_ops);

create index if not exists search_knowledge_expires_idx
  on search_knowledge (expires_at);

alter table search_knowledge enable row level security;
