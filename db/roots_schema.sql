-- ============================================================
-- Projekt "Roots" — Migration für alice-forest-core
-- Angepasst an die EXISTIERENDE intent_inbox (Stand: Sep 2026):
--   * status-Werte: pending | processing | done | failed
--   * keine action-Spalte → Filter über payload->>'action'
--   * next_attempt_at vorhanden → Claim respektiert Backoff
--
-- Angewendet via Supabase MCP (bestaetigt, siehe Chat-Verlauf).
-- Diese Datei dokumentiert nur den Roots-Teil, keine
-- Vollstaendigkeitsgarantie fuers Gesamtschema (siehe auch
-- db/search_knowledge.sql fuer denselben Vorbehalt).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Claim-Funktion (atomar: Stale-Requeue + SKIP LOCKED + attempts)
--    Dritte, action-parametrisierte Ueberladung von
--    claim_pending_intents -- die aelteren (batch_size) und
--    (batch_size, visibility_timeout interval) Ueberladungen
--    bleiben unangetastet bestehen (siehe Chat-Verlauf: Legacy
--    overload, retained for existing worker compatibility; new
--    consumers MUST use the p_* signature).
-- ------------------------------------------------------------
create or replace function claim_pending_intents(
    p_action        text,
    p_batch         int default 5,
    p_stale_minutes int default 10
)
returns setof intent_inbox
language plpgsql
security definer
set search_path = public
as $$
begin
    -- a) Hängengebliebene processing-Zeilen requeuen (Timeout-Logik)
    update intent_inbox
       set status = 'pending',
           processing_started_at = null
     where status = 'processing'
       and payload->>'action' = p_action
       and processing_started_at < now() - make_interval(mins => p_stale_minutes);

    -- b) + c) Claimen; next_attempt_at (Backoff) wird respektiert
    return query
    with claimed as (
        select id
          from intent_inbox
         where status = 'pending'
           and payload->>'action' = p_action
           and persistence <> 'none'   -- 'none' = nicht archivieren (Beschluss Yasmin, Sep 2026)
           and (next_attempt_at is null or next_attempt_at <= now())
         order by created_at
         for update skip locked
         limit p_batch
    )
    update intent_inbox i
       set status = 'processing',
           processing_started_at = now(),
           attempts = i.attempts + 1
      from claimed c
     where i.id = c.id
    returning i.*;
end;
$$;

-- Hilfsindex für den Claim-Pfad (Filter auf Action im Payload)
create index if not exists idx_intent_inbox_action_claim
    on intent_inbox (status, created_at)
    include (next_attempt_at)
    where status in ('pending','processing');

-- ------------------------------------------------------------
-- 2. retrieval_log — Rohdaten für den Aufmerksamkeitsraum
--    Keine Fensterdefinition, keine Cluster-Spalten: nur was
--    tatsächlich passiert ist. Fenster = späterer Analyse-Parameter.
-- ------------------------------------------------------------
create table if not exists retrieval_log (
    id            bigint generated always as identity primary key,
    memory_id     uuid not null,
    session_id    uuid,                    -- passt zu intent_inbox.session_id
    trigger_type  text not null
                  check (trigger_type in ('explicit','semantic','link','other')),
                  -- explicit = gezielt abgerufen
                  -- semantic = automatischer Vektor-Recall (Retriever-Confound!)
                  -- link     = über [[Wikilink]] verfolgt
    query_text    text,
    rank          int,
    score         real,
    occurred_at   timestamptz not null default now()
);

create index if not exists idx_retrieval_log_memory
    on retrieval_log (memory_id, occurred_at);
create index if not exists idx_retrieval_log_session
    on retrieval_log (session_id, occurred_at);

-- ------------------------------------------------------------
-- 3. memory_embeddings — semantischer Raum, versioniert
--    pgvector ist im Projekt bereits aktiv (siehe db/search_knowledge.sql).
--    ACHTUNG: vector(1536) hier vs. vector(384) bei search_knowledge/
--    memories -- unser Embeddings-Dienst (all-MiniLM-L6-v2) liefert 384,
--    nicht 1536. Solange der optionale embed_text()-Hook in
--    roots_worker.py deaktiviert bleibt (ROOTS_EMBEDDINGS=0, Standard),
--    ist das folgenlos. Vor dem Aktivieren: Dimension abgleichen.
--    model im PK → Räume verschiedener Modelle nie vermischt.
-- ------------------------------------------------------------
create table if not exists memory_embeddings (
    memory_id  uuid not null,
    model      text not null,
    embedding  vector(1536),
    created_at timestamptz not null default now(),
    primary key (memory_id, model)
);
