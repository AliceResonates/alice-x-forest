import axios from "axios";
import { SearchProvider, SearchResponse } from "../types/knowledge";

const TAVILY_URL = "https://api.tavily.com/search";

// Analog zu ModelRouter.ts: typisiertes Request/Response, festes Timeout,
// Fehler wird nicht roh durchgereicht, sondern mit Status klassifiziert.
export class TavilySearchAdapter implements SearchProvider {
  constructor(private apiKey: string) {}

  async search(query: string, opts?: { maxResults?: number }): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error("TAVILY_API_KEY nicht gesetzt");
    }

    const startedAt = Date.now();

    try {
      const { data } = await axios.post(
        TAVILY_URL,
        {
          api_key: this.apiKey,
          query,
          max_results: opts?.maxResults ?? 5,
          include_answer: false,
        },
        { timeout: 15000 }
      );

      const results = (data.results ?? []).map((r: any) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: r.content ?? "",
        score: typeof r.score === "number" ? r.score : undefined,
      }));

      return { results, latencyMs: Date.now() - startedAt, raw: data };
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const detail = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data).slice(0, 300)
        : err instanceof Error
          ? err.message
          : String(err);
      throw new Error(status ? `Tavily HTTP ${status}: ${detail}` : `Tavily-Aufruf fehlgeschlagen: ${detail}`);
    }
  }
}
