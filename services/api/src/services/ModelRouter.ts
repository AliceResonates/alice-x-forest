import axios from "axios";

export type ModelId = "deepseek" | "qwen" | "gemma";

const MODEL_MAP: Record<ModelId, string> = {
  deepseek: "deepseek/deepseek-chat",
  qwen:     "qwen/qwen-2.5-7b-instruct",
  gemma:    "google/gemma-3-27b-it",
};

const MODELS: ModelId[] = ["deepseek", "qwen", "gemma"];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function choosePrimary(message: string): ModelId {
  const m = message.toLowerCase();
  const analytical = ["analysiere", "analyse", "struktur", "algorithmus", "technisch", "formal"];
  const creative   = ["geschichte", "erzähle", "metapher", "poetisch", "kreativ", "szene"];
  if (analytical.some(k => m.includes(k))) return "deepseek";
  if (creative.some(k => m.includes(k)))   return "qwen";
  return "gemma";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelResponse {
  model: ModelId;
  content: string;
}

export interface ParliamentResult {
  primary: ModelId;
  calledModels: ModelId[];
  responses: ModelResponse[];
}

async function callModel(model: ModelId, messages: ChatMessage[]): Promise<ModelResponse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY nicht gesetzt");

  try {
    const { data } = await axios.post(
      OPENROUTER_URL,
      { model: MODEL_MAP[model], messages },
      {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );
    const content: string = data.choices?.[0]?.message?.content ?? "";
    return content.trim() ? { model, content } : null;
  } catch (err) {
    console.error(`Fehler bei Modell ${model}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Das Parlament: das Primärmodell spricht zuerst, die anderen reagieren
// nacheinander und sehen dabei die Meinungen der Vorredner.
export async function routeParliament(
  userMessage: string,
  systemContext: string
): Promise<ParliamentResult> {
  const primary = choosePrimary(userMessage);

  let history: ChatMessage[] = [
    { role: "system", content: systemContext },
    { role: "user", content: userMessage },
  ];

  const calledModels: ModelId[] = [];
  const responses: ModelResponse[] = [];

  const primaryResponse = await callModel(primary, history);
  if (primaryResponse) {
    calledModels.push(primary);
    responses.push(primaryResponse);
    history = [...history, { role: "assistant", content: `[Analyse von ${primary}]: ${primaryResponse.content}` }];
  }

  for (const model of MODELS) {
    if (model === primary) continue;
    const response = await callModel(model, history);
    if (response) {
      calledModels.push(model);
      responses.push(response);
      history = [...history, { role: "assistant", content: `[Meinung von ${model}]: ${response.content}` }];
    }
  }

  return { primary, calledModels, responses };
}
