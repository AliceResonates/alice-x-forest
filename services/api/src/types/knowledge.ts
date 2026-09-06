export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  latencyMs: number;
  raw: unknown;
}

export interface SearchProvider {
  search(query: string, opts?: { maxResults?: number }): Promise<SearchResponse>;
}

export interface KnowledgeEntry {
  id: string;
  query: string;
  tags: string[];
  intent: string | null;
  source: string;
  results: SearchResultItem[];
  summary: string | null;
  relevanceScore: number | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface SearchOrRetrieveParams {
  query: string;
  tags?: string[];
  intent?: string;
  maxResults?: number;
  // Wie lange ein frisch geholtes Ergebnis wiederverwendbar bleibt, bevor
  // ein erneuter externer Suchaufruf fällig wird. Anders als bei Alice's
  // Erinnerungen veralten Suchergebnisse (Nachrichtenlage, Preise, Versionen).
  ttlHours?: number;
  // Ab welcher Kosinusdistanz ein vorhandener Eintrag noch als "dieselbe
  // Frage" zählt. Kleiner = strenger.
  similarityThreshold?: number;
}

export interface SearchOrRetrieveResult extends KnowledgeEntry {
  reused: boolean;
}
