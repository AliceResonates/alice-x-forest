import axios from "axios";

export type ModelId = "deepseek" | "qwen" | "gemma";

const MODEL_MAP: Record<ModelId, string> = {
  deepseek: "deepseek/deepseek-chat",
  qwen:     "qwen/qwen-2.5-7b-instruct",
  gemma:    "google/gemma-2-9b-it",
};

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

export interface RouteResult {
  model: ModelId;
  content: string;
}

export async function routeWithContext(
  userMessage: string,
  systemContext: string
): Promise<RouteResult> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY nicht gesetzt");

  const model = choosePrimary(userMessage);

  const messages: ChatMessage[] = [
    { role: "system", content: systemContext },
    { role: "user",   content: userMessage },
  ];

  const { data } = await axios.post(
    OPENROUTER_URL,
    { model: MODEL_MAP[model], messages },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  const content: string = data.choices?.[0]?.message?.content ?? "";
  return { model, content };
}
