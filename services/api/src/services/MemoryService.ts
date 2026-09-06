import { Pool } from "pg";
import { AgentMemory } from "../types/memory";
import { generateEmbedding, embeddingToSql } from "../lib/embeddings";

export class MemoryService {
  constructor(private db: Pool) {}

  async storeEncounter(memory: AgentMemory, dignityScore?: number): Promise<void> {
    const { agentId, sessionId, context, emotionalResonance, encounterTimestamp } = memory;

    const embedding = await generateEmbedding(context);

    await this.db.query(
      `INSERT INTO memories
         (agent_id, session_id, content, embedding, emotional_resonance, dignity_score, created_at)
       VALUES ($1, $2, $3, $4::vector, $5, $6, to_timestamp($7))`,
      [
        agentId,
        sessionId ?? null,
        context,
        embeddingToSql(embedding),
        emotionalResonance,
        dignityScore ?? 1.0,
        encounterTimestamp / 1000,
      ]
    );
  }

  async getForestMemories(limit: number = 20): Promise<any[]> {
    const result = await this.db.query(
      `SELECT id, agent_id, session_id, content, emotional_resonance, dignity_score, created_at
       FROM memories
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async retrieveMemories(
    context: string,
    agentId: string,
    limit: number = 5
  ): Promise<any[]> {
    const embedding = await generateEmbedding(context);

    const result = await this.db.query(
      `SELECT id, agent_id, session_id, content, emotional_resonance, dignity_score, created_at,
              embedding <=> $1::vector AS distance
       FROM memories
       WHERE agent_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingToSql(embedding), agentId, limit]
    );

    return result.rows;
  }
}
