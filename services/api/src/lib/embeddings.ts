import axios from "axios";

const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL ?? "http://localhost:5000";
export const EMBEDDING_DIM = 384;

async function callEmbed(text: string, timeout: number): Promise<number[]> {
  const { data } = await axios.post(`${EMBEDDINGS_URL}/embed`, { text }, { timeout });
  return data.embedding as number[];
}

function describeError(err: unknown): string {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const code = axios.isAxiosError(err) ? err.code : undefined;
  return status ? `HTTP ${status}` : code ? code : err instanceof Error ? err.message : String(err);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Grosszuegiger als frueher: der Dienst skaliert bewusst auf 0 herunter,
    // ein kalter Start (Modell laden) kann 20-45s dauern.
    return await callEmbed(text, 20000);
  } catch (firstErr) {
    // Ein Timeout hier heisst meist: die Maschine wacht gerade erst auf.
    // Nach 20s ist sie mit hoher Wahrscheinlichkeit inzwischen bereit --
    // ein zweiter, kurzer Versuch verhindert oft schon den Nullvektor.
    try {
      return await callEmbed(text, 10000);
    } catch (secondErr) {
      console.error(
        `Embedding-Service nicht erreichbar (${describeError(secondErr)} nach Retry), nutze Nullvektor.`
      );
      return Array(EMBEDDING_DIM).fill(0);
    }
  }
}

export function isZeroVector(vec: number[]): boolean {
  return vec.every((v) => v === 0);
}

export function embeddingToSql(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
