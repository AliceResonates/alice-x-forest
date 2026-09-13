import { Pool } from "pg";

// Read-Side fuer Roots (Aidyns Schritt ④): kein eigener Speicher noetig --
// die "done"-Zeilen in intent_inbox SIND schon die dauerhafte Ablage, und
// retrieval_log/memory_embeddings referenzieren memory_id bereits implizit
// als intent_inbox.id (ohne Fremdschluessel, aber so vom Roots-Worker
// gebaut: roots_worker.py setzt frontmatter.id = str(intent_row["id"])).

export interface RootsMemorySummary {
  id: string;
  title: string;
  tags: string[];
  createdAt: string; // Wald-Zeit aus intent_inbox.created_at
}

export interface RootsMemoryDetail extends RootsMemorySummary {
  content: string;
  parent?: string;
  related: string[];
  meta?: Record<string, unknown>;
  sessionId?: string;
}

function rowToDetail(row: any): RootsMemoryDetail {
  const data = row.payload?.memory_data ?? {};
  return {
    id: row.id,
    title: data.title,
    content: data.content,
    tags: data.tags ?? [],
    parent: data.parent,
    related: data.related ?? [],
    meta: data.meta,
    sessionId: row.session_id ?? undefined,
    createdAt: row.created_at,
  };
}

export class RootsMemoryService {
  constructor(private db: Pool) {}

  async list(limit: number = 20): Promise<RootsMemorySummary[]> {
    const result = await this.db.query(
      `select id, created_at,
              payload->'memory_data'->>'title' as title,
              coalesce(payload->'memory_data'->'tags', '[]'::jsonb) as tags
         from intent_inbox
        where payload->>'action' = 'save_memory'
          and status = 'done'
        order by created_at desc
        limit $1`,
      [limit]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags ?? [],
      createdAt: r.created_at,
    }));
  }

  async get(id: string, sessionId?: string): Promise<RootsMemoryDetail | null> {
    const result = await this.db.query(
      `select id, session_id, created_at, payload
         from intent_inbox
        where id = $1
          and payload->>'action' = 'save_memory'
          and status = 'done'`,
      [id]
    );
    if (!result.rows.length) return null;

    // Fire-and-forget, wie storeEncounter in MemoryService: ein Logging-
    // Fehlschlag darf den eigentlichen Abruf nie verhindern. trigger_type
    // 'explicit', weil hier gezielt eine bekannte id abgerufen wird --
    // nicht der semantische Recall, fuer den die Spalte auch vorgesehen ist.
    this.db
      .query(
        `insert into retrieval_log (memory_id, session_id, trigger_type) values ($1, $2, 'explicit')`,
        [id, sessionId ?? null]
      )
      .catch((err) => console.error("retrieval_log schreiben fehlgeschlagen:", err));

    return rowToDetail(result.rows[0]);
  }
}
