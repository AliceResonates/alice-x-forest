import { Pool } from "pg";
import { generateEmbedding, embeddingToSql, isZeroVector } from "../lib/embeddings";
import { summarize } from "./ModelRouter";
import {
  KnowledgeEntry,
  SearchOrRetrieveParams,
  SearchOrRetrieveResult,
  SearchProvider,
} from "../types/knowledge";

const DEFAULT_TTL_HOURS = 24;
const DEFAULT_SIMILARITY_THRESHOLD = 0.15; // Kosinusdistanz, kleiner = strenger
const SUMMARY_INSTRUCTION =
  "Fasse die folgenden Suchergebnisse in maximal fünf Sätzen zusammen. " +
  "Neutral, auf den Punkt, keine Meinung. Nenne keine Quelle namentlich, " +
  "das übernimmt das System separat.";

function rowToEntry(row: any): KnowledgeEntry {
  return {
    id: row.id,
    query: row.query,
    tags: row.tags ?? [],
    intent: row.intent,
    source: row.source,
    results: row.results,
    summary: row.summary,
    relevanceScore: row.relevance_score !== null ? Number(row.relevance_score) : null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export class KnowledgeService {
  constructor(private db: Pool, private provider: SearchProvider) {}

  // Prüft, ob zu einer Frage bereits verwertbares, nicht abgelaufenes Wissen
  // vorliegt, bevor ein externer Suchaufruf überhaupt in Frage kommt.
  async findExisting(
    query: string,
    similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD
  ): Promise<KnowledgeEntry | null> {
    const embedding = await generateEmbedding(query);
    if (isZeroVector(embedding)) {
      // Kein brauchbares Embedding fuer die aktuelle Anfrage -- ein
      // Vergleich waere ohnehin bedeutungslos (und liesse sich mit
      // ebenfalls fehlerhaft gespeicherten Nullvektoren nicht sauber
      // von einem echten Treffer unterscheiden).
      return null;
    }

    const result = await this.db.query(
      `SELECT id, query, tags, intent, source, results, summary, relevance_score,
              created_at, expires_at,
              query_embedding <=> $1::vector AS distance
         FROM search_knowledge
        WHERE (expires_at IS NULL OR expires_at > now())
          AND query_embedding <=> $1::vector < $2
        ORDER BY query_embedding <=> $1::vector
        LIMIT 1`,
      [embeddingToSql(embedding), similarityThreshold]
    );

    return result.rows.length ? rowToEntry(result.rows[0]) : null;
  }

  async persist(params: {
    query: string;
    tags: string[];
    intent: string | null;
    source: string;
    results: unknown;
    summary: string | null;
    relevanceScore: number | null;
    ttlHours: number;
  }): Promise<KnowledgeEntry> {
    const embedding = await generateEmbedding(params.query);
    // Ein degradiertes Embedding ehrlich als "keins" ablegen (NULL), statt
    // einen Nullvektor wie ein echtes Embedding aussehen zu lassen -- sonst
    // verwechselt eine spaetere Abfrage "kein Signal" mit "sehr aehnlich".
    const embeddingSql = isZeroVector(embedding) ? null : embeddingToSql(embedding);

    const result = await this.db.query(
      `INSERT INTO search_knowledge
         (query, query_embedding, tags, intent, source, results, summary, relevance_score, expires_at)
       VALUES ($1, $2::vector, $3, $4, $5, $6::jsonb, $7, $8,
               CASE WHEN $9::float > 0 THEN now() + ($9 || ' hours')::interval ELSE NULL END)
       RETURNING id, query, tags, intent, source, results, summary, relevance_score, created_at, expires_at`,
      [
        params.query,
        embeddingSql,
        params.tags,
        params.intent,
        params.source,
        JSON.stringify(params.results),
        params.summary,
        params.relevanceScore,
        params.ttlHours,
      ]
    );

    return rowToEntry(result.rows[0]);
  }

  // Die eigentliche Orchestrierung: erst schauen, ob die Frage schon
  // beantwortet im Speicher liegt, nur bei Fehlanzeige extern suchen —
  // und das Ergebnis sofort strukturiert ablegen, nicht nur im Kontext.
  async searchOrRetrieve(params: SearchOrRetrieveParams): Promise<SearchOrRetrieveResult> {
    const existing = await this.findExisting(params.query, params.similarityThreshold);
    if (existing) {
      return { ...existing, reused: true };
    }

    const response = await this.provider.search(params.query, { maxResults: params.maxResults });

    const combinedContent = response.results.map((r) => `- ${r.title}: ${r.content}`).join("\n");
    const summary = combinedContent ? await summarize(SUMMARY_INSTRUCTION, combinedContent) : null;

    const relevanceScore = response.results.length
      ? response.results.reduce((sum, r) => sum + (r.score ?? 0), 0) / response.results.length
      : null;

    const entry = await this.persist({
      query: params.query,
      tags: params.tags ?? [],
      intent: params.intent ?? null,
      source: "tavily",
      results: response.results,
      summary,
      relevanceScore,
      ttlHours: params.ttlHours ?? DEFAULT_TTL_HOURS,
    });

    return { ...entry, reused: false };
  }
}
