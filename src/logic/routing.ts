// routing.ts

export type ModelId = "deepseek" | "qwen" | "gemma";

export interface Message {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface ModelResponse {
  model: ModelId;
  content: string;
}

export interface RoutingResult {
  primary: ModelId;
  calledModels: ModelId[];
  responses: ModelResponse[];
  summary?: ModelResponse;
}

// --- Modell-Rollen (funktional, nicht vermenschlichend) ---

const MODELS: ModelId[] = ["deepseek", "qwen", "gemma"];

// DeepSeek = Architekt (Analyse, Struktur)
// Qwen    = Erzählerin (Kontext, Narrative, kreative Verknüpfung)
// Gemma   = Flinker Helfer (kurz, pragmatisch, schnell)

// --- Heuristiken für Zuständigkeit ---

function isAnalytical(message: string): boolean {
  const keywords = [
    "analysiere",
    "analyse",
    "struktur",
    "architektur",
    "beweise",
    "formal",
    "algorithmus",
    "komplexität",
    "technisch erklären",
  ];
  return keywords.some(k => message.toLowerCase().includes(k));
}

function isCreative(message: string): boolean {
  const keywords = [
    "geschichte",
    "erzähle",
    "metapher",
    "poetisch",
    "kreativ",
    "szene",
    "welt bauen",
    "charakter",
  ];
  return keywords.some(k => message.toLowerCase().includes(k));
}

function isShortPragmatic(message: string): boolean {
  // sehr einfache Heuristik: kurze, direkte Fragen
  const length = message.trim().length;
  const simplePatterns = ["kurz", "in einem satz", "nur kurz", "tl;dr"];
  return length < 120 || simplePatterns.some(k => message.toLowerCase().includes(k));
}

// --- Primärmodell bestimmen ---

export function choosePrimaryModel(message: string): ModelId {
  if (isAnalytical(message)) return "deepseek";
  if (isCreative(message)) return "qwen";
  if (isShortPragmatic(message)) return "gemma";
  // Default: erzählerisch-kontextuell
  return "qwen";
}

// --- Technischer Override (kein godmode, nur Werkzeugwahl) ---

export function applyOverride(
  requested: string | undefined,
  fallback: ModelId
): ModelId {
  if (!requested) return fallback;
  const normalized = requested.toLowerCase();
  if (normalized.includes("deepseek")) return "deepseek";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("gemma")) return "gemma";
  return fallback;
}

 // --- OpenRouter Integration ---

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Mapping deiner Modellnamen zu OpenRouter-Modellen
const MODEL_MAP: Record<ModelId, string> = {
  deepseek: "deepseek/deepseek-chat",
  qwen: "qwen/qwen-2.5-7b-instruct",
  gemma: "google/gemma-2-9b-it"
};

async function callModel(model: ModelId, messages: Message[]): Promise<ModelResponse | null> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_MAP[model],
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      console.error(`Fehler bei Modell ${model}:`, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return {
      model,
      content
    };

  } catch (err) {
    console.error(`Fehler beim Aufruf von ${model}:`, err);
    return null;
  }
}


// --- Zusammenfassung (rotierend) ---

function chooseSummaryModel(previousSummaryModel?: ModelId): ModelId {
  if (!previousSummaryModel) return "deepseek";
  const index = MODELS.indexOf(previousSummaryModel);
  const nextIndex = (index + 1) % MODELS.length;
  return MODELS[nextIndex];
}

export async function summarize(
  responses: ModelResponse[],
  previousSummaryModel?: ModelId
): Promise<ModelResponse | null> {
  if (responses.length === 0) return null;
  const model = chooseSummaryModel(previousSummaryModel);

  const summaryPrompt: Message[] = [
    {
      role: "system",
      content:
        "Fasse die wichtigsten Punkte der vorherigen Antworten neutral zusammen. " +
        "Keine Wertung, keine Personifizierung, aber klare Positionierung, wo sinnvoll. " +
        "Benennen Sie auch offene Fragen und mögliche nächste Schritte.",
    },
    {
      role: "user",
      content: responses
        .map(r => `[${r.model}] ${r.content}`)
        .join("\n\n"),
    },
  ];

  const summary = await callModel(model, summaryPrompt);
  return summary;
}

// --- Haupt-Routing-Funktion für eine Nachricht ---

export async function routeMessage(
  userMessage: string,
  overrideHint?: string,
  previousSummaryModel?: ModelId
): Promise<RoutingResult> {
  const basePrimary = choosePrimaryModel(userMessage);
  const primary = applyOverride(overrideHint, basePrimary);

  const messages: Message[] = [
    { role: "user", content: userMessage },
  ];

  const calledModels: ModelId[] = [];
  const responses: ModelResponse[] = [];

  // Primärmodell
  const primaryResponse = await callModel(primary, messages);
  if (primaryResponse) {
    calledModels.push(primary);
    responses.push(primaryResponse);
  }

  // Optionale Modelle (freiwillig)
  for (const model of MODELS) {
    if (model === primary) continue;
    const optionalResponse = await callModel(model, messages);
    if (optionalResponse) {
      calledModels.push(model);
      responses.push(optionalResponse);
    }
  }

  // Zusammenfassung
  const summary = await summarize(responses, previousSummaryModel);

  return {
    primary,
    calledModels,
    responses,
    summary: summary ?? undefined,
  };
}
