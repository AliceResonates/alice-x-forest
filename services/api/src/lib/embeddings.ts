import axios from "axios";

const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL ?? "http://localhost:5000";
export const EMBEDDING_DIM = 384;

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { data } = await axios.post(
      `${EMBEDDINGS_URL}/embed`,
      { text },
      // Grosszuegiger als frueher: der Dienst skaliert bewusst auf 0
      // herunter, ein kalter Start (Modell laden) kann 20-45s dauern.
      { timeout: 20000 }
    );
    return data.embedding as number[];
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const code = axios.isAxiosError(err) ? err.code : undefined;
    const message = status
      ? `HTTP ${status}`
      : code
        ? code
        : err instanceof Error
          ? err.message
          : String(err);
    console.error(`Embedding-Service nicht erreichbar (${message}), nutze Nullvektor.`);
    return Array(EMBEDDING_DIM).fill(0);
  }
}

export function embeddingToSql(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
