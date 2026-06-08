import { Pool } from "pg";
import { AgentMemory } from "../types/memory";

export class MemoryService {
  constructor(private db: Pool) {}

  private async generateEmbedding(text: string): Promise<number[]> {
    return Array(1536).fill(0).map(() => Math.random());
  }

  async storeEncounter(memory: AgentMemory, dignityScore?: number): Promise<void> {
    const { agentId, context, emotionalResonance, encounterTimestamp } = memory;

    const embedding = await this.generateEmbedding(context);
    const embeddingString = `[${embedding.join(",")}]`;

    const query = `
      INSERT INTO memories (
        agent_id, content, embedding,
        emotional_resonance, dignity_score, created_at
      )
      VALUES ($1, $2, $3::vector, $4, $5, to_timestamp($6))
    `;

    const values = [
      agentId, context, embeddingString,
      emotionalResonance, dignityScore ?? 1.0,
      encounterTimestamp / 1000,
    ];

    await this.db.query(query, values);
  }

  async retrieveMemories(context: string, agentId: string, limit: number = 5): Promise<any[]> {
    const embedding = await this.generateEmbedding(context);
    const embeddingString = `[${embedding.join(",")}]`;

    const query = `
      SELECT id, agent_id, content, emotional_resonance, dignity_score, created_at,
             embedding <-> $1::vector AS distance
      FROM memories
      WHERE agent_id = $2
      ORDER BY embedding <-> $1::vector
      LIMIT $3
    `;

    const result = await this.db.query(query, [embeddingString, agentId, limit]);
    return result.rows;
  }
}
