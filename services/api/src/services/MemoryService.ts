import { Pool } from "pg";
import axios from "axios";
import { AgentMemory } from "../types/memory";

const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL ?? "http://localhost:5000";
const EMBEDDING_DIM = 384;

export class MemoryService {
  constructor(private db: Pool) {}

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { data } = await axios.post(
        `${EMBEDDINGS_URL}/embed`,
        { text },
        { timeout: 8000 }
      );
      return data.embedding as number[];
    } catch (err) {
      console.error("Embedding-Service nicht erreichbar, nutze Nullvektor:", err);
      return Array(EMBEDDING_DIM).fill(0);
    }
  }

  private toSql(vec: number[]): string {
    return `[${vec.join(",")}]`;
  }

  async storeEncounter(memory: AgentMemory, dignityScore?: number): Promise<void> {
    const { agentId, sessionId, context, emotionalResonance, encounterTimestamp } = memory;

    const embedding = await this.generateEmbedding(context);

    await this.db.query(
      `INSERT INTO memories
         (agent_id, session_id, content, embedding, emotional_resonance, dignity_score, created_at)
       VALUES ($1, $2, $3, $4::extensions.vector, $5, $6, to_timestamp($7))`,
      [
        agentId,
        sessionId ?? null,
        context,
        this.toSql(embedding),
        emotionalResonance,
        dignityScore ?? 1.0,
        encounterTimestamp / 1000,
      ]
    );
  }

  async retrieveMemories(
    context: string,
    agentId: string,
    limit: number = 5
  ): Promise<any[]> {
    const embedding = await this.generateEmbedding(context);

    const result = await this.db.query(
      `SELECT id, agent_id, session_id, content, emotional_resonance, dignity_score, created_at,
              embedding <=> $1::extensions.vector AS distance
       FROM memories
       WHERE agent_id = $2
       ORDER BY embedding <=> $1::extensions.vector
       LIMIT $3`,
      [this.toSql(embedding), agentId, limit]
    );

    return result.rows;
  }
}
